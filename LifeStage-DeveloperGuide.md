# LifeStage — Developer Guide

*Local Setup, Project Structure, Development Reference & Azure Deployment*

Version: 1.0.0 | Confidential — Internal Use Only

---

## 1. Prerequisites

| Tool | Minimum Version | Notes |
|---|---|---|
| .NET SDK | 8.0 | dotnet.microsoft.com/download |
| Node.js | 18.x | nodejs.org — for React frontend |
| SQL Server | LocalDB or Express | Ships with Visual Studio 2022 |
| Visual Studio 2022 | 17.8+ | Or VS Code with C# extension |
| Git | Any | For version control |
| Azure CLI | Latest | For Azure deployment |

---

## 2. Local Development Setup

### 2.1 Clone and Open

1. Clone or extract the project to a local directory
2. Open `LifeStageAPI.sln` in Visual Studio 2022
3. Restore NuGet packages (automatic on build)

### 2.2 NuGet Packages

Key packages (already in `.csproj`):

```
Microsoft.AspNetCore.Authentication.Google
Microsoft.AspNetCore.Authentication.MicrosoftAccount
Azure.Storage.Blobs
Azure.Communication.Email
Microsoft.AspNetCore.SignalR
```

### 2.3 Configure User Secrets

Right-click the project in Visual Studio → Manage User Secrets:

```bash
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=(localdb)\\mssqllocaldb;Database=LifeStageDB_Dev;Trusted_Connection=True;TrustServerCertificate=True;"
dotnet user-secrets set "Jwt:Secret" "<48-byte base64 string>"
dotnet user-secrets set "Azure:StorageConnectionString" "<from Azure Portal>"
dotnet user-secrets set "Azure:EmailConnectionString" "<from Azure Portal>"
dotnet user-secrets set "Azure:EmailFrom" "noreply@yourdomain.com"
dotnet user-secrets set "App:FrontendUrl" "http://localhost:5173"
```

Generate a secure JWT secret (PowerShell):

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { [byte](Get-Random -Max 256) }))
```

### 2.4 Run Database Migrations

```bash
dotnet ef migrations add InitialCreate
dotnet ef database update
```

Or in Package Manager Console:

```
Add-Migration InitialCreate
Update-Database
```

### 2.5 Start the API

- Set startup project to `LifeStageAPI`
- Press F5 or Ctrl+F5 to run
- API: `https://localhost:7001`
- Swagger UI: `https://localhost:7001` (development only)

### 2.6 Start the Frontend

```bash
cd lifestage-frontend
npm install
npm install @microsoft/signalr
npm run dev
```

Frontend available at `http://localhost:5173`.

---

## 3. Project Structure

### 3.1 Backend (`LifeStageAPI/src/LifeStageAPI/`)

| Path | Description |
|---|---|
| `Controllers/` | `AuthController`, `PostsController`, `UsersController`, `UploadController`, `MessagesController` |
| `Data/` | `ApplicationDbContext.cs` — EF Core DbContext + entity configurations |
| `DTOs/` | `Dtos.cs`, `AuthDtos.cs` — request/response models (includes `AcsTokenResponse`, `AcsParticipantDto`) |
| `Hubs/` | `NotificationHub.cs` — SignalR hub |
| `Middleware/` | `ExceptionMiddleware.cs` — global error handling |
| `Models/` | `ApplicationUser.cs`, `SocialModels.cs` — entity classes |
| `Services/` | `TokenService`, `BlobStorageService`, `EmailService` |
| `Program.cs` | Dependency injection, middleware pipeline, CORS, SignalR, HTTP clients |
| `appsettings.json` | Base configuration (no secrets) |
| `appsettings.Production.json` | All empty strings — real values come from Azure App Settings env vars |

### 3.2 Frontend (`lifestage-frontend/src/`)

