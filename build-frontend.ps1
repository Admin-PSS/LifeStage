Set-Location "$PSScriptRoot\lifestage-frontend"
npm run build

$sourceDir = "$PSScriptRoot\lifestage-frontend"
$zipPath   = "$sourceDir\frontend-prebuilt.zip"

if (Test-Path $zipPath) { Remove-Item $zipPath }

Add-Type -Assembly System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($zipPath, 'Create')

Get-ChildItem "$sourceDir\dist" -Recurse -File | ForEach-Object {
    $entry = $_.FullName.Substring("$sourceDir\".Length).Replace('\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $entry) | Out-Null
}

[System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, "$sourceDir\server.cjs", "server.cjs") | Out-Null

$zip.Dispose()
Write-Host "Build and zip done: frontend-prebuilt.zip"
