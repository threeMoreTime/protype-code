Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$workspaceRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$pocRoot = Join-Path $PSScriptRoot 'local-figma-bridge-poc'
$archivePath = Join-Path $PSScriptRoot 'local-codex-figma-bridge-write-validation-2026-09-24.zip'
if (Test-Path -LiteralPath $archivePath) {
  throw "Archive already exists; refusing to overwrite: $archivePath"
}

$required = @(
  (Join-Path $workspaceRoot 'CURRENT_WORKFLOW_AUDIT.md'),
  (Join-Path $workspaceRoot 'docs/research/2026-09-23-local-codex-figma-bridge-feasibility.md'),
  (Join-Path $workspaceRoot 'docs/research/2026-09-23-local-codex-figma-bridge-local-validation.md'),
  (Join-Path $workspaceRoot 'docs/research/2026-09-24-local-codex-figma-bridge-write-validation.md'),
  (Join-Path $pocRoot 'README.md'),
  (Join-Path $pocRoot 'package.json'),
  (Join-Path $pocRoot 'package-lock.json'),
  $PSCommandPath
)
$pocFiles = foreach ($directory in @('mcp', 'relay', 'plugin', 'tests', 'docs', 'artifacts')) {
  $dirPath = Join-Path $pocRoot $directory
  if (Test-Path -LiteralPath $dirPath -PathType Container) {
    Get-ChildItem -LiteralPath $dirPath -Recurse -File |
      Where-Object { $_.Name -notmatch '(?i)-before-[^/]*\.(png|jpe?g)$' } |
      Select-Object -ExpandProperty FullName
  }
}
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
