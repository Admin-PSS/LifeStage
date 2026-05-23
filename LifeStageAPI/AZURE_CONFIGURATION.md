# Azure App Service Configuration Guide

## Required App Settings in Azure Portal

After deploying to Azure, configure these in:
**Azure Portal ? Your App Service ? Configuration ? Application Settings**

### ?? Critical Settings (App won't start without these)

```
ConnectionStrings__DefaultConnection
Server=tcp:YOUR_SERVER.database.windows.net,1433;Database=LifeStageDB;User ID=YOUR_USER;Password=YOUR_PASSWORD;Encrypt=true;Connection Timeout=30;

Jwt__Secret
[Generate a secure 32+ character string]
Example: use this PowerShell command to generate one:
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

### ?? Optional Settings (App will start without these)

```
# Azure Storage (for file uploads)
Azure__StorageConnectionString
DefaultEndpointsProtocol=https;AccountName=YOUR_STORAGE;AccountKey=YOUR_KEY;EndpointSuffix=core.windows.net

# Azure Communication Services (for emails)
Azure__EmailConnectionString
endpoint=https://YOUR_ACS.communication.azure.com/;accesskey=YOUR_KEY

Azure__EmailFrom
DoNotReply@YOUR_VERIFIED_DOMAIN.com

# Azure SignalR (for real-time notifications)
Azure__SignalR__ConnectionString
Endpoint=https://YOUR_SIGNALR.service.signalr.net;AccessKey=YOUR_KEY;Version=1.0;

# Frontend URL
App__FrontendUrl
https://your-frontend-app.azurewebsites.net

App__BaseUrl
https://your-api-app.azurewebsites.net

# OAuth Providers (all optional)
OAuth__Google__ClientId
YOUR_GOOGLE_CLIENT_ID

OAuth__Google__ClientSecret
YOUR_GOOGLE_CLIENT_SECRET

OAuth__Microsoft__ClientId
YOUR_MS_CLIENT_ID

OAuth__Microsoft__ClientSecret
YOUR_MS_CLIENT_SECRET

OAuth__Facebook__AppId
YOUR_FB_APP_ID

OAuth__Facebook__AppSecret
YOUR_FB_APP_SECRET

OAuth__LinkedIn__ClientId
YOUR_LI_CLIENT_ID

OAuth__LinkedIn__ClientSecret
YOUR_LI_CLIENT_SECRET
```

## How to Add Settings in Azure Portal

### Method 1: Azure Portal UI
1. Go to Azure Portal ? Your App Service
2. Click **Configuration** in left menu
3. Click **+ New application setting**
4. Add **Name** and **Value**
5. Click **OK**
6. Click **Save** at the top
7. Click **Continue** to restart the app

### Method 2: Azure CLI
```bash
az webapp config appsettings set \
  --resource-group YOUR_RESOURCE_GROUP \
  --name YOUR_APP_NAME \
  --settings \
    "Jwt__Secret=YOUR_SECRET_KEY" \
    "ConnectionStrings__DefaultConnection=YOUR_CONNECTION_STRING"
```

### Method 3: PowerShell
```powershell
az webapp config appsettings set `
  --resource-group YOUR_RESOURCE_GROUP `
  --name YOUR_APP_NAME `
  --settings `
  "Jwt__Secret=YOUR_SECRET_KEY" `
 "ConnectionStrings__DefaultConnection=YOUR_CONNECTION_STRING"
```

## Generate JWT Secret

### Using PowerShell:
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

### Using OpenSSL:
```bash
openssl rand -base64 32
```

### Using Online Generator:
Visit: https://generate-random.org/api-token-generator

## Connection String Format

### SQL Database:
```
Server=tcp:YOUR_SERVER.database.windows.net,1433;Database=LifeStageDB;User ID=YOUR_ADMIN;Password=YOUR_PASSWORD;Encrypt=true;TrustServerCertificate=False;Connection Timeout=30;
```

To get from Azure Portal:
1. Azure Portal ? SQL Database ? Your Database
2. Click **Connection strings** in left menu
3. Copy the **ADO.NET** connection string
4. Replace `{your_password}` with actual password

## Verify Configuration

### Check App is Running:
```bash
curl https://YOUR_APP.azurewebsites.net/swagger
```

### View Logs:
```bash
# In Azure Portal
Portal ? App Service ? Log stream

# Or via Azure CLI
az webapp log tail --resource-group YOUR_RG --name YOUR_APP
```

### Test API:
```bash
# Health check
curl https://YOUR_APP.azurewebsites.net/api/trending/hashtags

# Should return 200 OK with empty array []
```

## Common Issues

### 500.30 Error - App Failed to Start
**Cause:** Missing JWT Secret or invalid connection string
**Fix:** Add `Jwt__Secret` in App Settings

### 500.31 Error - Failed to load app
**Cause:** Missing dependency or configuration
**Fix:** Check Log Stream for detailed error

### Database Connection Failed
**Cause:** Invalid connection string or firewall rules
**Fix:** 
1. Verify connection string format
2. Azure SQL ? Firewalls and virtual networks
3. Add Azure services: ON
4. Add your IP if testing locally

### OAuth Not Working
**Cause:** Callback URLs not configured
**Fix:** In OAuth provider console, add:
```
https://YOUR_APP.azurewebsites.net/api/auth/oauth/{provider}/callback
```

## Monitoring

### Enable Application Insights:
```bash
az monitor app-insights component create \
  --app YOUR_APP_INSIGHTS_NAME \
  --location eastus \
--resource-group YOUR_RG \
  --application-type web

# Link to App Service
az webapp config appsettings set \
  --resource-group YOUR_RG \
  --name YOUR_APP \
  --settings APPLICATIONINSIGHTS_CONNECTION_STRING="YOUR_CONNECTION_STRING"
```

### View Metrics:
- Portal ? App Service ? Monitoring ? Metrics
- Portal ? Application Insights ? Live Metrics

## Security Recommendations

1. **Never commit secrets** to source control
2. **Use Azure Key Vault** for sensitive values
3. **Enable HTTPS Only** in App Service settings
4. **Enable managed identity** for Azure resource access
5. **Restrict CORS** to your actual frontend domain
6. **Enable Application Insights** for monitoring

## Next Steps

1. Configure minimum required settings (Connection String + JWT Secret)
2. Deploy your app
3. Check logs for any startup errors
4. Test API endpoints
5. Configure optional features (OAuth, Storage, etc.)
