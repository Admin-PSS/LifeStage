# ? Quick Reference - Fix HTTP 500.30

## ?? Emergency Fix (2 minutes)

```powershell
# 1. Generate JWT Secret
$jwt = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})

# 2. Set in Azure
az webapp config appsettings set `
  --resource-group "YOUR_RG" `
  --name "YOUR_APP" `
  --settings "Jwt__Secret=$jwt" "ConnectionStrings__DefaultConnection=YOUR_SQL_CONNECTION"

# 3. Restart
az webapp restart --resource-group "YOUR_RG" --name "YOUR_APP"

# 4. Test
curl https://YOUR_APP.azurewebsites.net/swagger
```

## ?? One-Command Deploy

```powershell
.\one-click-deploy.ps1 `
  -ResourceGroup "your-rg" `
  -AppName "your-app" `
  -SqlServer "your-sql-server" `
  -SqlPassword "your-password"
```

## ?? Required Settings ONLY

| Setting | Example |
|---------|---------|
| `Jwt__Secret` | `aB3dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW3xY5z` |
| `ConnectionStrings__DefaultConnection` | `Server=tcp:myserver.database.windows.net,1433;Database=LifeStageDB;User ID=admin;Password=Pass123!;Encrypt=true;` |

**That's it!** Everything else is optional.

## ?? Diagnostic Commands

```powershell
# Check configuration
az webapp config appsettings list --resource-group YOUR_RG --name YOUR_APP

# View logs
az webapp log tail --resource-group YOUR_RG --name YOUR_APP

# Run diagnostics
.\diagnose-azure.ps1 -ResourceGroup "YOUR_RG" -AppName "YOUR_APP"

# Restart app
az webapp restart --resource-group YOUR_RG --name YOUR_APP
```

## ? Verify Deployment

```bash
# Should return 200 OK
curl https://YOUR_APP.azurewebsites.net/swagger

# Should return [] or hashtag data
curl https://YOUR_APP.azurewebsites.net/api/trending/hashtags
```

## ?? Full Guides

| Issue | Guide |
|-------|-------|
| 500.30 Error | `TROUBLESHOOTING_500.30.md` |
| Configuration | `AZURE_CONFIGURATION.md` |
| Deployment | `README_DEPLOYMENT.md` |

## ?? Common Errors

### "Cannot open database"
**Fix:** Check SQL firewall allows Azure services
```powershell
az sql server firewall-rule create `
  --resource-group YOUR_RG `
--server YOUR_SQL `
  --name AllowAzure `
  --start-ip-address 0.0.0.0 `
  --end-ip-address 0.0.0.0
```

### "JWT Secret is not configured"
**Fix:** Run emergency fix above

### App won't start after configuration
**Fix:** Wait 30 seconds, check logs:
```powershell
az webapp log tail --resource-group YOUR_RG --name YOUR_APP
```

---

**?? Tip:** Save your JWT Secret somewhere safe!
