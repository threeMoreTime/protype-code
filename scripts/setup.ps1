param([switch]$SkipInstall)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$bridgeRoot = Join-Path $projectRoot '.research/local-figma-bridge-poc'
$nodeCommand = Get-Command node -ErrorAction Stop
$npmCommand = Get-Command npm.cmd -ErrorAction Stop
Push-Location -LiteralPath $bridgeRoot
try {
  if (-not $SkipInstall) {
    & $npmCommand.Source ci --ignore-scripts
    if ($LASTEXITCODE -ne 0) { throw 'npm ci failed' }
  }
  & $npmCommand.Source run build:plugin
  if ($LASTEXITCODE -ne 0) { throw 'Plugin build failed' }
  & $nodeCommand.Source scripts/workflow.mjs doctor
  if ($LASTEXITCODE -ne 0) { throw 'Doctor failed' }
} finally { Pop-Location }
