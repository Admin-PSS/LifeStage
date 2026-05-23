$publishDir = "$PSScriptRoot\LifeStageAPI\src\LifeStageAPI\publish"
$zipPath    = "$PSScriptRoot\LifeStageAPI\src\LifeStageAPI\deploy-backend.zip"

Set-Location "$PSScriptRoot\LifeStageAPI\src\LifeStageAPI"
dotnet publish -c Release -o $publishDir
Compress-Archive -Path "$publishDir\*" -DestinationPath $zipPath -Force
Write-Host "Build and zip done: deploy-backend.zip"
