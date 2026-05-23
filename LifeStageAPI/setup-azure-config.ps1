# Quick Azure Configuration Script
# Sets up minimum required settings for LifeStageAPI
# Usage: .\setup-azure-config.ps1 -ResourceGroup "your-rg" -AppName "your-app-name" -SqlConnectionString "your-connection-string"

param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroup,
    
    [Parameter(Mandatory=$true)]
    [string]$AppName,
    
  [Parameter(Mandatory=$true)]
    [string]$SqlConnectionString
)

Write-Host "=== Setting up Azure App Service Configuration ===" -ForegroundColor Cyan
Write-Host ""

# Generate JWT Secret
Write-Host "Generating secure JWT secret..." -ForegroundColor Yellow
$jwtSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
Write-Host "? JWT Secret generated" -ForegroundColor Green
Write-Host ""

# Set app settings
Write-Host "Configuring app settings..." -ForegroundColor Yellow

$settings = @(
    "ConnectionStrings__DefaultConnection=$SqlConnectionString",
    "Jwt__Secret=$jwtSecret",
    "Jwt__Issuer=LifeStageAPI",
    "Jwt__Audience=LifeStageApp",
    "Jwt__ExpiryMinutes=60",
    "ASPNETCORE_ENVIRONMENT=Production",
    "WEBSITE_TIME_ZONE=Eastern Standard Time"
)

az webapp config appsettings set `
    --resource-group $ResourceGroup `
    --name $AppName `
    --settings @settings

if ($LASTEXITCODE -eq 0) {
    Write-Host "? Configuration complete!" -ForegroundColor Green
} else {
    Write-Host "? Configuration failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Configuration Summary ===" -ForegroundColor Cyan
Write-Host "App Name: $AppName" -ForegroundColor Yellow
Write-Host "Resource Group: $ResourceGroup" -ForegroundColor Yellow
Write-Host "JWT Secret: $jwtSecret" -ForegroundColor Yellow
Write-Host ""
Write-Host "??  IMPORTANT: Save the JWT Secret above!" -ForegroundColor Red
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Restart your app: az webapp restart --resource-group $ResourceGroup --name $AppName" -ForegroundColor Gray
Write-Host "2. Check logs: az webapp log tail --resource-group $ResourceGroup --name $AppName" -ForegroundColor Gray
Write-Host "3. Test API: https://$AppName.azurewebsites.net/swagger" -ForegroundColor Gray
Write-Host ""

# Offer to restart
$restart = Read-Host "Restart app now? (y/n)"
if ($restart -eq 'y') {
    Write-Host "Restarting app..." -ForegroundColor Yellow
    az webapp restart --resource-group $ResourceGroup --name $AppName
    Write-Host "? App restarted" -ForegroundColor Green
    Write-Host ""
    Write-Host "Waiting 10 seconds for app to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    
    Write-Host "Testing app..." -ForegroundColor Yellow
    $url = "https://$AppName.azurewebsites.net/swagger"
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 15
     Write-Host "? App is running! Status: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "URL: $url" -ForegroundColor Cyan
    } catch {
        Write-Host "??  App may still be starting. Check: $url" -ForegroundColor Yellow
    }
}
