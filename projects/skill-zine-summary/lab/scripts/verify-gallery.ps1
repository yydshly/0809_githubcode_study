[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$labDir = Split-Path -Parent $scriptDir
$manifestPath = Join-Path $labDir 'SOURCES.lock.json'
$galleryPath = Join-Path $labDir 'ORIGINAL-SAMPLES.md'
$sourcesDir = Join-Path $labDir 'sources'
$manifest = Get-Content -Raw -Encoding utf8 -LiteralPath $manifestPath | ConvertFrom-Json
$gallery = Get-Content -Raw -Encoding utf8 -LiteralPath $galleryPath
$pattern = 'https://raw\.githubusercontent\.com/(?<owner>[^/]+)/(?<repo>[^/]+)/(?<commit>[0-9a-f]{40})/(?<path>[^"''\s>]+)'
$matches = [regex]::Matches($gallery, $pattern)
$failures = [System.Collections.Generic.List[string]]::new()
$represented = [System.Collections.Generic.HashSet[string]]::new()
$localAssets = 0
$catalogLinks = 0

foreach ($match in $matches) {
    $repository = "$($match.Groups['owner'].Value)/$($match.Groups['repo'].Value)"
    $commit = $match.Groups['commit'].Value
    $relativePath = [uri]::UnescapeDataString($match.Groups['path'].Value)

    if ($repository -eq $manifest.catalog.repository) {
        if ($commit -ne $manifest.catalog.commit) {
            $failures.Add("Catalog commit mismatch: $commit")
        }
        $catalogLinks++
        continue
    }

    $source = @($manifest.sources | Where-Object { $_.repository -eq $repository })
    if ($source.Count -ne 1) {
        $failures.Add("Unknown or duplicate repository in gallery: $repository")
        continue
    }

    [void]$represented.Add($repository)
    if ($commit -ne $source[0].researchCommit) {
        $failures.Add("$repository uses $commit instead of $($source[0].researchCommit)")
    }

    $assetPath = Join-Path (Join-Path $sourcesDir $source[0].slug) $relativePath
    if (-not (Test-Path -LiteralPath $assetPath)) {
        $failures.Add("Missing local sample: $repository/$relativePath")
    }
    else {
        $localAssets++
    }
}

foreach ($source in $manifest.sources) {
    if (-not $represented.Contains($source.repository) -and $source.repository -ne 'luji12/daily-photo-playground') {
        $failures.Add("No gallery sample for $($source.repository)")
    }
}

if ($catalogLinks -gt 0) {
    [void]$represented.Add('luji12/daily-photo-playground')
}

if ($represented.Count -ne $manifest.sources.Count) {
    $failures.Add("Gallery represents $($represented.Count)/$($manifest.sources.Count) target repositories")
}

if ($failures.Count -gt 0) {
    $failures | ForEach-Object { Write-Error $_ }
    exit 1
}

Write-Host "GALLERY_REPOSITORIES=$($represented.Count)/$($manifest.sources.Count)"
Write-Host "GALLERY_LOCAL_ASSETS=$localAssets"
Write-Host "GALLERY_CATALOG_REMOTE_LINKS=$catalogLinks"
Write-Host "GALLERY_LINKS=$($matches.Count)"
