namespace LifeStageAPI.Models;

// ─── AiChatHistory ────────────────────────────────────────────────────────────
public class AiChatHistory
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;   // "user" or "assistant"
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public virtual ApplicationUser User { get; set; } = null!;
}

// ─── Post ────────────────────────────────────────────────────────────────────
public class Post
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string UserId { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public string? AudioUrl { get; set; }
    public string? VideoUrl { get; set; }
    public Guid? ParentPostId { get; set; }        // repost / quote
    public PostType Type { get; set; } = PostType.Original;
    public int LikeCount { get; set; } = 0;
    public int CommentCount { get; set; } = 0;
    public int RepostCount { get; set; } = 0;
    public int ViewCount { get; set; } = 0;
    public bool IsDeleted { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public virtual ApplicationUser User { get; set; } = null!;
    public virtual Post? ParentPost { get; set; }
    public virtual ICollection<Post> Reposts { get; set; } = new List<Post>();
    public virtual ICollection<Comment> Comments { get; set; } = new List<Comment>();
    public virtual ICollection<Like> Likes { get; set; } = new List<Like>();
    public virtual ICollection<PostHashtag> PostHashtags { get; set; } = new List<PostHashtag>();
}

public enum PostType { Original, Repost, Quote, Reply }

// ─── Comment ─────────────────────────────────────────────────────────────────
public class Comment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PostId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public Guid? ParentCommentId { get; set; }
    public string Content { get; set; } = string.Empty;
    public int LikeCount { get; set; } = 0;
    public bool IsDeleted { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public virtual Post Post { get; set; } = null!;
    public virtual ApplicationUser User { get; set; } = null!;
    public virtual Comment? ParentComment { get; set; }
    public virtual ICollection<Comment> Replies { get; set; } = new List<Comment>();
    public virtual ICollection<Like> Likes { get; set; } = new List<Like>();
}

// ─── Like ─────────────────────────────────────────────────────────────────────
public class Like
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string UserId { get; set; } = string.Empty;
    public Guid? PostId { get; set; }
    public Guid? CommentId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public virtual ApplicationUser User { get; set; } = null!;
    public virtual Post? Post { get; set; }
    public virtual Comment? Comment { get; set; }
}

// ─── Follow ───────────────────────────────────────────────────────────────────
public class Follow
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string FollowerId { get; set; } = string.Empty;   // who follows
    public string FolloweeId { get; set; } = string.Empty;   // who is followed
    public FollowStatus Status { get; set; } = FollowStatus.Active;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public virtual ApplicationUser Follower { get; set; } = null!;
    public virtual ApplicationUser Followee { get; set; } = null!;
}

public enum FollowStatus { Active, Pending, Blocked }

// ─── Hashtag ──────────────────────────────────────────────────────────────────
public class Hashtag
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Tag { get; set; } = string.Empty;   // lowercase, no #
    public int UseCount { get; set; } = 0;
    public DateTime LastUsedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public virtual ICollection<PostHashtag> PostHashtags { get; set; } = new List<PostHashtag>();
}

// ─── PostHashtag (join table) ─────────────────────────────────────────────────
public class PostHashtag
{
    public Guid PostId { get; set; }
    public Guid HashtagId { get; set; }

    public virtual Post Post { get; set; } = null!;
    public virtual Hashtag Hashtag { get; set; } = null!;
}

// ─── Notification ─────────────────────────────────────────────────────────────
public class Notification
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string RecipientId { get; set; } = string.Empty;
    public string? ActorId { get; set; }
    public NotificationType Type { get; set; }
    public Guid? PostId { get; set; }
    public Guid? CommentId { get; set; }
    public string? Message { get; set; }
    public bool IsRead { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public virtual ApplicationUser Recipient { get; set; } = null!;
    public virtual ApplicationUser? Actor { get; set; }
    public virtual Post? Post { get; set; }
}

public enum NotificationType { Like, Comment, Follow, Repost, Mention, System }