| File | Purpose |
|---|---|
| `main.jsx` | Root app — routing between Auth, Feed, Profile, ConfirmEmail pages |
| `AuthPage.jsx` | Login + Register forms with OAuth buttons (Google, Microsoft) |
| `lifestage-platform.jsx` | Main feed — posts, composer, sidebars, trending |
| `ProfilePage.jsx` | User profile view + edit modal |
| `MessagesPage.jsx` | ACS Chat UI using `@azure/communication-chat` |
| `PostCard.jsx` | Shared PostCard + Composer components |
| `EmailConfirmation.jsx` | `EmailBanner` (feed) + `ConfirmEmailPage` (route handler) |
| `NotificationToast.jsx` | Toast component + bell dropdown + `useNotifications` hook |
| `signalr.js` | SignalR connection manager (start/stop/reconnect) |
| `api.js` | All fetch wrappers for every API endpoint |
| `auth.js` | localStorage helpers (`saveAuth`, `getToken`, `getUser`, `logout`) |
| `server.cjs` | Zero-dependency Node.js HTTP server — serves `dist/` with SPA fallback (production) |

---

## 4. Environment Variables Reference

### Backend

| Key | Required | Description |
|---|---|---|
| `Azure:StorageConnectionString` | Required | Azure Blob Storage connection string |
| `Azure:EmailConnectionString` | Required | ACS connection string (also used for chat identity) |
| `Azure:EmailFrom` | Required | Verified sender email |
| `Azure:SignalR:ConnectionString` | Required (prod) | Azure SignalR Service connection string |
| `Jwt:Secret` | Required | Min 48-byte random base64 string |
| `Jwt:ExpiryDays` | Optional (7) | JWT token expiry in days |
| `App:FrontendUrl` | Required | Frontend URL — used for CORS and OAuth redirects |
| `App:BaseUrl` | Optional | API base URL for email confirmation links |
| `Authentication:Google:ClientId` | Optional | Google OAuth client ID |
| `Authentication:Google:ClientSecret` | Optional | Google OAuth client secret |
| `Authentication:Microsoft:ClientId` | Optional | Microsoft OAuth application (client) ID |
| `Authentication:Microsoft:ClientSecret` | Optional | Microsoft OAuth client SECRET VALUE (not secret ID) |
| `ASPNETCORE_ENVIRONMENT` | Required (prod) | Set to `Production` |

> **Note:** In Azure App Settings, use double underscores for nested keys: `Jwt__Secret`, `Azure__EmailConnectionString`, etc.

### Frontend (Vite)

| Key | Description |
|---|---|
| `VITE_API_URL` | API base URL — set in `.env.production` |

---

## 5. OAuth Provider Setup

Callback URI pattern: `https://{api-domain}/api/auth/oauth/{provider}/callback`

### 5.1 Google

1. Go to `console.cloud.google.com/apis/credentials`
2. Create project → Enable Google+ API
3. Create OAuth 2.0 Client ID (Web Application)
4. Add redirect URI: `https://{api-domain}/api/auth/oauth/Google/callback`
5. Copy **Client ID** and **Client Secret** to secrets

### 5.2 Microsoft

1. Go to `portal.azure.com` → Azure Active Directory → App registrations
2. New registration → Platform: Web → Add redirect URI
3. Certificates & Secrets → New client secret
4. Copy **Application (client) ID** and the secret **VALUE** (not the secret ID/UUID)
5. Set `Authentication:Microsoft:ClientId` and `Authentication:Microsoft:ClientSecret`

> **Common mistake:** The "Secret ID" in Azure is a UUID (not the secret value). Always copy the "Value" column, not the "Secret ID" column.

---

## 6. How to Add New Features

### 6.1 New API Endpoint

1. Add DTO classes in `DTOs/Dtos.cs` or a new file
2. Create or update a Controller in `Controllers/`
3. Add EF Core queries against `ApplicationDbContext`
4. For SignalR notifications, inject `IHubContext<NotificationHub>` and call `NotificationHub.SendNotificationToUser()`
5. Add the corresponding method to `src/api.js` in the frontend

### 6.2 New Database Entity

