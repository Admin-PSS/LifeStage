# LifeStage Social Platform — Project Discussion

**Date:** March 5, 2026
**Topic:** Full-Stack Social Media Platform Design & Implementation
**Stack:** React (Frontend) · ASP.NET Core 8 (Backend) · MSSQL · Multi-Provider OAuth

---

## 1. Name & Concept

### Why "LifeStage"?

The name was chosen deliberately over the original template placeholder ("Nexus", which is prominently used by Singapore's Ministry of Defence and would cause confusion locally).

**LifeStage** works on multiple levels:

| Layer | Meaning |
|-------|---------|
| Literary | *"All the world's a stage"* — Shakespeare's As You Like It |
| Social | A platform that gives everyone a stage to express themselves |
| Human | Life's chapters and transitions — growth, change, milestones |
| Brand | Warm, universal, culturally neutral — works across markets |

**Design language:** Warm cream/terracotta palette (`#faf6f0`, `#c8824a`), Playfair Display serif for headings, Lato for body — editorial and human, not cold or tech-corporate.

---

## 2. Overview

Two deliverables were built across two phases:

1. **`lifestage-platform.jsx`** — React frontend UI (single-file component)
2. **`LifeStageAPI-backend.zip`** — ASP.NET Core 8 REST API solution

---

## 3. Frontend (React)

### Features

| Feature | Detail |
|---------|--------|
| Post Composer | 280-char limit, expandable, "Share Your Stage" CTA |
| Feed Tabs | For You / Following / Trending |
| Post Card | Like, Comment, Repost with live state |
| Inline Comments | Expandable per post, count increments live |
| Hashtag detection | Auto-parsed from post text |
| Notification badges | On nav icons |
| Trending sidebar | "On the Rise 🎭" — top 5 tags |
| Who to Follow | "Voices to Follow" suggestions |
| Welcome banner | Brand tagline strip at top |

### Design
- **Palette:** Warm cream base, terracotta/amber accents — avoids dark/cold social-media clichés
- **Typography:** Playfair Display (serif display) + Lato (body) — editorial warmth
- **State:** Local `useState` only — no Redux, easy to swap mock data for real API calls

---

## 4. Backend (ASP.NET Core 8)

### Project Structure

```
LifeStageAPI/
├── LifeStageAPI.sln
├── .env.example
├── .gitignore
├── README.md
├── discussion.md
├── lifestage-platform.jsx
└── src/LifeStageAPI/
    ├── LifeStageAPI.csproj
    ├── Program.cs
    ├── appsettings.json
    ├── appsettings.Development.json
    ├── Controllers/
    │   ├── AuthController.cs
    │   ├── PostsController.cs
    │   ├── UsersController.cs
    │   └── SocialControllers.cs     (Comments, Trending, Notifications)
    ├── Data/ApplicationDbContext.cs
    ├── DTOs/Dtos.cs
    ├── Hubs/NotificationHub.cs
    ├── Middleware/ExceptionMiddleware.cs
    ├── Models/
    │   ├── ApplicationUser.cs
    │   └── SocialModels.cs
    └── Services/TokenService.cs
```

---

## 5. Data Model

### Entities

| Entity | Key Fields |
|--------|-----------|
| `ApplicationUser` | extends IdentityUser — DisplayName, Bio, AvatarUrl, BannerUrl, IsVerified, IsPrivate |
| `Post` | Content (280), ImageUrl, VideoUrl, ParentPostId, PostType enum, LikeCount, CommentCount, RepostCount, ViewCount, IsDeleted |
| `Comment` | Content (500), PostId, UserId, ParentCommentId (threaded), LikeCount, IsDeleted |
| `Like` | UserId, PostId?, CommentId? — unique filtered index prevents double-likes |
| `Follow` | FollowerId, FolloweeId, Status (Active / Pending / Blocked) |
| `Hashtag` | Tag (lowercase, no #), UseCount, LastUsedAt |
| `PostHashtag` | Composite PK join table — Post ↔ Hashtag many-to-many |
| `Notification` | RecipientId, ActorId, Type enum, PostId, IsRead |

### EF Core Configuration Notes
- Cascade delete: User → Posts → Comments, Likes
- `DeleteBehavior.NoAction` on self-referential FKs (Post.ParentPostId, Comment.ParentCommentId) — avoids SQL Server multiple-cascade-path error
- Unique filtered index on `Likes (UserId, PostId) WHERE PostId IS NOT NULL` — DB-level duplicate like prevention
- Unique index on `Follows (FollowerId, FolloweeId)` and `Hashtags (Tag)`

---

## 6. Authentication & Authorization

### Strategy
- ASP.NET Core Identity for user management and password hashing
- JWT Bearer tokens for stateless API auth
- Short-lived access token (60 min) + long-lived refresh token (7 days)
- Five external OAuth providers with auto-provisioning of new users

### OAuth Providers

| Provider | NuGet Package | Redirect URI |
|----------|--------------|-------------|
| Google | `Microsoft.AspNetCore.Authentication.Google` | `/api/auth/oauth/google/callback` |
| Microsoft | `Microsoft.AspNetCore.Authentication.MicrosoftAccount` | `/api/auth/oauth/microsoft/callback` |
| Facebook | `Microsoft.AspNetCore.Authentication.Facebook` | `/api/auth/oauth/facebook/callback` |
| Twitter / X | `AspNet.Security.OAuth.Twitter` | `/api/auth/oauth/twitter/callback` |
| LinkedIn | `AspNet.Security.OAuth.LinkedIn` | `/api/auth/oauth/linkedin/callback` |

### JWT Claims
`sub` (userId), `email`, `unique_name` (username), `displayName`, `isVerified`, `role`, `jti`

### Authorization Policies
| Policy | Requirement |
|--------|-------------|
| `AdminOnly` | Role = Admin |
| `Verified` | Claim `isVerified = True` |
| `UserOrAdmin` | Role = User or Admin |

### Auth Flow
```
Register / Login
  └─→ JWT (60 min) + Refresh Token

OAuth
  └─→ GET /api/auth/oauth/{provider}
       └─→ provider redirect → callback
            └─→ auto-provision user if new
                 └─→ JWT + Refresh Token

Token expired
  └─→ POST /api/auth/refresh { refreshToken }
       └─→ new JWT
```

---

## 7. API Endpoints

### Auth `/api/auth`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | Public | Email/password registration |
| POST | `/login` | Public | Returns JWT + refresh token |
| POST | `/refresh` | Public | Exchange refresh token |
| GET | `/oauth/{provider}` | Public | Initiate OAuth flow |
| GET | `/oauth/{provider}/callback` | Public | OAuth callback (auto-handled) |

### Posts `/api/posts`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/feed` | Required | Paginated personalised feed |
| GET | `/{id}` | Optional | Single post (increments view count) |
| POST | `/` | Required | Create post (hashtags auto-extracted) |
| DELETE | `/{id}` | Owner | Soft delete |
| POST | `/{id}/like` | Required | Toggle like |
| GET | `/user/{username}` | Optional | User's posts paginated |

### Users `/api/users`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/me` | Required | My full profile |
| PUT | `/me` | Required | Update profile |
| GET | `/{username}` | Optional | Public profile |
| POST | `/{username}/follow` | Required | Follow / unfollow toggle |
| GET | `/{username}/followers` | Optional | Follower list |
| GET | `/{username}/following` | Optional | Following list |
| GET | `/search?q=` | Optional | Search by name / username |

### Comments `/api/posts/{postId}/comments`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Optional | Top-level comments + reply counts |
| POST | `/` | Required | Add comment (supports threading) |
| POST | `/{commentId}/like` | Required | Toggle comment like |
| DELETE | `/{commentId}` | Owner | Soft delete |

### Trending & Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/trending/hashtags` | Top hashtags last 24h |
| GET | `/api/trending/posts` | Top posts by engagement score |
| GET | `/api/notifications` | Paginated notifications |
| GET | `/api/notifications/unread-count` | Badge count |
| PUT | `/api/notifications/mark-all-read` | Bulk mark read |

### SignalR
```
ws: /hubs/notifications?access_token=JWT
Event name: ReceiveNotification
Payload: { type, actor, postId, message }
```

---

## 8. Infrastructure & Middleware

| Component | Detail |
|-----------|--------|
| Global error handling | `ExceptionMiddleware` — maps exception types to HTTP codes, JSON response |
| Logging | Serilog — console + rolling file `logs/lifestage-YYYYMMDD.log` |
| CORS | `FrontendPolicy` — `localhost:3000`, `5173`, `7001` with credentials |
| DB retry | EF Core `EnableRetryOnFailure(3)` on transient SQL Server errors |
| Account lockout | 5 failed attempts → 15 min lockout |
| JSON serialisation | camelCase, null fields omitted |
| Swagger | JWT Bearer support, served at root `/` in Development |
| Seed | Roles (Admin, User, Moderator) created automatically on first run |

---

## 9. Local Setup Checklist

```
✅  .NET 8 SDK installed
✅  SQL Server LocalDB available (ships with Visual Studio)
✅  dotnet user-secrets set "Jwt:Secret" "<min 32 chars>"
✅  At least one OAuth provider configured (or skip for email/password only)
✅  dotnet ef migrations add InitialCreate --project src/LifeStageAPI
✅  dotnet ef database update --project src/LifeStageAPI
✅  dotnet run --project src/LifeStageAPI
     → Swagger UI at https://localhost:7001
```

---

## 10. Key Decisions & Rationale

| Decision | Rationale |
|----------|-----------|
| Name: LifeStage | "Nexus" is the Singapore Ministry of Defence community brand — avoid confusion locally |
| Warm palette (cream/terracotta) | Differentiates from cold/dark social platforms; feels human and approachable |
| Playfair Display serif | Editorial character — not another generic sans-serif tech product |
| Soft deletes (`IsDeleted`) | Preserve referential integrity; enable moderation and data recovery |
| Denormalised counts (LikeCount etc.) | Avoid expensive COUNT queries on hot read paths |
| Hashtag extraction in API layer | Consistent normalisation (lowercase, no #); client stays simple |
| SignalR over polling | Real-time notifications; scales to Azure SignalR Service trivially |
| `dotnet user-secrets` | Keeps OAuth credentials out of source control during development |
| `DeleteBehavior.NoAction` on cyclic FKs | SQL Server disallows multiple cascade paths; app-level cleanup is correct pattern |
| JWT in query string for SignalR | SignalR cannot send Authorization headers — standard workaround |

---

## 11. Suggested Next Steps

| Priority | Task |
|----------|------|
| 🔴 High | Replace mock data in `lifestage-platform.jsx` with `fetch` calls to `https://localhost:7001` |
| 🔴 High | Run EF migrations and verify schema in SQL Server Management Studio |
| 🟡 Medium | Azure Blob Storage for image/video uploads (replace `ImageUrl` string with upload endpoint) |
| 🟡 Medium | Fire SignalR events from controllers on like / follow / comment actions |
| 🟡 Medium | Redis cache for feed and trending endpoints |
| 🟡 Medium | Rate limiting (`AspNetCoreRateLimit` NuGet) |
| 🟢 Low | Email confirmation on register (SendGrid or Azure Communication Services) |
| 🟢 Low | Azure App Service + Azure SQL deployment (GitHub Actions pipeline) |
| 🟢 Low | Admin/moderation dashboard (verify users, remove posts, manage reports) |

---

*LifeStage Social Platform — Project Discussion, March 2026*
*"All the world's a stage, and all the men and women merely players." — Shakespeare*
