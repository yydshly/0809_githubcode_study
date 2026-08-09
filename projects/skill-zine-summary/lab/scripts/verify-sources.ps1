[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$labDir = Split-Path -Parent $scriptDir
$manifestPath = Join-Path $labDir 'SOURCES.lock.json'
$sourcesDir = Join-Path $labDir 'sources'
$manifest = Get-Content -Raw -Encoding utf8 -LiteralPath $manifestPath | ConvertFrom-Json
$failures = [System.Collections.Generic.List[string]]::new()
$verified = 0

foreach ($source in $manifest.sources) {
    $target = Join-Path $sourcesDir $source.slug
    if (-not (Test-Path -LiteralPath (Join-Path $target '.git'))) {
        $failures.Add("$($source.slug): checkout missing")
        continue
    }

    $origin = (@(& git -C $target remote get-url origin) -join "`n").Trim()
    $head = (@(& git -C $target rev-parse HEAD) -join "`n").Trim()
    $branch = (@(& git -C $target branch --show-current) -join "`n").Trim()
    $dirty = (& git -C $target status --porcelain)

    if ($origin -ne $source.url) {
        $failures.Add("$($source.slug): origin mismatch")
    }
    if ($head -ne $source.researchCommit) {
        $failures.Add("$($source.slug): HEAD $head != $($source.researchCommit)")
    }
    if ($branch) {
        $failures.Add("$($source.slug): expected detached HEAD, found branch $branch")
    }
    if ($dirty) {
        $failures.Add("$($source.slug): worktree is dirty")
    }

    if ($origin -eq $source.url -and $head -eq $source.researchCommit -and -not $branch -and -not $dirty) {
        $verified++
        Write-Host "PASS $($source.slug) $head"
    }
}

if ($failures.Count -gt 0) {
    $failures | ForEach-Object { Write-Error $_ }
    exit 1
}

Write-Host "SOURCES_VERIFIED=$verified/$($manifest.sources.Count)"
