# Update SCM_URL to your Azure App Service SCM endpoint
$SCM_URL = "https://YOUR_API_APP.scm.azurewebsites.net"
$zipPath = "$PSScriptRoot\LifeStageAPI\src\LifeStageAPI\deploy-backend.zip"

$token = az account get-access-token --resource "https://management.azure.com" --query accessToken -o tsv
curl.exe -s -X POST "$SCM_URL/api/zipdeploy" `
  -H "Authorization: Bearer $token" `
  --data-binary "@$zipPath" `
  -H "Content-Type: application/zip"
Write-Host "Done"
