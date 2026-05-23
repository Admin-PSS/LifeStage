# Azure App Service Diagnostic Script
# Usage: .\diagnose-azure.ps1 -ResourceGroup "your-rg" -AppName "your-app-name"

param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroup,
    
    [Parameter(Mandatory=$true)]
    [string]$AppName
)

Write-Host "=== Azure App Service Diagnostics ===" -ForegroundColor Cyan
Write-Host "Resource Group: $ResourceGroup" -ForegroundColor Yellow
Write-Host "App Name: $AppName" -ForegroundColor Yellow
Write-Host ""

# Check if app exists
Write-Host "1. Checking if app exists..." -ForegroundColor Green
$app = az webapp show --resource-group $ResourceGroup --name $AppName 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "? App not found!" -ForegroundColor Red
    exit 1
}
Write-Host "? App exists" -ForegroundColor Green
Write-Host ""

# Check app state
Write-Host "2. Checking app state..." -ForegroundColor Green
$state = az webapp show --resource-group $ResourceGroup --name $AppName --query "state" -o tsv
Write-Host "App State: $state" -ForegroundColor Yellow
Write-Host ""

# Check app settings
Write-Host "3. Checking critical app settings..." -ForegroundColor Green
$settings = az webapp config appsettings list --resource-group $ResourceGroup --name $AppName -o json | ConvertFrom-Json

$criticalSettings = @(
    "ConnectionStrings__DefaultConnection",
    "Jwt__Secret"
)

foreach ($setting in $criticalSettings) {
    $found = $settings | Where-Object { $_.name -eq $setting }
    if ($found) {
        $value = $found.value
        $masked = if ($value.Length -gt 10) { $value.Substring(0, 10) + "..." } else { "***" }
    Write-Host "? $setting = $masked" -ForegroundColor Green
    } else {
        Write-Host "? MISSING: $setting" -ForegroundColor Red
    }
}
Write-Host ""

# Check logs
Write-Host "4. Recent logs (last 20 lines)..." -ForegroundColor Green
Write-Host "----------------------------------------" -ForegroundColor DarkGray
az webapp log tail --resource-group $ResourceGroup --name $AppName --only-show-errors 2>&1 | Select-Object -Last 20
Write-Host "----------------------------------------" -ForegroundColor DarkGray
Write-Host ""

# Check app URL
Write-Host "5. Testing app endpoint..." -ForegroundColor Green
$url = "https://$AppName.azurewebsites.net/swagger"
Write-Host "URL: $url" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10
    Write-Host "? App is responding (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "? App not responding: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Summary
Write-Host "=== Recommendations ===" -ForegroundColor Cyan
Write-Host "1. Ensure ConnectionStrings__DefaultConnection is set" -ForegroundColor Yellow
Write-Host "2. Ensure Jwt__Secret is set (minimum 32 characters)" -ForegroundColor Yellow
Write-Host "3. Check Log Stream in Azure Portal for detailed errors" -ForegroundColor Yellow
Write-Host "4. Verify database connection string format" -ForegroundColor Yellow
Write-Host "5. Check firewall rules on Azure SQL Database" -ForegroundColor Yellow
Write-Host ""

Write-Host "To set a configuration value:" -ForegroundColor Cyan
Write-Host "az webapp config appsettings set --resource-group $ResourceGroup --name $AppName --settings ""Jwt__Secret=YOUR_VALUE""" -ForegroundColor Gray
