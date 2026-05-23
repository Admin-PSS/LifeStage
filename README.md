# LifeStage

> "All the world's a stage" — a full-stack social media platform where every life deserves its moment.

Live at **[lifestage.uzalike.com](https://lifestage.uzalike.com)**

---

## What is LifeStage?

LifeStage is an open-source social platform built with modern cloud-native technologies. Users can post, follow, like, comment, repost, send real-time messages, and receive live notifications — all backed by Azure infrastructure.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend API | ASP.NET Core 8, Entity Framework Core 8 |
| Frontend | React 19, Vite 7 |
| Database | Azure SQL / SQL Server |
| Auth | ASP.NET Core Identity + JWT + OAuth |
| OAuth providers | Google, Microsoft, Facebook, Twitter/X, LinkedIn |
| Real-time notifications | SignalR (Azure SignalR Service) |
| Real-time chat | Azure Communication Services (ACS) |
| Transactional email | Azure Communication Services (ACS Email) |
| Media storage | Azure Blob Storage |
| AI chat | Azure OpenAI (optional) |
| Hosting | Azure App Service |

---

## Repository Layout

```
LifeStage/
├── LifeStageAPI/          # ASP.NET Core 8 REST API
├── lifestage-frontend/    # React 19 + Vite 7 SPA
├── build-backend.ps1      # Build + zip backend for deployment
├── build-frontend.ps1     # Build + zip frontend for deployment
├── deploy-backend.ps1     # Kudu zipdeploy → Azure App Service (API)
├── deploy-frontend.ps1    # Kudu zipdeploy → Azure App Service (frontend)
└── clean.ps1              # Remove local build artifacts
```

---

## Features

- Email/password registration with email confirmation
- Social login — Google, Microsoft, Facebook, Twitter/X, LinkedIn
- Post feed with likes, reposts, comments, and hashtags
- Follow / unfollow users
- Real-time notifications via SignalR
- Real-time chat via Azure Communication Services
- AI chat powered by Azure OpenAI
- Media uploads — images, audio, video (Azure Blob Storage)
- User profiles with avatar upload
- Trending hashtags and posts
- Swagger / OpenAPI docs at `/swagger`

---

## Getting Started

See the individual READMEs for full setup instructions:

- [Backend — LifeStageAPI](./LifeStageAPI/README.md)
- [Frontend — lifestage-frontend](./lifestage-frontend/README.md)

### Quick overview

1. Provision the required Azure services (SQL, Blob Storage, ACS, SignalR)
2. Register OAuth apps with the providers you want to support
3. Supply credentials via `dotnet user-secrets` (backend) and `.env.local` (frontend)
4. Run `dotnet ef database update` and `dotnet run`
5. Run `npm install && npm run dev` for the frontend

---

## Contributing

Pull requests are welcome. For major changes please open an issue first to discuss the approach.

---

## License

[MIT](./LICENSE)
