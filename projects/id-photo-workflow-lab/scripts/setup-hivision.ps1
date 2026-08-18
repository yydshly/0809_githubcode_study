$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$upstreamPath = Join-Path $projectRoot 'vendor\HivisionIDPhotos'
$venvPython = Join-Path $projectRoot '.venv\Scripts\python.exe'
$expectedCommit = '5c191e2577f14755a69d9df6db415fab23aca484'
$modelPath = Join-Path $upstreamPath 'hivision\creator\weights\modnet_photographic_portrait_matting.onnx'
$expectedModelSha256 = '07c308cf0fc7e6e8b2065a12ed7fc07e1de8febb7dc7839d7b7f15dd66584df9'

if (-not (Test-Path -LiteralPath $upstreamPath)) {
    git clone --depth 1 --branch master https://github.com/Zeyi-Lin/HivisionIDPhotos.git $upstreamPath
}

$safePath = $upstreamPath.Replace('\', '/')
$actualCommit = git -c "safe.directory=$safePath" -C $upstreamPath rev-parse HEAD
if ($actualCommit.Trim() -ne $expectedCommit) {
    throw "Unexpected Hivision commit: $actualCommit (expected $expectedCommit)"
}

if (-not (Test-Path -LiteralPath $venvPython)) {
    python -m venv (Join-Path $projectRoot '.venv')
}

& $venvPython -m pip install -r (Join-Path $upstreamPath 'requirements.txt') -r (Join-Path $upstreamPath 'requirements-app.txt')

if (-not (Test-Path -LiteralPath $modelPath)) {
    & $venvPython (Join-Path $upstreamPath 'scripts\download_model.py') --models modnet_photographic_portrait_matting
}

$actualModelSha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $modelPath).Hash.ToLowerInvariant()
if ($actualModelSha256 -ne $expectedModelSha256) {
    throw "Unexpected MODNet SHA-256: $actualModelSha256"
}

Write-Host "Hivision runtime ready at $expectedCommit"
Write-Host "MODNet SHA-256: $actualModelSha256"
