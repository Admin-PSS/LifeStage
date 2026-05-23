# PowerShell script to deploy LifeStageAPI to Azure App Service
# Usage: .\deploy-to-azure.ps1 -ResourceGroup "your-rg" -AppName "your-app-name"

param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroup,
    
    [Parameter(Mandatory=$true)]
    [string]$AppName,
    
    [Parameter(Mandatory=$false)]
    [string]$Location = "eastus"
)

Write-Host "Starting deployment to Azure..." -ForegroundColor Green

# Navigate to project directory
$projectPath = "src\LifeStageAPI"
Set-Location $projectPath

# Clean and build the project in Release mode
Write-Host "Building project..." -ForegroundColor Yellow
dotnet clean
dotnet build --configuration Release

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# Publish the project
Write-Host "Publishing project..." -ForegroundColor Yellow
dotnet publish --configuration Release --output ".\bin\Release\publish"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Publish failed!" -ForegroundColor Red
    exit 1
}

# Create ZIP file for deployment
Write-Host "Creating deployment package..." -ForegroundColor Yellow
$publishPath = ".\bin\Release\publish"
$zipPath = ".\bin\Release\deploy.zip"

if (Test-Path $zipPath) {
    Remove-Item $zipPath
}

Compress-Archive -Path "$publishPath\*" -DestinationPath $zipPath

# Deploy to Azure
Write-Host "Deploying to Azure App Service: $AppName..." -ForegroundColor Yellow

az webapp deployment source config-zip `
    --resource-group $ResourceGroup `
    --name $AppName `
    --src $zipPath

if ($LASTEXITCODE -eq 0) {
    Write-Host "Deployment successful!" -ForegroundColor Green
    Write-Host "Your API is available at: https://$AppName.azurewebsites.net" -ForegroundColor Cyan
} else {
    Write-Host "Deployment failed!" -ForegroundColor Red
    exit 1
}

# Navigate back
Set-Location ..\..

Write-Host "Done!" -ForegroundColor Green
