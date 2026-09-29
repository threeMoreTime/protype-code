param(
  [string]$ArchiveFileName = 'local-codex-figma-bridge-phase-8-0-a-2026-09-24.zip'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$workspaceRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$pocRoot = Join-Path $PSScriptRoot 'local-figma-bridge-poc'
$nodeModulesRoot = [System.IO.Path]::GetFullPath((Join-Path $pocRoot 'node_modules')) + [System.IO.Path]::DirectorySeparatorChar
$logsRoot = [System.IO.Path]::GetFullPath((Join-Path $pocRoot 'logs')) + [System.IO.Path]::DirectorySeparatorChar
$archivePath = Join-Path $PSScriptRoot $ArchiveFileName

if (Test-Path -LiteralPath $archivePath) {
  throw "Archive already exists; refusing to overwrite: $archivePath"
}

$required = @(
  (Join-Path $workspaceRoot 'CURRENT_WORKFLOW_AUDIT.md'),
  (Join-Path $workspaceRoot 'docs/research/2026-09-23-local-codex-figma-bridge-feasibility.md'),
  (Join-Path $workspaceRoot 'docs/research/2026-09-23-local-codex-figma-bridge-local-validation.md'),
  (Join-Path $workspaceRoot 'docs/research/2026-09-24-local-codex-figma-bridge-write-validation.md'),
  (Join-Path $workspaceRoot 'docs/research/2026-09-24-local-figma-bridge-phase-8-0-hardening.md'),
  (Join-Path $workspaceRoot 'docs/roadmap/LOCAL_FIGMA_BRIDGE_DEVELOPMENT_BASELINE.md'),
  (Join-Path $workspaceRoot 'docs/roadmap/local-figma-bridge-status.json'),
  $PSCommandPath
)
$pocFiles = @(Get-ChildItem -LiteralPath $pocRoot -Recurse -File | Where-Object {
  -not $_.FullName.StartsWith($nodeModulesRoot, [System.StringComparison]::OrdinalIgnoreCase) -and
  -not $_.FullName.StartsWith($logsRoot, [System.StringComparison]::OrdinalIgnoreCase) -and
  $_.Name -notmatch '(?i)-before-[^/]*\.(png|jpe?g)$'
} | Select-Object -ExpandProperty FullName)
$sourceFiles = @($required + $pocFiles | Sort-Object -Unique)

$items = foreach ($file in $sourceFiles) {
  if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw "Required file missing: $file" }
  $fullPath = [System.IO.Path]::GetFullPath($file)
  $relative = [System.IO.Path]::GetRelativePath($workspaceRoot, $fullPath).Replace('\', '/')
  if ($relative.StartsWith('..') -or [System.IO.Path]::IsPathRooted($relative)) {
    throw "File escaped workspace: $fullPath"
  }
  [pscustomobject]@{
    FullPath = $fullPath
    EntryName = $relative
    Hash = (Get-FileHash -LiteralPath $fullPath -Algorithm SHA256).Hash.ToLowerInvariant()
  }
}

$archive = [System.IO.Compression.ZipFile]::Open($archivePath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($item in $items) {
    $entry = $archive.CreateEntry($item.EntryName, [System.IO.Compression.CompressionLevel]::Optimal)
    $source = [System.IO.File]::OpenRead($item.FullPath)
    $target = $entry.Open()
    try { $source.CopyTo($target) }
    finally { $target.Dispose(); $source.Dispose() }
  }
  $manifestEntry = $archive.CreateEntry('PACKAGE_MANIFEST.sha256')
  $writer = [System.IO.StreamWriter]::new($manifestEntry.Open(), [System.Text.UTF8Encoding]::new($false))
  try {
    $writer.WriteLine('# Source file SHA-256 hashes; paths are relative to the protype-code workspace root.')
    $writer.WriteLine('# Includes the Phase 8.0-A report, prior validation reports, status, and isolated POC evidence.')
    foreach ($item in $items) { $writer.WriteLine("$($item.Hash)  $($item.EntryName)") }
  }
  finally { $writer.Dispose() }
}
finally { $archive.Dispose() }

$zip = [System.IO.Compression.ZipFile]::OpenRead($archivePath)
try {
  foreach ($item in $items) {
    $entry = $zip.GetEntry($item.EntryName)
    if ($null -eq $entry) { throw "Missing ZIP entry: $($item.EntryName)" }
    $stream = $entry.Open()
    $hasher = [System.Security.Cryptography.SHA256]::Create()
    try { $actual = [System.BitConverter]::ToString($hasher.ComputeHash($stream)).Replace('-', '').ToLowerInvariant() }
    finally { $hasher.Dispose(); $stream.Dispose() }
    if ($actual -ne $item.Hash) { throw "ZIP hash mismatch: $($item.EntryName)" }
  }
  if ($zip.Entries.Count -ne $items.Count + 1) { throw 'ZIP contains unexpected or missing entries.' }
  if ($null -eq $zip.GetEntry('PACKAGE_MANIFEST.sha256')) { throw 'ZIP hash manifest missing.' }
  if ($zip.Entries.FullName -match '(^|/)node_modules/') { throw 'ZIP unexpectedly contains node_modules.' }
}
finally { $zip.Dispose() }

$result = Get-Item -LiteralPath $archivePath
[pscustomobject]@{
  Archive = $result.FullName
  Files = $items.Count
  Bytes = $result.Length
  Sha256 = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
  Verified = $true
} | ConvertTo-Json -Compress
