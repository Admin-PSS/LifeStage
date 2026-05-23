# deploy-frontend.ps1
# Builds and deploys the LifeStage frontend to Azure Web App (lifestage-frontend / rg-lifestage)
# Usage: .\deploy-frontend.ps1

$ErrorActionPreference = "Stop"

$RESOURCE_GROUP = "rg-lifestage"
$APP_NAME       = "lifestage-frontend"
$ZIP_PATH       = "frontend-source-deploy.zip"

Write-Host ""
Write-Host "=== LifeStage Frontend Deployment ===" -ForegroundColor Cyan
Write-Host "Resource Group : $RESOURCE_GROUP"
Write-Host "App Name       : $APP_NAME"
Write-Host ""

# ── Step 1: npm build ─────────────────────────────────────────────────────────
Write-Host "[1/3] Building React app..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "npm run build failed."; exit 1 }
Write-Host "      Build complete." -ForegroundColor Green

# ── Step 2: Create zip with Python (forward slashes — avoids Oryx path issues) ─
Write-Host "[2/3] Creating deployment zip..." -ForegroundColor Yellow
python -c @"
import zipfile, os

zip_path = '$ZIP_PATH'
include_dirs  = ['src', 'public', 'dist']
include_files = ['package.json', 'package-lock.json', 'vite.config.js', 'index.html', 'server.cjs', '.env.production']

with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
    for d in include_dirs:
        if os.path.isdir(d):
            for root, dirs, files in os.walk(d):
                for file in files:
                    fp = os.path.join(root, file)
                    zf.write(fp, fp.replace(os.sep, '/'))
    for f in include_files:
        if os.path.isfile(f):
            zf.write(f, f)

size_kb = os.path.getsize(zip_path) // 1024
print(f'Zip created: {zip_path} ({size_kb} KB)')
"@
if ($LASTEXITCODE -ne 0) { Write-Error "Zip creation failed."; exit 1 }
Write-Host "      Zip ready." -ForegroundColor Green

# ── Step 3: Deploy to Azure ───────────────────────────────────────────────────
Write-Host "[3/3] Deploying to Azure Web App '$APP_NAME'..." -ForegroundColor Yellow
Write-Host "      This may take 3-5 minutes (Oryx builds on the server)."
Write-Host ""

az webapp deploy `
    --resource-group $RESOURCE_GROUP `
    --name $APP_NAME `
    --src-path $ZIP_PATH `
    --type zip

if ($LASTEXITCODE -ne 0) { Write-Error "Deployment failed."; exit 1 }

Write-Host ""
Write-Host "=== Deployment complete! ===" -ForegroundColor Green
Write-Host "Site: https://$APP_NAME.azurewebsites.net" -ForegroundColor Cyan
Write-Host ""
