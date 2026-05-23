# LifeStage — System Guide

*Architecture, Database, API Reference & Infrastructure*

Version: 1.0.0 | Confidential — Internal Use Only

---

## 1. System Overview

LifeStage is a full-stack social media platform built with a .NET 8 Web API backend and a React/Vite frontend. The name references Shakespeare's "All the world's a stage" — a platform where every life deserves its moment.

### 1.1 Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Backend API | ASP.NET Core 8 (C#) | REST API + SignalR Hub |
| Frontend | React 18 + Vite | Single Page Application |
| Database | SQL Server (EF Core 8) | Relational data store |
| Auth | ASP.NET Identity + JWT | Cookie-free, stateless auth |
| OAuth | Google, Microsoft | Social login |
| Real-time | SignalR (LongPolling) | Push notifications |
| File Storage | Azure Blob Storage | Images, videos, avatars |
| Email | Azure Communication Services | Transactional email |

### 1.2 Architecture Overview

```
React SPA (port 5173 / Azure Web App)
    |
    |-- fetch/SignalR
    v
ASP.NET Core API (port 7001 / Azure App Service)
    |
    |-- EF Core           --> SQL Server / Azure SQL
    |-- Azure SDK         --> Azure Blob Storage (media)
    |-- ACS HTTP REST     --> Azure Communication Services (email)
    |-- SignalR Hub       --> Connected clients (real-time push)
```

- React SPA communicates with the API via `fetch` and SignalR
- All business logic lives in the ASP.NET Core API
- EF Core handles all relational data persistence
- Azure Blob Storage stores uploaded media (public read, authenticated write)
- ACS sends transactional emails (confirmation, welcome, password reset)
- `NotificationHub` pushes real-time events to connected clients

---

## 2. Database Schema

SQL Server with EF Core 8 Code-First migrations. All primary keys are GUIDs. Soft deletes are used for Posts and Comments.

### 2.1 Entities

