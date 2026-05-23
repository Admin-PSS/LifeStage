# ?? One-Click Azure Deployment for LifeStageAPI
# This script will configure and deploy your app to Azure
# Usage: .\one-click-deploy.ps1 -ResourceGroup "your-rg" -AppName "your-app" -SqlServer "your-sql-server" -SqlPassword "your-password"

param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroup,
    
    [Parameter(Mandatory=$true)]
    [string]$AppName,
    
    [Parameter(Mandatory=$true)]
    [string]$SqlServer,
    
    [Parameter(Mandatory=$true)]
    [string]$SqlPassword,
    
    [Parameter(Mandatory=$false)]
    [string]$SqlUsername = "dbadmin",
    
    [Parameter(Mandatory=$false)]
    [string]$SqlDatabase = "LifeStageDB"
)

$ErrorActionPreference = "Stop"

Write-Host @"
??????????????????????????????????????????????????????????????
?    ?
?         ?? LifeStageAPI - Azure Deployment  ?
?          ?
??????????????????????????????????????????????????????????????
"@ -ForegroundColor Cyan

Write-Host ""
Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Resource Group: $ResourceGroup" -ForegroundColor Gray
Write-Host "  App Name: $AppName" -ForegroundColor Gray
Write-Host "  SQL Server: $SqlServer" -ForegroundColor Gray
Write-Host "  Database: $SqlDatabase" -ForegroundColor Gray
Write-Host ""

# Step 1: Generate JWT Secret
Write-Host "[1/6] Generating JWT Secret..." -ForegroundColor Cyan
$jwtSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
Write-Host "? JWT Secret generated" -ForegroundColor Green

# Step 2: Build connection string
Write-Host "[2/6] Building connection string..." -ForegroundColor Cyan
# Strip any existing "Server=tcp:" prefix and ".database.windows.net" suffix so the param can be just the server name
$sqlServerName = $SqlServer -replace '^Server=tcp:', '' -replace '\.database\.windows\.net(,\d+)?$', ''
$connectionString = "Server=tcp:$sqlServerName.database.windows.net,1433;Database=$SqlDatabase;User ID=$SqlUsername;Password=$SqlPassword;Encrypt=true;TrustServerCertificate=False;Connection Timeout=30;"
Write-Host "      ? Connection string ready" -ForegroundColor Green

# Step 3: Configure App Settings
Write-Host "[3/6] Configuring app settings..." -ForegroundColor Cyan
az webapp config appsettings set `
    --resource-group $ResourceGroup `
    --name $AppName `
    --settings `
    "ConnectionStrings__DefaultConnection=$connectionString" `
    "Jwt__Secret=$jwtSecret" `
    "Jwt__Issuer=LifeStageAPI" `
    "Jwt__Audience=LifeStageApp" `
    "Jwt__ExpiryMinutes=60" `
    "ASPNETCORE_ENVIRONMENT=Production" `
    "WEBSITE_TIME_ZONE=Eastern Standard Time" `
    "App__FrontendUrl=https://$AppName.azurewebsites.net" `
    "App__BaseUrl=https://$AppName.azurewebsites.net" `
    --only-show-errors

if ($LASTEXITCODE -eq 0) {
    Write-Host "      ? App settings configured" -ForegroundColor Green
} else {
    Write-Host "      ? Failed to configure settings" -ForegroundColor Red
    exit 1
}

# Step 4: Build the application
Write-Host "[4/6] Building application..." -ForegroundColor Cyan
Push-Location "src\LifeStageAPI"
dotnet clean --nologo --verbosity quiet
dotnet build --configuration Release --nologo --verbosity quiet
if ($LASTEXITCODE -eq 0) {
  Write-Host "      ? Build successful" -ForegroundColor Green
} else {
    Write-Host "      ? Build failed" -ForegroundColor Red
    Pop-Location
    exit 1
}

# Step 5: Publish the application
Write-Host "[5/6] Publishing application..." -ForegroundColor Cyan
dotnet publish --configuration Release --output ".\bin\Release\publish" --nologo --verbosity quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host "      ? Publish successful" -ForegroundColor Green
} else {
    Write-Host "      ? Publish failed" -ForegroundColor Red
Pop-Location
    exit 1
}

# Create deployment package
$publishPath = ".\bin\Release\publish"
$zipPath = ".\bin\Release\deploy.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath }
Compress-Archive -Path "$publishPath\*" -DestinationPath $zipPath

# Step 6: Deploy to Azure
Write-Host "[6/6] Deploying to Azure..." -ForegroundColor Cyan
az webapp deployment source config-zip `
    --resource-group $ResourceGroup `
    --name $AppName `
    --src $zipPath `
    --only-show-errors

Pop-Location

if ($LASTEXITCODE -eq 0) {
    Write-Host "      ? Deployment successful" -ForegroundColor Green
} else {
    Write-Host "      ? Deployment failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host @"
??????????????????????????????????????????????????????????????
?           ?
?    ? Deployment Complete!  ?
?        ?
??????????????????????????????????????????????????????????????
"@ -ForegroundColor Green

Write-Host ""
Write-Host "?? Important Information:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  JWT Secret (save this!):" -ForegroundColor Cyan
Write-Host "  $jwtSecret" -ForegroundColor White
Write-Host ""
Write-Host "  API URL:" -ForegroundColor Cyan
Write-Host "  https://$AppName.azurewebsites.net" -ForegroundColor White
Write-Host ""
Write-Host "  Swagger UI:" -ForegroundColor Cyan
Write-Host "  https://$AppName.azurewebsites.net/swagger" -ForegroundColor White
Write-Host ""

# Wait for app to start
Write-Host "Waiting 15 seconds for app to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Test the deployment
Write-Host "Testing deployment..." -ForegroundColor Cyan
$url = "https://$AppName.azurewebsites.net/swagger"
try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 20 -ErrorAction Stop
    Write-Host "? App is running! (Status: $($response.StatusCode))" -ForegroundColor Green
    Write-Host ""
    Write-Host "?? Success! Your API is live at:" -ForegroundColor Green
    Write-Host "   $url" -ForegroundColor Cyan
} catch {
    Write-Host "??  App may still be starting..." -ForegroundColor Yellow
    Write-Host "   Check logs: az webapp log tail --resource-group $ResourceGroup --name $AppName" -ForegroundColor Gray
    Write-Host "   Or visit: $url" -ForegroundColor Gray
}

Write-Host ""
Write-Host "?? Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Test API: curl https://$AppName.azurewebsites.net/api/trending/hashtags" -ForegroundColor Gray
Write-Host "  2. Configure OAuth providers (optional)" -ForegroundColor Gray
Write-Host "  3. Set up Azure Storage for file uploads (optional)" -ForegroundColor Gray
Write-Host "  4. Enable Application Insights for monitoring" -ForegroundColor Gray
Write-Host ""
Write-Host "?? View logs:" -ForegroundColor Yellow
Write-Host "  az webapp log tail --resource-group $ResourceGroup --name $AppName" -ForegroundColor Gray
Write-Host ""
