# LifeStage — Social Platform API

> "All the world's a stage" — a full-stack social media platform where every life deserves its moment.

ASP.NET Core 8 REST API with real-time notifications, ACS-powered chat, media uploads, multi-provider OAuth, and Azure cloud infrastructure.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | ASP.NET Core 8 Web API |
| ORM | Entity Framework Core 8 |
| Database | Azure SQL / SQL Server |
| Auth | ASP.NET Core Identity + JWT |
| OAuth | Google, Microsoft, Facebook, Twitter/X, LinkedIn |
| Real-time | SignalR (Azure SignalR Service or self-hosted) |
| Chat | Azure Communication Services (ACS) |
| Email | Azure Communication Services (ACS Email) |
| Storage | Azure Blob Storage |
| AI chat | Azure OpenAI (optional) |
| Logging | Serilog |
| Docs | Swagger / OpenAPI |

---

## Project Structure

```
LifeStageAPI/
├── .gitignore
├── README.md
├── LifeStageAPI.sln
└── src/
    └── LifeStageAPI/
        ├── appsettings.json              # template — all values empty
        ├── appsettings.example.json      # reference with placeholder values
        ├── appsettings.Development.json  # local dev defaults (localdb)
        ├── Program.cs
        ├── Controllers/
        │   ├── AuthController.cs
        │   ├── PostsController.cs
        │   ├── UsersController.cs
        │   ├── SocialControllers.cs      # comments, trending, notifications
        │   ├── MessagesController.cs     # ACS chat + AI chat
        │   └── UploadController.cs       # blob storage uploads
        ├── Data/ApplicationDbContext.cs
        ├── Hubs/NotificationHub.cs
        ├── Middleware/ExceptionMiddleware.cs
        ├── Models/
        │   ├── ApplicationUser.cs
        │   └── SocialModels.cs
        ├── DTOs/Dtos.cs
        └── Services/
            ├── TokenService.cs
            ├── BlobStorageService.cs
            └── EmailService.cs
```

---

## Required Services

### 1. SQL Server / Azure SQL

Used for all application data (users, posts, comments, notifications).

**Local dev:** SQL Server LocalDB ships with Visual Studio. No setup needed — `appsettings.Development.json` points to it automatically.

**Production:** Create an Azure SQL Database.
1. Portal → Create resource → Azure SQL → Single database
2. Copy the ADO.NET connection string from the database's **Connection strings** blade
3. Set as `ConnectionStrings__DefaultConnection` in Azure App Service config

---

### 2. Azure Blob Storage

Used for user avatar uploads, image/audio/video post attachments.

1. Portal → Create resource → Storage account
2. Create a container named `uploads` with **Blob** access level (or Private if you use SAS tokens)
3. Go to **Access keys** → copy **Connection string**
4. Set as `Azure__StorageConnectionString`

---

### 3. Azure Communication Services (ACS)

Used for two things: **transactional email** (registration, password reset) and **real-time chat** (ACS Chat SDK).

1. Portal → Create resource → Communication Services
2. **For email:** Go to the resource → **Email** → connect or provision an email domain
3. Copy the resource's **Connection string** (from **Keys** blade)
4. Set as `Azure__EmailConnectionString`
5. Set the verified sender address as `Azure__EmailFrom` (e.g. `DoNotReply@yourdomain.com`)

---

### 4. Azure SignalR Service

Used for real-time push notifications in the frontend. Optional — the app falls back to self-hosted SignalR if this connection string is absent.

1. Portal → Create resource → SignalR Service → choose **Serverless** service mode
2. Go to the resource → **Connection strings** → copy the primary connection string
3. Set as `Azure__SignalR__ConnectionString`

---

### 5. Azure OpenAI (optional)

Used for the AI chat feature in the messages page. The feature is disabled if the config is empty.

1. Portal → Create resource → Azure OpenAI
2. Deploy a model (e.g. `gpt-4o`) in Azure AI Studio
3. Copy the endpoint and key
4. Set `Azure__OpenAI__Endpoint`, `Azure__OpenAI__ApiKey`, `Azure__OpenAI__DeploymentName`

---

## OAuth Providers

All OAuth providers are optional. The app only registers a provider if both `ClientId` and `ClientSecret` are non-empty.

### Google

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**
2. Create **OAuth 2.0 Client ID** → Application type: **Web application**
3. Add authorized redirect URI: `https://YOUR_DOMAIN/api/auth/oauth/google/callback`
4. Copy **Client ID** and **Client Secret**
5. Set `OAuth__Google__ClientId` and `OAuth__Google__ClientSecret`

### Microsoft

