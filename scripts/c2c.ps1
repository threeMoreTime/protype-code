[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidateSet('start', 'status', 'stop', 'pair', 'unpair', 'workspace', 'tunnel')]
    [string]$Command,
    [Parameter(ValueFromRemainingArguments)]
    [string[]]$Arguments
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true

$taskRoot = Split-Path -Parent $PSScriptRoot
$shareRoot = Join-Path $taskRoot 'evidence-share'
$entry = Join-Path $taskRoot '.tools/codex-with-chatgpt/bin/c2c.js'
if (-not (Test-Path -LiteralPath $entry -PathType Leaf)) {
    throw 'Bridge checkout is missing.'
}
if ($Arguments -match '^(--workspace(?:=|$)|-w$)') {
    throw 'Workspace override is prohibited; only evidence-share may be served.'
}

# These settings affect this process and its children only, never the global PATH.
# The state directory is outside the shared directory and ignored by Git.
$environment = @{
    C2C_STATE_DIR = Join-Path $taskRoot '.local/c2c-state'
    C2C_CLOUDFLARED_PATH = Join-Path $taskRoot '.tools/cloudflared/cloudflared.exe'
    GIT_CEILING_DIRECTORIES = $taskRoot
    GIT_OPTIONAL_LOCKS = '0'
}
$previous = @{}
try {
    foreach ($key in $environment.Keys) {
        $previous[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
        [Environment]::SetEnvironmentVariable($key, $environment[$key], 'Process')
    }
    $node = (Get-Command node -ErrorAction Stop).Source
    # stop/unpair do not expose --json in upstream 0.1.3.
    $outputArguments = @()
    if ($Command -notin @('stop', 'unpair')) {
        $outputArguments = @('--json')
    }
    & $node $entry $Command @Arguments -w $shareRoot @outputArguments
} finally {
    foreach ($key in $previous.Keys) {
        [Environment]::SetEnvironmentVariable($key, $previous[$key], 'Process')
    }
}
