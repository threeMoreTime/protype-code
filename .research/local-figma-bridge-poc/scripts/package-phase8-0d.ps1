param(
  [string]$RepositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..\..')).Path
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
$repository = (Resolve-Path -LiteralPath $RepositoryRoot).Path
$poc = Join-Path $repository '.research\local-figma-bridge-poc'
$zipPath = Join-Path $repository 'docs\research\2026-09-28-local-figma-bridge-phase-8-0d-evidence.zip'

$relativeFiles = @(
  'docs/research/2026-09-28-local-figma-bridge-phase-8-0d-scope-guard.md'
  'docs/research/2026-09-24-local-figma-bridge-phase-8-0-hardening.md'
  'docs/roadmap/local-figma-bridge-status.json'
  '.research/local-figma-bridge-poc/README.md'
  '.research/local-figma-bridge-poc/relay/bridge-server.mjs'
  '.research/local-figma-bridge-poc/relay/protocol.mjs'
  '.research/local-figma-bridge-poc/relay/task-authorization-store.mjs'
  '.research/local-figma-bridge-poc/mcp/server.mjs'
  '.research/local-figma-bridge-poc/plugin/code.js'
  '.research/local-figma-bridge-poc/plugin/ui.html'
  '.research/local-figma-bridge-poc/tests/scope-guard.test.mjs'
  '.research/local-figma-bridge-poc/tests/scope-guard-live.mjs'
  '.research/local-figma-bridge-poc/tests/scope-cross-page-live.mjs'
  '.research/local-figma-bridge-poc/tests/scope-wrong-file-live.mjs'
  '.research/local-figma-bridge-poc/tests/scope-operation-rejection-live.mjs'
  '.research/local-figma-bridge-poc/tests/scope-outcome-check.mjs'
  '.research/local-figma-bridge-poc/tests/task-authorization-protocol.test.mjs'
  '.research/local-figma-bridge-poc/tests/task-authorization.test.mjs'
  '.research/local-figma-bridge-poc/tests/protocol.test.mjs'
  '.research/local-figma-bridge-poc/scripts/issue-test-authorization.mjs'
  '.research/local-figma-bridge-poc/scripts/package-phase8-0d.ps1'
)
$logDirectory = Join-Path $poc 'logs'
$relativeFiles += Get-ChildItem -LiteralPath $logDirectory -File -Filter 'phase8-0d-*' |
  ForEach-Object { ".research/local-figma-bridge-poc/logs/$($_.Name)" }
$relativeFiles = $relativeFiles | Sort-Object -Unique

$entries = foreach ($relative in $relativeFiles) {
  $absolute = Join-Path $repository ($relative.Replace('/', '\'))
  if (-not (Test-Path -LiteralPath $absolute -PathType Leaf)) { throw "Missing package file: $relative" }
  $resolved = (Resolve-Path -LiteralPath $absolute).Path
  if (-not $resolved.StartsWith($repository + '\', [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Package file escaped repository: $relative"
  }
  $bytes = [System.IO.File]::ReadAllBytes($resolved)
  $content = [System.Text.Encoding]::UTF8.GetString($bytes)
  if ($content -match '(?i)"(?:pairingSecret|secret|proof)"\s*:\s*"[^"\s]+"' -or
      $content -match '(?i)pairingSecret\s*[:=]\s*[A-Za-z0-9_-]{20,}') {
    throw "Potential credential found in: $relative"
  }
  [pscustomobject]@{ Relative = $relative; Absolute = $resolved;
    Hash = [Convert]::ToHexString([System.Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant() }
}

$manifest = ($entries | ForEach-Object { "$($_.Hash)  $($_.Relative)" }) -join "`n"
if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
$stream = [System.IO.File]::Open($zipPath, [System.IO.FileMode]::CreateNew)
try {
  $archive = [System.IO.Compression.ZipArchive]::new($stream, [System.IO.Compression.ZipArchiveMode]::Create, $true)
  try {
    foreach ($item in $entries) {
      $entry = $archive.CreateEntry($item.Relative, [System.IO.Compression.CompressionLevel]::Optimal)
      $input = [System.IO.File]::OpenRead($item.Absolute)
      try {
        $output = $entry.Open()
        try { $input.CopyTo($output) } finally { $output.Dispose() }
      } finally { $input.Dispose() }
    }
    $hashEntry = $archive.CreateEntry('SHA256SUMS.txt')
    $writer = [System.IO.StreamWriter]::new($hashEntry.Open(), [System.Text.UTF8Encoding]::new($false))
    try { $writer.Write($manifest + "`n") } finally { $writer.Dispose() }
  } finally { $archive.Dispose() }
} finally { $stream.Dispose() }

$verifyStream = [System.IO.File]::OpenRead($zipPath)
try {
  $verifyArchive = [System.IO.Compression.ZipArchive]::new($verifyStream, [System.IO.Compression.ZipArchiveMode]::Read)
  try {
    if ($verifyArchive.Entries.Count -ne $entries.Count + 1) { throw 'ZIP entry count mismatch' }
    foreach ($item in $entries) {
      $entry = $verifyArchive.GetEntry($item.Relative)
      if (-not $entry) { throw "ZIP missing $($item.Relative)" }
      $entryStream = $entry.Open()
      try {
        $memory = [System.IO.MemoryStream]::new()
        try {
          $entryStream.CopyTo($memory)
          $hash = [Convert]::ToHexString([System.Security.Cryptography.SHA256]::HashData($memory.ToArray())).ToLowerInvariant()
          if ($hash -ne $item.Hash) { throw "ZIP hash mismatch: $($item.Relative)" }
        } finally { $memory.Dispose() }
      } finally { $entryStream.Dispose() }
    }
  } finally { $verifyArchive.Dispose() }
} finally { $verifyStream.Dispose() }

Write-Output "ZIP=$zipPath"
Write-Output "FILES=$($entries.Count)"
Write-Output "SHA256=$((Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant())"
