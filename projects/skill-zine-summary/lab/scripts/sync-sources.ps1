[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$labDir = Split-Path -Parent $scriptDir
$manifestPath = Join-Path $labDir 'SOURCES.lock.json'
$sourcesDir = Join-Path $labDir 'sources'
$manifest = Get-Content -Raw -Encoding utf8 -LiteralPath $manifestPath | ConvertFrom-Json

New-Item -ItemType Directory -Path $sourcesDir -Force | Out-Null

function Invoke-Git {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    & git @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "git command failed: git $($Arguments -join ' ')"
    }
}

foreach ($source in $manifest.sources) {
    $target = Join-Path $sourcesDir $source.slug
    Write-Host "[$($source.slug)] target $target"

    if (-not (Test-Path -LiteralPath $target)) {
        Invoke-Git -Arguments @('clone', '--filter=blob:none', $source.url, $target)
    }

    $gitDir = Join-Path $target '.git'
    if (-not (Test-Path -LiteralPath $gitDir)) {
        throw "Target exists but is not a Git checkout: $target"
    }

    $origin = (& git -C $target remote get-url origin).Trim()
    if ($LASTEXITCODE -ne 0 -or $origin -ne $source.url) {
        throw "Origin mismatch for $($source.slug). Expected $($source.url), found $origin"
    }

    $worktreeEntries = @(Get-ChildItem -LiteralPath $target -Force | Where-Object { $_.Name -ne '.git' })
    $isInitialEmptyCheckout = $worktreeEntries.Count -eq 0
    $dirty = (& git -C $target status --porcelain)
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to inspect worktree: $target"
    }
    if ($dirty -and -not $isInitialEmptyCheckout) {
        throw "Refusing to change a dirty upstream checkout: $target"
    }

    Invoke-Git -Arguments @('-C', $target, 'fetch', '--depth', '1', 'origin', $source.researchCommit)
    if ($isInitialEmptyCheckout) {
        Invoke-Git -Arguments @('-C', $target, 'checkout', '--force', '--detach', $source.researchCommit)
    }
    else {
        Invoke-Git -Arguments @('-C', $target, 'checkout', '--detach', $source.researchCommit)
    }

    $actual = (& git -C $target rev-parse HEAD).Trim()
    if ($LASTEXITCODE -ne 0 -or $actual -ne $source.researchCommit) {
        throw "Commit mismatch for $($source.slug). Expected $($source.researchCommit), found $actual"
    }

    Write-Host "[$($source.slug)] ready at $actual"
}

Write-Host "SOURCES_READY=$($manifest.sources.Count)"