1. Create model class in `Models/SocialModels.cs`
2. Add `DbSet<T>` property to `ApplicationDbContext`
3. Configure relationships in `OnModelCreating` if needed
4. Run: `dotnet ef migrations add AddYourEntity`
5. Run: `dotnet ef database update`

### 6.3 New Frontend Page

1. Create `YourPage.jsx` in `src/`
2. Add page state (e.g. `"your-page"`) to the page state in `main.jsx`
3. Add a conditional render block in `App()` in `main.jsx`
4. Add navigation trigger (e.g. `onClick` in NavItem or button)

### 6.4 New Notification Type

1. Add new `NotificationType` enum value in `Models/SocialModels.cs`
2. In the relevant controller, call `NotificationHub.SendNotificationToUser()`
3. Persist a `Notification` entity to DB
4. In `NotificationToast.jsx` `TYPE_CONFIG`, add the new type with emoji, color, label

---

## 7. Build & Deploy Scripts

All scripts are in `D:\LifeStageAPI-full\`.

### 7.1 Backend

**Build** (`build-backend.ps1`):
```powershell
# Publishes and zips the API to deploy-backend.zip
.\build-backend.ps1
```

**Deploy** (`deploy-backend.ps1`):
```powershell
# Deploys deploy-backend.zip to Azure via Kudu zipdeploy
.\deploy-backend.ps1
```

**Clean** (`clean.ps1`):
```powershell
# Removes publish folders and zip files
.\clean.ps1
```

### 7.2 Frontend

**Build** (`build-frontend.ps1`):
```powershell
# npm run build + zips dist/ + server.cjs to frontend-prebuilt.zip
.\build-frontend.ps1
```

**Deploy** (`deploy-frontend.ps1`):
```powershell
# Deploys frontend-prebuilt.zip to Azure via Kudu zipdeploy
.\deploy-frontend.ps1
```

### 7.3 Typical Workflow

```bash
# Backend change
cd "D:\LifeStageAPI-full"
powershell -File build-backend.ps1
powershell -File deploy-backend.ps1

# Frontend change
powershell -File build-frontend.ps1
powershell -File deploy-frontend.ps1

# Clean up build artifacts
powershell -File clean.ps1
```

> **Important:** Always use the `.ps1` scripts — never run ad-hoc `dotnet publish` or deploy commands directly. The scripts use a fixed `publish/` folder name and `deploy-backend.zip` path that the deploy script expects.

---

## 8. Azure Deployment Reference

### 8.1 Live URLs

| Service | URL |
|---|---|
| Backend API | `https://lifestage-cbfgh8b6ercddmd6.canadacentral-01.azurewebsites.net` |
| Frontend | `https://lifestage-frontend.azurewebsites.net` |
| Kudu (backend) | `https://lifestage-cbfgh8b6ercddmd6.scm.canadacentral-01.azurewebsites.net` |
| Kudu (frontend) | `https://lifestage-frontend.scm.azurewebsites.net` |

### 8.2 Azure Resources

| Resource | Name | Resource Group |
|---|---|---|
| App Service (API) | `lifestage` | `rg-lifestage` |
| App Service (Frontend) | `lifestage-frontend` | `rg-lifestage` |
| App Service Plan (API) | — | `rg-lifestage` |
| App Service Plan (Frontend) | `plan-lifestage-web` (Linux B1) | `rg-lifestage` |

### 8.3 Deployment Method

Both API and frontend use **Kudu zipdeploy** (`POST /api/zipdeploy`).

> **Do not use** `az webapp deploy` (OneDeploy) — it silently fails to update the running process.

### 8.4 Frontend Deployment Notes

- Vite v7 is incompatible with Azure Oryx auto-build
- Set `SCM_DO_BUILD_DURING_DEPLOYMENT=false` on the frontend App Service
- Always build locally with `npm run build`, then deploy the pre-built `dist/` + `server.cjs`
- `server.cjs` is a zero-dependency Node.js HTTP server that serves `dist/` with SPA fallback

