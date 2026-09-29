param(
  [string]$RepositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..\..')).Path,
  [string]$OutputName = '2026-09-28-local-figma-bridge-phase-8-0f-evidence.zip'
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
$repository = (Resolve-Path -LiteralPath $RepositoryRoot).Path
if ($OutputName -notmatch '^[a-zA-Z0-9._-]+\.zip$' -or [IO.Path]::GetFileName($OutputName) -ne $OutputName) {
  throw 'OutputName must be a ZIP filename without path separators'
}
$zipPath = Join-Path (Join-Path $repository 'docs\research') $OutputName
$files = @(
  'docs/research/2026-09-28-local-figma-bridge-phase-8-0f-mutation-audit.md'
  'docs/research/2026-09-24-local-figma-bridge-phase-8-0-hardening.md'
  'docs/roadmap/local-figma-bridge-status.json'
  '.research/local-figma-bridge-poc/README.md'
  '.research/local-figma-bridge-poc/relay/mutation-audit.mjs'
  '.research/local-figma-bridge-poc/relay/bridge-server.mjs'
  '.research/local-figma-bridge-poc/relay/protocol.mjs'
  '.research/local-figma-bridge-poc/relay/task-authorization-store.mjs'
  '.research/local-figma-bridge-poc/mcp/server.mjs'
  '.research/local-figma-bridge-poc/plugin/code.js'
  '.research/local-figma-bridge-poc/plugin/manifest.json'
  '.research/local-figma-bridge-poc/tests/mutation-audit.test.mjs'
  '.research/local-figma-bridge-poc/tests/mutation-audit-live.mjs'
  '.research/local-figma-bridge-poc/tests/mutation-audit-timeout-live.mjs'
  '.research/local-figma-bridge-poc/tests/cleanup-phase8-0f-orphan.mjs'
  '.research/local-figma-bridge-poc/tests/task-authorization-protocol.test.mjs'
  '.research/local-figma-bridge-poc/tests/protocol.test.mjs'
  '.research/local-figma-bridge-poc/tests/ownership-guard.test.mjs'
  '.research/local-figma-bridge-poc/tests/plugin-main-message.test.mjs'
  '.research/local-figma-bridge-poc/scripts/package-phase8-0f.ps1'
)
$logDir = Join-Path $repository '.research\local-figma-bridge-poc\logs'
$files += Get-ChildItem -LiteralPath $logDir -File -Filter 'phase8-0f-*' |
  ForEach-Object { ".research/local-figma-bridge-poc/logs/$($_.Name)" }
$files = $files | Sort-Object -Unique

$entries = foreach ($relative in $files) {
  $absolute = Join-Path $repository ($relative.Replace('/', '\'))
  if (-not (Test-Path -LiteralPath $absolute -PathType Leaf)) { throw "Missing package file: $relative" }
  $resolved = (Resolve-Path -LiteralPath $absolute).Path
  if (-not $resolved.StartsWith($repository + '\', [StringComparison]::OrdinalIgnoreCase)) {
    throw "Package file escaped repository: $relative"
  }
  $bytes = [IO.File]::ReadAllBytes($resolved)
  $content = [Text.Encoding]::UTF8.GetString($bytes)
  if ($content -match '(?i)"(?:pairingSecret|secret|proof)"\s*:\s*"[^"\s]+"' -or
      $content -match '(?i)pairingSecret\s*[:=]\s*[A-Za-z0-9_-]{20,}') {
    throw "Potential credential found in: $relative"
  }
  [pscustomobject]@{ Relative = $relative; Absolute = $resolved;
    Hash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant() }
}
if (Test-Path -LiteralPath $zipPath) { throw "Refusing to replace existing ZIP: $zipPath" }
$stream = [IO.File]::Open($zipPath, [IO.FileMode]::CreateNew)
try {
  $archive = [IO.Compression.ZipArchive]::new($stream, [IO.Compression.ZipArchiveMode]::Create, $true)
  try {
    foreach ($item in $entries) {
      $entry = $archive.CreateEntry($item.Relative, [IO.Compression.CompressionLevel]::Optimal)
      $input = [IO.File]::OpenRead($item.Absolute)
      try {
        $output = $entry.Open()
        try { $input.CopyTo($output) } finally { $output.Dispose() }
      } finally { $input.Dispose() }
    }
    $manifest = ($entries | ForEach-Object { "$($_.Hash)  $($_.Relative)" }) -join "`n"
    $hashEntry = $archive.CreateEntry('SHA256SUMS.txt')
    $writer = [IO.StreamWriter]::new($hashEntry.Open(), [Text.UTF8Encoding]::new($false))
    try { $writer.Write($manifest + "`n") } finally { $writer.Dispose() }
  } finally { $archive.Dispose() }
} finally { $stream.Dispose() }

$checkStream = [IO.File]::OpenRead($zipPath)
try {
  $checkArchive = [IO.Compression.ZipArchive]::new($checkStream, [IO.Compression.ZipArchiveMode]::Read)
  try {
    if ($checkArchive.Entries.Count -ne $entries.Count + 1) { throw 'ZIP entry count mismatch' }
    foreach ($item in $entries) {
      $entry = $checkArchive.GetEntry($item.Relative)
      if (-not $entry) { throw "ZIP missing $($item.Relative)" }
      $input = $entry.Open()
      try {
        $memory = [IO.MemoryStream]::new()
        try {
          $input.CopyTo($memory)
          $hash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($memory.ToArray())).ToLowerInvariant()
          if ($hash -ne $item.Hash) { throw "ZIP hash mismatch: $($item.Relative)" }
        } finally { $memory.Dispose() }
      } finally { $input.Dispose() }
    }
  } finally { $checkArchive.Dispose() }
} finally { $checkStream.Dispose() }

Write-Output "ZIP=$zipPath"
Write-Output "FILES=$($entries.Count)"
Write-Output "SHA256=$((Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant())"
