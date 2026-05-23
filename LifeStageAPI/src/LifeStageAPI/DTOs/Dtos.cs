using System.ComponentModel.DataAnnotations;

namespace LifeStageAPI.DTOs;

// ── ACS Messages ──────────────────────────────────────────────────────────────

public record AcsTokenResponse(
    string AcsUserId,
    string Token,
    DateTimeOffset ExpiresOn,
    string Endpoint,
    string DisplayName
);

public record AcsParticipantDto(
    string Id,
    string UserName,
    string DisplayName,
    string? AvatarUrl,
    string AcsUserId
);

public record AiChatRequest(string UserMessage);

// ── Auth ──────────────────────────────────────────────────────────────────────

public record RegisterRequest(
    [Required][EmailAddress] string Email,
    [Required][MinLength(3)][MaxLength(30)] string UserName,
    [Required][MinLength(2)][MaxLength(100)] string DisplayName,
    [Required][MinLength(8)] string Password
);

public record LoginRequest(
    [Required][EmailAddress] string Email,
    [Required] string Password
);

public record AuthResponse(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAt,
    UserDto User,
    bool EmailConfirmed = false,
    string? Email = null
);

public record RefreshTokenRequest([Required] string RefreshToken);

public record OAuthCallbackRequest(string Provider, string Code, string? State);

public record ResendConfirmationRequest([Required][EmailAddress] string Email);

public record ForgotPasswordRequest([Required][EmailAddress] string Email);

public record ResetPasswordRequest(
    [Required] string UserId,
    [Required] string Token,
    [Required][MinLength(8)] string NewPassword
);

// ── User ──────────────────────────────────────────────────────────────────────

public record UserDto(
    string Id,
    string UserName,
    string DisplayName,
    string? AvatarUrl,
    string? Bio,
    bool IsVerified,
    int FollowerCount,
    int FollowingCount,
    bool IsFollowedByMe
);

public record UserProfileDto(
    string Id,
    string UserName,
    string DisplayName,
    string? AvatarUrl,
    string? BannerUrl,
    string? Bio,
    string? Website,
    string? Location,
    bool IsVerified,
    bool IsPrivate,
    int FollowerCount,
    int FollowingCount,
    int PostCount,
    bool IsFollowedByMe,
    DateTime CreatedAt,
    string? Email = null,
    bool EmailConfirmed = false
);

public record UpdateProfileRequest(
    [MaxLength(100)] string? DisplayName,
    [MaxLength(500)] string? Bio,
    [MaxLength(200)] string? Website,
    [MaxLength(100)] string? Location,
    string? AvatarUrl,
    string? BannerUrl,
    bool? IsPrivate
);

// ── Post ──────────────────────────────────────────────────────────────────────

public record CreatePostRequest(
    [Required][MaxLength(280)] string Content,
    string? ImageUrl,
    string? AudioUrl,
    string? VideoUrl,
    Guid? ParentPostId
);

public record UpdatePostRequest(
    [Required][MaxLength(280)] string Content,
    string? ImageUrl,
    string? AudioUrl,
    string? VideoUrl
);

public record PostDto(
    Guid Id,
    UserDto Author,
    string Content,
    string? ImageUrl,
    string? AudioUrl,
    string? VideoUrl,
    int LikeCount,
    int CommentCount,
    int RepostCount,
    int ViewCount,
    bool IsLikedByMe,
    bool IsRepostedByMe,
    string PostType,
    PostDto? ParentPost,
    List<string> Hashtags,
    DateTime CreatedAt
);

public record PostFeedRequest(
    int Page = 1,
    int PageSize = 20,
    string? Cursor = null
);

public record PagedResult<T>(
    List<T> Items,
    int TotalCount,
    int Page,
    int PageSize,
    bool HasNextPage,
    string? NextCursor
);

// ── Comment ───────────────────────────────────────────────────────────────────

public record CreateCommentRequest(
    [Required][MaxLength(500)] string Content,
    Guid? ParentCommentId
);

public record CommentDto(
    Guid Id,
    UserDto Author,
    string Content,
    int LikeCount,
    bool IsLikedByMe,
    int ReplyCount,
    DateTime CreatedAt
);

// ── Notification ──────────────────────────────────────────────────────────────

public record NotificationDto(
    Guid Id,
    string Type,
    UserDto? Actor,
    Guid? PostId,
    string? Message,
    bool IsRead,
    DateTime CreatedAt
);

// ── Trending ──────────────────────────────────────────────────────────────────

public record TrendingHashtagDto(
    string Tag,
    int PostCount,
    string Category
);
