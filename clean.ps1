$apiBase      = "$PSScriptRoot\LifeStageAPI\src\LifeStageAPI"
$frontendBase = "$PSScriptRoot\lifestage-frontend"

Get-ChildItem -Path $apiBase -Directory -Filter "publish*" | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path $apiBase -Filter "*.zip" -Recurse | Remove-Item -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path $frontendBase -Filter "*.zip" | Remove-Item -Force -ErrorAction SilentlyContinue

Write-Host "Cleaned."
