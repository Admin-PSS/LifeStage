# Azure Deployment Guide for LifeStageAPI

## Option 1: Deploy using PowerShell Script (Easiest)

1. **Prerequisites:**
   - Azure CLI installed: `winget install Microsoft.AzureCLI`
 - Logged in: `az login`

2. **Deploy:**
 ```powershell
   .\deploy-to-azure.ps1 -ResourceGroup "your-resource-group" -AppName "your-app-name"
   ```

## Option 2: Deploy using Visual Studio

1. **Fix the Swagger error:**
   - The `.csproj` file has been updated to disable doc generation
   - Right-click project ? Publish ? Select Azure
   
2. **If error persists:**
   - Use Option 1 (PowerShell script) instead

## Option 3: Deploy using Azure CLI manually

```bash
# Navigate to project
cd src/LifeStageAPI

# Build and publish
dotnet clean
dotnet build --configuration Release
dotnet publish --configuration Release --output ./publish

# Create ZIP
Compress-Archive -Path ./publish/* -DestinationPath ./deploy.zip -Force

# Deploy to Azure
az webapp deployment source config-zip \
  --resource-group "your-rg" \
  --name "your-app-name" \
  --src ./deploy.zip
```

## Option 4: Deploy using GitHub Actions (Best for Production)

1. **Set up GitHub Secrets:**
   - Go to your GitHub repo ? Settings ? Secrets
   - Add `AZURE_WEBAPP_PUBLISH_PROFILE`:
     - In Azure Portal ? Your App Service ? Get Publish Profile
     - Copy entire XML content
     - Paste as secret value

2. **Update workflow file:**
   - Edit `.github/workflows/azure-deploy.yml`
   - Change `AZURE_WEBAPP_NAME` to your app name

3. **Deploy:**
   - Push to `main` branch
   - GitHub Actions will automatically deploy

## Required Azure Configuration

After deployment, configure these App Settings in Azure Portal:

```json
{
  "ConnectionStrings__DefaultConnection": "Server=...",
  "Jwt__Secret": "your-secure-secret-key-min-32-chars",
  "Jwt__Issuer": "LifeStageAPI",
  "Jwt__Audience": "LifeStageApp",
  "Jwt__ExpiryMinutes": "60",
  "Azure__StorageConnectionString": "DefaultEndpointsProtocol=https;...",
  "Azure__EmailConnectionString": "endpoint=https://...",
  "Azure__EmailFrom": "noreply@yourdomain.com",
  "Azure__SignalR__ConnectionString": "Endpoint=https://...",
  "App__FrontendUrl": "https://your-frontend.com",
  "App__BaseUrl": "https://your-api.azurewebsites.net",
  "OAuth__Google__ClientId": "...",
  "OAuth__Google__ClientSecret": "...",
  "OAuth__Microsoft__ClientId": "...",
  "OAuth__Microsoft__ClientSecret": "...",
  "OAuth__Facebook__AppId": "...",
  "OAuth__Facebook__AppSecret": "...",
  "OAuth__LinkedIn__ClientId": "...",
  "OAuth__LinkedIn__ClientSecret": "..."
}
```

## Troubleshooting

### Swagger Error during Publish
? **Fixed** - The `.csproj` now disables doc generation during publish

### Connection String Errors
- Make sure all Azure services are created (SQL Database, Storage, SignalR, Communication Services)
- Update App Settings in Azure Portal with real connection strings

### OAuth Redirect URI
- Update OAuth provider settings with your Azure URL:
  - `https://your-app.azurewebsites.net/api/auth/oauth/{provider}/callback`

## Verify Deployment

After deployment, test these endpoints:

1. **Health Check:** `https://your-app.azurewebsites.net/swagger`
2. **API Status:** `https://your-app.azurewebsites.net/api/trending/hashtags`

## Monitoring

- View logs: Azure Portal ? App Service ? Log Stream
- Application Insights: Enable for better monitoring