### 8.5 Azure App Service Configuration (API)

Key settings in Azure App Service → Configuration:

| Setting Name | Notes |
|---|---|
| `ASPNETCORE_ENVIRONMENT` | `Production` |
| `ConnectionStrings__DefaultConnection` | Azure SQL connection string |
| `Jwt__Secret` | 48-byte base64 secret |
| `Azure__StorageConnectionString` | Blob Storage |
| `Azure__EmailConnectionString` | ACS (email + chat) |
| `Azure__EmailFrom` | Verified sender |
| `Azure__SignalR__ConnectionString` | Azure SignalR Service |
| `App__FrontendUrl` | Frontend URL (for CORS) |
| `App__BaseUrl` | API URL (for email links) |
| `Authentication__Google__ClientId` | Google OAuth |
| `Authentication__Google__ClientSecret` | Google OAuth |
| `Authentication__Microsoft__ClientId` | Microsoft OAuth |
| `Authentication__Microsoft__ClientSecret` | Microsoft OAuth (secret VALUE) |

### 8.6 New Azure Deployment (Fresh Setup)

Deploy in this order: **Database → API → Frontend**

**Stage 1 — Azure SQL:**
1. Create SQL Server + Database in Azure Portal (`rg-lifestage-prod`)
2. Get the ADO.NET connection string from Connection strings blade
3. Run migrations from dev machine:
   ```bash
   $env:ConnectionStrings__DefaultConnection="Server=tcp:..."
   dotnet ef database update
   ```

**Stage 2 — App Service (API):**
1. Create Web App: Code, .NET 8, Windows, same region as SQL
2. Set all Application Settings (double-underscore format)
3. Configure CORS: add frontend URL
4. Deploy via `deploy-backend.ps1`
5. Verify: `GET /api/auth/login` returns 405 (not HTML)

**Stage 3 — App Service (Frontend):**
1. Create Web App: Code, Node.js, Linux
2. Set `SCM_DO_BUILD_DURING_DEPLOYMENT=false`
3. Build locally: `npm run build`
4. Deploy via `deploy-frontend.ps1`
5. After deploy, update API's `App__FrontendUrl` and CORS to frontend URL

---

## 9. Useful Azure CLI Commands

```bash
# View live API logs
az webapp log tail --name lifestage --resource-group rg-lifestage

# Restart the API
az webapp restart --name lifestage --resource-group rg-lifestage

# Restart the frontend
az webapp restart --name lifestage-frontend --resource-group rg-lifestage

# Get access token for Kudu deploy
az account get-access-token --resource "https://management.azure.com" --query accessToken -o tsv
```

---

## 10. Troubleshooting

| Problem | Solution |
|---|---|
| API 500 on startup | Check Log stream in Azure Portal for config/connection errors |
| Cannot connect to Azure SQL | Check SQL Server firewall — add App Service outbound IPs, enable "Allow Azure services" |
| CORS errors in browser | App Service → CORS → verify frontend URL matches exactly, no trailing slash |
| Frontend blank page | Check `server.cjs` is in the zip. Verify `SCM_DO_BUILD_DURING_DEPLOYMENT=false` |
| SignalR fails to connect | Verify `Azure__SignalR__ConnectionString` is set; transport is LongPolling |
| Email confirmation not sending | Check `Azure__EmailConnectionString` and `Azure__EmailFrom` in App Settings |
| Images not uploading | Verify `Azure__StorageConnectionString`; check blob containers exist with public read |
| OAuth login fails | Confirm callback URLs in provider console match production API domain |
| MS OAuth `AADSTS7000215` | `ClientSecret` is secret ID (UUID) not secret VALUE — copy the Value column |
| JWT tokens rejected | Ensure `Jwt__Secret` is identical across environments, min 48 characters |
| `publish/` folder locked | Use `clean.ps1` to remove stale folders, then rebuild |
| `dotnet publish` cached | Run `dotnet clean && dotnet build` twice if needed |
