# LifeStage — Frontend

React 19 + Vite 7 single-page application for the LifeStage social platform. Connects to the [LifeStage API](../LifeStageAPI/README.md) for all data and real-time features.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Build tool | Vite 7 |
| Real-time notifications | @microsoft/signalr |
| Real-time chat | @azure/communication-chat + @azure/communication-common |
| Auth | JWT stored in localStorage |
| Styling | Plain CSS (no framework) |

---

## Pages and Features

| Page / Component | Description |
|-----------------|-------------|
| `AuthPage` | Register, login, OAuth social login buttons |
| `lifestage-platform` | Main feed, composer, trending sidebar, user search, follow/unfollow |
| `ProfilePage` | User profile, post history, avatar upload, follow stats |
| `MessagesPage` | ACS-powered real-time chat threads + Azure OpenAI AI chat |
| `NotificationToast` | Real-time notification bell + toast popup via SignalR |
| `EmailConfirmation` | Banner prompting users to verify their email |
| `TermsPage` / `PrivacyPage` | Static legal pages |

---

## Prerequisites

- [Node.js 18+](https://nodejs.org/)
- A running instance of the LifeStage API (local or deployed)

---

## Local Development

### 1. Install dependencies

```bash
cd lifestage-frontend
npm install
```

### 2. Configure the API URL

Create a `.env.local` file (never committed):

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
VITE_API_URL=https://localhost:7001
```

Or point it at the deployed backend if you are not running the API locally.

### 3. Run the dev server

```bash
npm run dev
```

App is available at `http://localhost:5173`. The Vite dev server proxies `/api` and `/hubs` to `VITE_API_URL` automatically.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Base URL of the LifeStage API, no trailing slash |

---

## Production Build

The app must be built locally — Vite 7 is incompatible with Azure App Service's Oryx build system due to a path resolution bug with `index.html`.

```bash
npm run build
```

Output is placed in `dist/`. The `server.cjs` file in the repo root is a zero-dependency Node.js static server that serves `dist/` with SPA fallback routing — it is what Azure runs in production.

### Deploy to Azure Web App (Kudu zipdeploy)

```powershell
# 1. Build
npm run build

# 2. Zip only the pre-built output + server
Compress-Archive -Path 'dist','server.cjs' -DestinationPath 'frontend-prebuilt.zip' -Force

# 3. Deploy
$TOKEN = az account get-access-token --resource "https://management.azure.com" --query accessToken -o tsv
curl -X POST "https://YOUR_FRONTEND_APP.scm.azurewebsites.net/api/zipdeploy" `
  -H "Authorization: Bearer $TOKEN" `
  --data-binary "@frontend-prebuilt.zip" `
  -H "Content-Type: application/zip"
```

### Required Azure App Service settings

| Setting | Value |
|---------|-------|
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `false` |
| `WEBSITE_NODE_DEFAULT_VERSION` | `~18` |
| Startup command | `node server.cjs` |

---

## OAuth Redirect URIs (frontend side)

After a successful OAuth login the backend redirects back to the frontend with a token in the query string:

```
https://YOUR_FRONTEND/auth/callback?token=JWT&user=...
```

This is handled by `AuthPage.jsx`. No additional frontend configuration is needed — the backend controls the redirect URL via its `App__FrontendUrl` setting.

---

## Project Structure

```
lifestage-frontend/
├── .env.example          # environment variable template
├── .gitignore
├── server.cjs            # production static file server
├── vite.config.js        # dev proxy config
├── package.json
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── api.js             # all API call functions
    ├── auth.js            # JWT helpers (save, get, clear)
    ├── signalr.js         # SignalR connection management
    ├── AuthPage.jsx
    ├── lifestage-platform.jsx
    ├── ProfilePage.jsx
    ├── MessagesPage.jsx
    ├── PostCard.jsx       # PostCard + Composer shared components
    ├── NotificationToast.jsx
    ├── EmailConfirmation.jsx
    ├── TermsPage.jsx
    └── PrivacyPage.jsx
```

---

## License

MIT
