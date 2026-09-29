$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..\..')).Path
$zipRelative = 'docs/research/2026-09-28-local-figma-bridge-phase-8-0g3-evidence.zip'
$manifestRelative = 'docs/research/2026-09-28-local-figma-bridge-phase-8-0g3-evidence.sha256'
$files = @(
  'docs/roadmap/LOCAL_FIGMA_BRIDGE_DEVELOPMENT_BASELINE.md',
  'docs/roadmap/local-figma-bridge-status.json',
  'docs/research/2026-09-24-local-figma-bridge-phase-8-0-hardening.md',
  'docs/research/2026-09-28-local-figma-bridge-phase-8-0g3-security-negative-gate.md',
  '.research/local-figma-bridge-poc/README.md',
  '.research/local-figma-bridge-poc/package.json',
  '.research/local-figma-bridge-poc/package-lock.json',
  '.research/local-figma-bridge-poc/mcp/server.mjs',
  '.research/local-figma-bridge-poc/relay/bridge-server.mjs',
  '.research/local-figma-bridge-poc/relay/mutation-audit.mjs',
  '.research/local-figma-bridge-poc/relay/task-authorization-store.mjs',
  '.research/local-figma-bridge-poc/relay/protocol.mjs',
  '.research/local-figma-bridge-poc/plugin/manifest.json',
  '.research/local-figma-bridge-poc/plugin/code.js',
  '.research/local-figma-bridge-poc/plugin/ui.html',
  '.research/local-figma-bridge-poc/tests/protocol.test.mjs',
  '.research/local-figma-bridge-poc/tests/pairing-protocol.test.mjs',
  '.research/local-figma-bridge-poc/tests/task-authorization-protocol.test.mjs',
  '.research/local-figma-bridge-poc/tests/scope-guard.test.mjs',
  '.research/local-figma-bridge-poc/tests/ownership-guard.test.mjs',
  '.research/local-figma-bridge-poc/tests/hardening-security-gate-live.mjs',
  '.research/local-figma-bridge-poc/tests/package-phase8-0g3.ps1',
  '.research/local-figma-bridge-poc/logs/phase8-0g3-regression-2026-09-28.log',
  '.research/local-figma-bridge-poc/logs/phase8-0g3-security-live-2026-09-28T08-58-15.219Z.jsonl',
  '.research/local-figma-bridge-poc/logs/phase8-0g3-security-live-2026-09-28T09-00-03.663Z.jsonl',
  '.research/local-figma-bridge-poc/logs/phase8-0g3-security-live-2026-09-28T09-01-07.107Z.jsonl',
  '.research/local-figma-bridge-poc/logs/phase8-0g3-audit-2026-09-28T09-00-03.663Z.jsonl',
  '.research/local-figma-bridge-poc/logs/phase8-0g3-audit-2026-09-28T09-01-07.107Z.jsonl',
  '.research/local-figma-bridge-poc/logs/phase8-0g3-stderr-2026-09-28T08-58-15.219Z.log',
  '.research/local-figma-bridge-poc/logs/phase8-0g3-stderr-2026-09-28T09-00-03.663Z.log',
  '.research/local-figma-bridge-poc/logs/phase8-0g3-stderr-2026-09-28T09-01-07.107Z.log'
)

$resolved = foreach ($relative in $files) {
  $full = Join-Path $projectRoot $relative
  if (-not (Test-Path -LiteralPath $full -PathType Leaf)) { throw "Missing evidence file: $relative" }
  [pscustomobject]@{ Relative = $relative.Replace('\', '/'); Full = $full }
}
foreach ($item in $resolved | Where-Object { $_.Relative -match '/logs/' }) {
  $raw = [IO.File]::ReadAllText($item.Full)
  if ($raw -match '"(?:pairingSecret|secret|proof|token)"\s*:') {
    throw "Secret-like field found in evidence log: $($item.Relative)"
  }
  foreach ($match in [regex]::Matches($raw, '"code"\s*:\s*"([^"]*)"')) {
    if ($match.Groups[1].Value -notmatch '^(?:AUTH_|PAIRING_|SCOPE_|OWNERSHIP_)[A-Z_]+$') {
      throw "Unallowlisted code field in evidence log: $($item.Relative)"
    }
  }
}

$manifestFull = Join-Path $projectRoot $manifestRelative
$zipFull = Join-Path $projectRoot $zipRelative
if (Test-Path -LiteralPath $manifestFull) { throw "Manifest already exists: $manifestFull" }
if (Test-Path -LiteralPath $zipFull) { throw "ZIP already exists: $zipFull" }
$lines = foreach ($item in $resolved) {
  $hash = (Get-FileHash -LiteralPath $item.Full -Algorithm SHA256).Hash.ToLowerInvariant()
  "$hash  $($item.Relative)"
}
[IO.File]::WriteAllText($manifestFull, (($lines -join "`n") + "`n"), [Text.UTF8Encoding]::new($false))

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::Open($zipFull, [IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($item in $resolved) {
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $item.Full,
      $item.Relative, [IO.Compression.CompressionLevel]::Optimal) | Out-Null
  }
  [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $manifestFull,
    $manifestRelative.Replace('\', '/'), [IO.Compression.CompressionLevel]::Optimal) | Out-Null
} finally { $zip.Dispose() }

$check = [IO.Compression.ZipFile]::OpenRead($zipFull)
try {
  if ($check.Entries.Count -ne ($resolved.Count + 1)) { throw 'ZIP entry count mismatch' }
  foreach ($item in $resolved) {
    $entry = $check.GetEntry($item.Relative)
    if ($null -eq $entry) { throw "ZIP missing entry: $($item.Relative)" }
    $stream = $entry.Open()
    $memory = [IO.MemoryStream]::new()
    try { $stream.CopyTo($memory) } finally { $stream.Dispose() }
    $actual = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($memory.ToArray())).ToLowerInvariant()
    $memory.Dispose()
    $expected = (Get-FileHash -LiteralPath $item.Full -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actual -ne $expected) { throw "ZIP hash mismatch: $($item.Relative)" }
  }
} finally { $check.Dispose() }

$zipHash = (Get-FileHash -LiteralPath $zipFull -Algorithm SHA256).Hash.ToLowerInvariant()
"ZIP=$zipFull"
"ENTRIES=$($resolved.Count + 1)"
"SHA256=$zipHash"