1. Go to [Azure Portal](https://portal.azure.com/) → **Microsoft Entra ID** → **App registrations** → **New registration**
2. Add redirect URI: `https://YOUR_DOMAIN/api/auth/oauth/microsoft/callback`
3. Go to **Certificates & secrets** → **New client secret** → copy the **Value** column (not the ID)
4. Set `OAuth__Microsoft__ClientId` and `OAuth__Microsoft__ClientSecret`

### Facebook

1. Go to [Meta for Developers](https://developers.facebook.com/) → **My Apps** → **Create App**
2. Add **Facebook Login** product → **Settings** → add redirect URI: `https://YOUR_DOMAIN/api/auth/oauth/facebook/callback`
3. Go to **App Settings** → **Basic** → copy **App ID** and **App Secret**
4. Set `OAuth__Facebook__AppId` and `OAuth__Facebook__AppSecret`

### Twitter / X

1. Go to [developer.twitter.com](https://developer.twitter.com/) → **Projects & Apps** → **New App**
2. Set callback URL: `https://YOUR_DOMAIN/api/auth/oauth/twitter/callback`
3. Copy **Consumer Key** and **Consumer Secret** from the **Keys and tokens** tab
4. Set `OAuth__Twitter__ConsumerKey` and `OAuth__Twitter__ConsumerSecret`

### LinkedIn

1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/apps) → **Create app**
2. Under **Auth** tab → add redirect URL: `https://YOUR_DOMAIN/api/auth/oauth/linkedin/callback`
3. Copy **Client ID** and **Client Secret**
4. Set `OAuth__LinkedIn__ClientId` and `OAuth__LinkedIn__ClientSecret`

---

## Local Development Setup

### Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8)
- SQL Server LocalDB (included with Visual Studio 2022) or a full SQL Server instance
- Visual Studio 2022 or VS Code with C# Dev Kit

### 1. Clone and configure

```bash
git clone https://github.com/YOUR_USERNAME/LifeStageAPI.git
cd LifeStageAPI
```

Copy `appsettings.example.json` as a reference. Supply real values via [.NET User Secrets](https://learn.microsoft.com/en-us/aspnet/core/security/app-secrets) so they never touch disk in a tracked file:

```bash
cd src/LifeStageAPI
dotnet user-secrets init

# Required
dotnet user-secrets set "Jwt:Secret" "a-random-string-at-least-32-characters-long"

# Add only the OAuth providers you want to test locally
dotnet user-secrets set "OAuth:Google:ClientId"        "YOUR_GOOGLE_CLIENT_ID"
dotnet user-secrets set "OAuth:Google:ClientSecret"    "YOUR_GOOGLE_CLIENT_SECRET"
dotnet user-secrets set "OAuth:Microsoft:ClientId"     "YOUR_MS_CLIENT_ID"
dotnet user-secrets set "OAuth:Microsoft:ClientSecret" "YOUR_MS_CLIENT_SECRET"
dotnet user-secrets set "OAuth:Facebook:AppId"         "YOUR_FB_APP_ID"
dotnet user-secrets set "OAuth:Facebook:AppSecret"     "YOUR_FB_APP_SECRET"
dotnet user-secrets set "OAuth:LinkedIn:ClientId"      "YOUR_LI_CLIENT_ID"
dotnet user-secrets set "OAuth:LinkedIn:ClientSecret"  "YOUR_LI_CLIENT_SECRET"
dotnet user-secrets set "OAuth:Twitter:ConsumerKey"    "YOUR_TWITTER_KEY"
dotnet user-secrets set "OAuth:Twitter:ConsumerSecret" "YOUR_TWITTER_SECRET"

# Optional — Azure services (leave empty to use local fallbacks)
dotnet user-secrets set "Azure:StorageConnectionString"  "YOUR_STORAGE_CONNECTION_STRING"
dotnet user-secrets set "Azure:EmailConnectionString"    "YOUR_ACS_CONNECTION_STRING"
dotnet user-secrets set "Azure:EmailFrom"                "DoNotReply@yourdomain.com"
dotnet user-secrets set "Azure:SignalR:ConnectionString" "YOUR_SIGNALR_CONNECTION_STRING"
```

### 2. Migrate and run

```bash
dotnet ef database update --project src/LifeStageAPI
dotnet run --project src/LifeStageAPI
```

Swagger UI is available at `https://localhost:7001` in development.

---

## Configuration Reference

All keys below map to Azure App Service app settings using `__` as the section separator (e.g. `Azure__EmailConnectionString`).

| Key | Required | Description |
|-----|----------|-------------|
| `ConnectionStrings__DefaultConnection` | Yes | SQL Server / Azure SQL connection string |
| `Jwt__Secret` | Yes | Random string, minimum 32 characters |
| `Jwt__Issuer` | No | Defaults to `LifeStageAPI` |
| `Jwt__Audience` | No | Defaults to `LifeStageApp` |
| `Jwt__ExpiryMinutes` | No | Token lifetime, defaults to `60` |
| `App__FrontendUrl` | Yes (prod) | Frontend origin for CORS, e.g. `https://lifestage.uzalike.com` |
| `Azure__StorageConnectionString` | No | Azure Blob Storage — disables file uploads if absent |
| `Azure__EmailConnectionString` | No | ACS connection string — disables email + chat if absent |
| `Azure__EmailFrom` | No | Verified sender address for ACS email |
| `Azure__SignalR__ConnectionString` | No | Azure SignalR Service — falls back to self-hosted if absent |
| `Azure__OpenAI__Endpoint` | No | Azure OpenAI endpoint — disables AI chat if absent |
| `Azure__OpenAI__ApiKey` | No | Azure OpenAI key |
| `Azure__OpenAI__DeploymentName` | No | Model deployment name, e.g. `gpt-4o` |
| `OAuth__Google__ClientId/ClientSecret` | No | Google OAuth |
| `OAuth__Microsoft__ClientId/ClientSecret` | No | Microsoft OAuth |
| `OAuth__Facebook__AppId/AppSecret` | No | Facebook OAuth |
| `OAuth__Twitter__ConsumerKey/ConsumerSecret` | No | Twitter/X OAuth |
| `OAuth__LinkedIn__ClientId/ClientSecret` | No | LinkedIn OAuth |

---

## API Reference

### Auth — `/api/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | Public | Register with email + password |
| POST | `/login` | Public | Returns JWT |
| GET | `/confirm-email` | Public | Email verification link handler |
| POST | `/resend-confirmation` | Public | Resend verification email |
| POST | `/forgot-password` | Public | Send password reset email |
| POST | `/reset-password` | Public | Reset password with token |
| GET | `/oauth/{provider}` | Public | Initiate OAuth flow |
| GET | `/oauth/{provider}/callback` | Public | OAuth callback handler |

Supported providers: `google`, `microsoft`, `facebook`, `twitter`, `linkedin`

### Posts — `/api/posts`

| Method | Path | Auth |
|--------|------|------|
| GET | `/feed` | Required |
| GET | `/{id}` | Optional |
| POST | `/` | Required |
| PUT | `/{id}` | Owner |
| POST | `/{id}/repost` | Required |
| DELETE | `/{id}` | Owner |
| POST | `/{id}/like` | Required |
| GET | `/user/{username}` | Optional |

### Users — `/api/users`

| Method | Path | Auth |
|--------|------|------|
| GET / PUT | `/me` | Required |
| GET | `/{username}` | Optional |
| POST | `/{username}/follow` | Required |
| GET | `/{username}/followers` | Optional |
| GET | `/{username}/following` | Optional |
| GET | `/search?q=` | Optional |

### Comments — `/api/posts/{postId}/comments`

| Method | Path | Auth |
|--------|------|------|
| GET / POST | `/` | GET: Optional, POST: Required |
| POST | `/{commentId}/like` | Required |
| DELETE | `/{commentId}` | Owner |

### Trending — `/api/trending`

| GET `/hashtags` | GET `/posts` |

### Notifications — `/api/notifications`

| GET `/` | GET `/unread-count` | PUT `/mark-all-read` |

### Messages — `/api/messages`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/token` | Get ACS user token for chat SDK |
| GET | `/participants` | Search ACS participants by display name |
| GET | `/ai-chat/history` | Fetch AI conversation history |
| POST | `/ai-chat` | Send message to Azure OpenAI |

### Upload — `/api/upload`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Upload image to Blob Storage |
| POST | `/audio` | Upload audio file |
| GET | `/video/sas` | Get SAS URL for direct video upload |
| POST | `/avatar` | Upload and set user avatar |

### SignalR Hub — `/hubs/notifications`

Pass the JWT as a query parameter: `?access_token=YOUR_JWT`

Client event: `ReceiveNotification`

---

## Production Deployment (Azure App Service)

1. Build and publish:
   ```powershell
   dotnet publish -c Release -o ./publish1
   Compress-Archive -Path './publish1/*' -DestinationPath './deploy.zip' -Force
   ```

2. Deploy via Kudu zipdeploy (more reliable than `az webapp deploy`):
   ```bash
   TOKEN=$(az account get-access-token --resource "https://management.azure.com" --query accessToken -o tsv)
   curl -X POST "https://YOUR_APP.scm.azurewebsites.net/api/zipdeploy" \
     -H "Authorization: Bearer $TOKEN" \
     --data-binary @deploy.zip \
     -H "Content-Type: application/zip"
   ```

3. Set all required app settings in the Azure Portal under **Configuration → Application settings**.

---

## License

MIT
