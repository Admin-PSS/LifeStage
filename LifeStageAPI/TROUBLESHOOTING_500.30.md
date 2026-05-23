# Fixing HTTP Error 500.30 - Quick Guide

## The Error
```
HTTP Error 500.30 - ASP.NET Core app failed to start
```

## Root Causes (Most Common)

### 1. Missing JWT Secret (MOST COMMON)
**Symptom:** App crashes immediately on startup
**Solution:**
```powershell
# Generate a secure secret
$secret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})

# Set in Azure
az webapp config appsettings set `
  --resource-group YOUR_RG `
  --name YOUR_APP `
  --settings "Jwt__Secret=$secret"

# Restart app
az webapp restart --resource-group YOUR_RG --name YOUR_APP
```

### 2. Missing or Invalid Connection String
**Symptom:** App starts but crashes during database migration
**Solution:**
```powershell
# Get connection string from Azure SQL
# Azure Portal ? SQL Database ? Connection strings ? ADO.NET (SQL authentication)

az webapp config appsettings set `
  --resource-group YOUR_RG `
  --name YOUR_APP `
  --settings "ConnectionStrings__DefaultConnection=YOUR_CONNECTION_STRING"
```

### 3. OAuth Providers Not Configured
**Symptom:** App crashes when trying to initialize OAuth
**Solution:** This is now fixed - OAuth providers are optional

## Quick Fix Script

Run this automated setup:
```powershell
.\setup-azure-config.ps1 `
  -ResourceGroup "your-rg" `
  -AppName "your-app" `
  -SqlConnectionString "Server=tcp:..."
```

## Manual Configuration Steps

### Step 1: Set Minimum Required Settings
```powershell
# Navigate to Azure Portal
Portal ? App Service ? Configuration ? Application settings

# Add these TWO critical settings:
Name: ConnectionStrings__DefaultConnection
Value: Server=tcp:YOUR_SERVER.database.windows.net,1433;Database=LifeStageDB;User ID=YOUR_USER;Password=YOUR_PASSWORD;Encrypt=true;

Name: Jwt__Secret
Value: [32+ random characters]
```

### Step 2: Restart App
```powershell
az webapp restart --resource-group YOUR_RG --name YOUR_APP
```

### Step 3: Check Logs
```powershell
az webapp log tail --resource-group YOUR_RG --name YOUR_APP
```

## Diagnostic Steps

### 1. Run Diagnostic Script
```powershell
.\diagnose-azure.ps1 -ResourceGroup "your-rg" -AppName "your-app"
```

### 2. Check App Settings
```powershell
az webapp config appsettings list `
  --resource-group YOUR_RG `
  --name YOUR_APP `
  --query "[?name=='Jwt__Secret' || name=='ConnectionStrings__DefaultConnection'].{Name:name, Value:value}"
```

### 3. View Live Logs
```
Azure Portal ? Your App Service ? Log stream
```

### 4. Check Application Logs
```powershell
# Download logs
az webapp log download --resource-group YOUR_RG --name YOUR_APP --log-file logs.zip

# Extract and view
Expand-Archive logs.zip -DestinationPath .\logs
Get-Content .\logs\LogFiles\Application\*.txt | Select-Object -Last 50
```

## Common Error Messages & Solutions

### "JWT Secret is not configured"
```powershell
az webapp config appsettings set `
  --resource-group YOUR_RG `
 --name YOUR_APP `
  --settings "Jwt__Secret=$(openssl rand -base64 32)"
```

### "Cannot open database"
Check:
1. Connection string format is correct
2. Azure SQL firewall allows Azure services
3. Username/password are correct
4. Database exists

```powershell
# Allow Azure services
az sql server firewall-rule create `
  --resource-group YOUR_RG `
  --server YOUR_SQL_SERVER `
  --name AllowAzureServices `
  --start-ip-address 0.0.0.0 `
  --end-ip-address 0.0.0.0
```

### "The specified CGI application encountered an error"
This usually means:
1. App crashed during startup
2. Check Log Stream for actual error
3. Most likely missing Jwt__Secret

## Verification

After fixing, verify:

```bash
# Test Swagger UI
curl https://YOUR_APP.azurewebsites.net/swagger

# Test API endpoint
curl https://YOUR_APP.azurewebsites.net/api/trending/hashtags
```

Should return `200 OK` with `[]` or valid data.

## Still Not Working?

### Enable Detailed Errors
```powershell
az webapp config appsettings set `
  --resource-group YOUR_RG `
  --name YOUR_APP `
  --settings `
    "ASPNETCORE_ENVIRONMENT=Development" `
    "ASPNETCORE_DETAILEDERRORS=true"
```

?? **Don't leave this enabled in production!**

### Contact Support
If still failing:
1. Export logs: `az webapp log download`
2. Check `Application` logs folder
3. Look for exception details
4. Share specific error message

## Prevention

To avoid this in future deployments:

1. **Use Azure Key Vault** for secrets
2. **Set up CI/CD** with GitHub Actions
3. **Use ARM templates** to provision resources
4. **Enable Application Insights** for monitoring
5. **Test locally** with Production configuration first

## Recommended Complete Setup

```powershell
# 1. Create all Azure resources
az group create --name YOUR_RG --location eastus

# 2. Create SQL Database
az sql server create --name YOUR_SQL --resource-group YOUR_RG --location eastus --admin-user dbadmin --admin-password YOUR_PASSWORD
az sql db create --resource-group YOUR_RG --server YOUR_SQL --name LifeStageDB --service-objective S0

# 3. Create App Service
az appservice plan create --name YOUR_PLAN --resource-group YOUR_RG --sku B1
az webapp create --resource-group YOUR_RG --plan YOUR_PLAN --name YOUR_APP --runtime "DOTNETCORE:8.0"

# 4. Configure App
.\setup-azure-config.ps1 -ResourceGroup YOUR_RG -AppName YOUR_APP -SqlConnectionString "YOUR_CONNECTION_STRING"

# 5. Deploy
.\deploy-to-azure.ps1 -ResourceGroup YOUR_RG -AppName YOUR_APP
```

## Quick Reference

| Command | Purpose |
|---------|---------|
| `az webapp log tail` | View live logs |
| `az webapp restart` | Restart app |
| `az webapp config appsettings list` | List all settings |
| `az webapp config appsettings set` | Set/update settings |
| `az webapp log download` | Download all logs |
| `az webapp browse` | Open app in browser |