| Entity | Key Fields |
|---|---|
| ApplicationUser | Extends IdentityUser. `displayName`, `bio`, `avatarUrl`, `bannerUrl`, `website`, `location`, `isVerified`, `isPrivate`, `postCount`, `followerCount`, `followingCount`, `createdAt`, `acsUserId` |
| Post | `id`, `userId`, `content`, `imageUrl`, `videoUrl`, `type`, `parentPostId`, `likeCount`, `commentCount`, `repostCount`, `viewCount`, `isDeleted`, `createdAt` |
| Comment | `id`, `postId`, `userId`, `content`, `parentCommentId`, `likeCount`, `isDeleted`, `createdAt` |
| Like | `id`, `userId`, `postId?`, `commentId?` — unique filtered index prevents duplicates |
| Follow | `id`, `followerId`, `followeeId`, `status` (Active/Pending), `createdAt` |
| Hashtag | `id`, `tag` (lowercase, no #), `useCount`, `lastUsedAt` |
| PostHashtag | Pivot — `postId` + `hashtagId` |
| Notification | `id`, `recipientId`, `actorId`, `type` (Like/Comment/Follow/Repost/Mention), `postId?`, `message`, `isRead`, `createdAt` |

### 2.2 Key Design Decisions

- **Soft deletes** on Post and Comment — `IsDeleted` flag preserves referential integrity
- **Denormalized counts** (`LikeCount`, `CommentCount` etc.) — avoids expensive `COUNT(*)` on hot paths
- **Unique filtered indexes** on Like table — prevent duplicate likes at the database level
- **`DeleteBehavior.NoAction`** on cyclic foreign keys — resolves SQL Server multiple cascade path error
- **Hashtag extraction in API** — consistent lowercase normalization, no `#` prefix stored
- **Follow status** (Active/Pending) — supports private accounts with pending follow requests
- **`AcsUserId`** on ApplicationUser — stores Azure Communication Services identity for chat

---

## 3. API Reference

Base URL: `https://lifestage-cbfgh8b6ercddmd6.canadacentral-01.azurewebsites.net/api`

All authenticated endpoints require: `Authorization: Bearer {token}`

### 3.1 All Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register new user, sends confirmation email |
| POST | `/api/auth/login` | Public | Login with email + password, returns JWT |
| GET | `/api/auth/confirm-email` | Public | Confirm email via token link |
| POST | `/api/auth/resend-confirmation` | Public | Resend email confirmation link |
| POST | `/api/auth/forgot-password` | Public | Send password reset email |
| POST | `/api/auth/reset-password` | Public | Reset password with token |
| GET | `/api/auth/oauth/{provider}` | Public | Initiate OAuth login (Google/Microsoft) |
| GET | `/api/auth/oauth/{provider}/callback` | Public | OAuth callback handler |
| GET | `/api/posts/feed` | Auth | Get paginated feed (followed users + self) |
| POST | `/api/posts` | Auth | Create new post (text + optional image URL) |
| GET | `/api/posts/{id}` | Public | Get single post by ID |
| DELETE | `/api/posts/{id}` | Auth (Owner) | Soft-delete a post |
| POST | `/api/posts/{id}/like` | Auth | Toggle like on a post |
| GET | `/api/posts/user/{username}` | Public | Get paginated posts by username |
| GET | `/api/users/me` | Auth | Get current user profile |
| PUT | `/api/users/me` | Auth | Update profile (name, bio, website, location, avatar) |
| GET | `/api/users/{username}` | Public | Get user profile by username |
| POST | `/api/users/{username}/follow` | Auth | Toggle follow/unfollow |
| GET | `/api/users/{username}/followers` | Public | Get user followers list |
| GET | `/api/users/{username}/following` | Public | Get user following list |
| GET | `/api/users/search?q=` | Public | Search users by name or username |
| POST | `/api/upload` | Auth | Upload image/video to Azure Blob Storage |
| POST | `/api/upload/avatar` | Auth | Upload avatar image (5MB limit) |
| GET | `/api/notifications` | Auth | Get paginated notifications |
| GET | `/api/notifications/unread-count` | Auth | Get unread notification count |
| PUT | `/api/notifications/mark-all-read` | Auth | Mark all notifications as read |
| POST | `/api/messages/token` | Auth | Get ACS token for chat client |
| GET | `/api/messages/participants` | Auth | Search participants for chat |

### 3.2 Pagination

All list endpoints support `?page=1&pageSize=20`. Responses include:

- `items` — array of results for current page
- `totalCount` — total record count
- `page` — current page
- `pageSize` — records per page
- `hasNextPage` — boolean, true if more pages exist

### 3.3 Error Responses

All errors return: `{ message: string, errors?: string[] }`

| Status | Meaning |
|---|---|
| 400 | Validation errors or business rule violations |
| 401 | Missing or invalid JWT token |
| 403 | Authenticated but not authorized (e.g. deleting another user's post) |
| 404 | Resource does not exist |
| 409 | Duplicate email or username on registration |
| 423 | Account locked after repeated failed login attempts |

---

## 4. Authentication Flows

### 4.1 Standard Registration Flow

1. User submits `POST /api/auth/register` with `userName`, `email`, `password`, `displayName`
2. API creates user via ASP.NET Identity, generates email confirmation token
3. Confirmation email sent via ACS (fire-and-forget)
4. JWT returned immediately — user can use the app with unconfirmed email
5. User clicks link in email → `GET /api/auth/confirm-email?userId=&token=`
6. Email confirmed → welcome email sent → new JWT returned

### 4.2 OAuth Login Flow

1. User clicks provider button → `GET /api/auth/oauth/{provider}` (Google or Microsoft)
2. Redirect to provider consent screen
3. Provider redirects to `/api/auth/oauth/{provider}/callback` with auth code
4. API exchanges code for user info, creates or finds existing user
5. For new OAuth users: account created, `EmailConfirmed=true` (provider verified email)
6. Welcome email sent for new OAuth users
7. JWT returned via redirect to frontend: `{frontendUrl}?token={jwt}`

### 4.3 JWT Token

- Algorithm: HMAC-SHA256 (HS256)
- Expiry: 7 days (configurable via `Jwt:ExpiryDays`)
- Claims: `sub` (userId), `email`, `name`, `role`
- Secret: minimum 48 bytes, stored in user-secrets (dev) or Azure App Settings (prod)
- Frontend storage: `ls_token` and `ls_user` in localStorage

---

## 5. Real-time Notifications (SignalR)

Hub endpoint: `/hubs/notifications` — requires JWT authentication.

### 5.1 Hub Events

| Event | Direction | Description |
|---|---|---|
| `ReceiveNotification` | Server → Client | Fires on: like, follow, comment, repost, mention |
| `OnConnectedAsync` | Client → Server | Auto-adds client to userId group |
| `OnDisconnectedAsync` | Client → Server | Removes from group on disconnect |

### 5.2 Notification Types

| Type | Trigger |
|---|---|
| Like | Someone liked your post |
| Comment | Someone commented on your post |
| Follow | Someone followed you |
| Repost | Someone reposted your post |
| Mention | Someone mentioned you in a post |

### 5.3 Transport

SignalR uses **LongPolling** transport (required for Azure SignalR Service proxy compatibility).

Automatic reconnect with exponential backoff: 0s, 2s, 5s, 10s, 30s.

Each user joins a SignalR group named after their `userId` for targeted delivery.

---

## 6. Azure Services

### 6.1 Service Summary

| Service | Purpose | Notes |
|---|---|---|
| Azure Blob Storage | Post images, avatars, banners | 3 containers: `posts/`, `avatars/`, `banners/` — public read |
| Azure Communication Services | Email + ACS Chat identity | Confirmation, welcome, password reset; also issues ACS tokens |
| Azure SQL | Relational data store | All entities via EF Core 8 with migrations |
| Azure App Service | API hosting | Windows plan, .NET 8 runtime |
| Azure App Service | Frontend hosting | Linux plan, pre-built dist deployment |
| Azure SignalR Service | WebSocket scaling | Connected via `Azure__SignalR__ConnectionString` |

### 6.2 Blob Storage Configuration

| Container | Purpose | Limits |
|---|---|---|
| `posts` | Post images and videos | 100MB video, 10MB image |
| `avatars` | Profile pictures | 5MB, images only |
| `banners` | Profile cover images | — |

All containers: public read access, authenticated write via API.

Blob naming: `yyyy/MM/dd/{guid}.{ext}` — avoids naming conflicts.

### 6.3 ACS Email

- **Confirmation email** — sent on registration, 24-hour expiry link
- **Welcome email** — sent after email confirmation or first OAuth login
- **Password reset email** — sent on forgot-password request, 1-hour expiry link
- All emails: HTML branded template with LifeStage styling
- Sending is fire-and-forget — email failure does not block registration

### 6.4 Required Configuration

| Key | Purpose |
|---|---|
| `Azure:StorageConnectionString` | Blob Storage connection string |
| `Azure:EmailConnectionString` | ACS connection string (email + chat identity) |
| `Azure:EmailFrom` | Verified sender address |
| `Jwt:Secret` | Min 48-byte base64 secret |
| `App:FrontendUrl` | Frontend base URL |
| `App:BaseUrl` | API base URL for email links |
