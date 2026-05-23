using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LifeStageAPI.Data;
using LifeStageAPI.DTOs;
using LifeStageAPI.Models;

namespace LifeStageAPI.Controllers;

// ═══════════════════════════════════════════════════════════════════════════════
// COMMENTS CONTROLLER
// ═══════════════════════════════════════════════════════════════════════════════
[ApiController]
[Route("api/posts/{postId:guid}/comments")]
[Authorize]
public class CommentsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    public CommentsController(ApplicationDbContext db) => _db = db;

    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    // GET /api/posts/{postId}/comments
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<List<CommentDto>>> GetComments(Guid postId)
    {
        var comments = await _db.Comments
            .Where(c => c.PostId == postId && c.ParentCommentId == null && !c.IsDeleted)
            .Include(c => c.User)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        var commentIds = comments.Select(c => c.Id).ToHashSet();
        
        var likedIds = User.Identity?.IsAuthenticated == true
     ? (await _db.Likes
     .Where(l => l.UserId == CurrentUserId && l.CommentId != null && commentIds.Contains(l.CommentId.Value))
   .Select(l => l.CommentId!.Value)
         .ToListAsync()).ToHashSet()
            : new HashSet<Guid>();

        var replyCountMap = await _db.Comments
            .Where(c => c.PostId == postId && c.ParentCommentId != null && !c.IsDeleted)
            .GroupBy(c => c.ParentCommentId!.Value)
            .Select(g => new { Id = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Id, x => x.Count);

        return Ok(comments.Select(c => MapComment(c, likedIds, replyCountMap)));
    }

    // POST /api/posts/{postId}/comments
    [HttpPost]
    public async Task<ActionResult<CommentDto>> CreateComment(Guid postId, [FromBody] CreateCommentRequest req)
    {
        var post = await _db.Posts.FindAsync(postId);
        if (post == null || post.IsDeleted) return NotFound();

        var comment = new Comment
        {
            PostId = postId,
            UserId = CurrentUserId,
            Content = req.Content,
            ParentCommentId = req.ParentCommentId,
        };

        _db.Comments.Add(comment);
        post.CommentCount++;
        await _db.SaveChangesAsync();

        await _db.Entry(comment).Reference(c => c.User).LoadAsync();
        return CreatedAtAction(nameof(GetComments), new { postId },
            MapComment(comment, new HashSet<Guid>(), new Dictionary<Guid, int>()));
    }

    // POST /api/posts/{postId}/comments/{commentId}/like
    [HttpPost("{commentId:guid}/like")]
    public async Task<IActionResult> LikeComment(Guid postId, Guid commentId)
    {
        var comment = await _db.Comments.FindAsync(commentId);
        if (comment == null || comment.PostId != postId) return NotFound();

        var existing = await _db.Likes
            .FirstOrDefaultAsync(l => l.UserId == CurrentUserId && l.CommentId == commentId);

        if (existing != null)
        {
            _db.Likes.Remove(existing);
            comment.LikeCount = Math.Max(0, comment.LikeCount - 1);
            await _db.SaveChangesAsync();
            return Ok(new { liked = false, likeCount = comment.LikeCount });
        }

        _db.Likes.Add(new Like { UserId = CurrentUserId, CommentId = commentId });
        comment.LikeCount++;
        await _db.SaveChangesAsync();
        return Ok(new { liked = true, likeCount = comment.LikeCount });
    }

    // DELETE /api/posts/{postId}/comments/{commentId}
    [HttpDelete("{commentId:guid}")]
    public async Task<IActionResult> DeleteComment(Guid postId, Guid commentId)
    {
        var comment = await _db.Comments.FindAsync(commentId);
        if (comment == null || comment.PostId != postId) return NotFound();
        if (comment.UserId != CurrentUserId) return Forbid();

        comment.IsDeleted = true;
        var post = await _db.Posts.FindAsync(postId);
        if (post != null) post.CommentCount = Math.Max(0, post.CommentCount - 1);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private static CommentDto MapComment(Comment c, HashSet<Guid> likedIds, Dictionary<Guid, int> replyCounts) => new(
        c.Id,
        new UserDto(c.User.Id, c.User.UserName ?? "", c.User.DisplayName, c.User.AvatarUrl, c.User.Bio, c.User.IsVerified, 0, 0, false),
        c.Content, c.LikeCount, likedIds.Contains(c.Id),
        replyCounts.GetValueOrDefault(c.Id, 0),
        c.CreatedAt
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRENDING CONTROLLER
// ═══════════════════════════════════════════════════════════════════════════════
[ApiController]
[Route("api/[controller]")]
public class TrendingController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    public TrendingController(ApplicationDbContext db) => _db = db;

    // GET /api/trending/hashtags
    [HttpGet("hashtags")]
    public async Task<ActionResult<List<TrendingHashtagDto>>> GetTrendingHashtags([FromQuery] int limit = 10)
    {
        var since = DateTime.UtcNow.AddHours(-24);
        var trending = await _db.Hashtags
            .Where(h => h.LastUsedAt >= since)
            .OrderByDescending(h => h.UseCount)
            .Take(Math.Clamp(limit, 1, 50))
            .Select(h => new TrendingHashtagDto("#" + h.Tag, h.UseCount, "Technology"))
            .ToListAsync();

        return Ok(trending);
    }

    // GET /api/trending/posts
    [HttpGet("posts")]
    public async Task<ActionResult> GetTrendingPosts([FromQuery] int limit = 20)
    {
        var since = DateTime.UtcNow.AddHours(-24);
        var posts = await _db.Posts
            .Where(p => !p.IsDeleted && p.CreatedAt >= since)
            .OrderByDescending(p => p.LikeCount + p.RepostCount * 2 + p.CommentCount)
            .Take(Math.Clamp(limit, 1, 50))
            .Include(p => p.User)
            .Select(p => new
            {
                p.Id, p.Content, p.LikeCount, p.CommentCount, p.RepostCount,
                Author = new { p.User.UserName, p.User.DisplayName, p.User.AvatarUrl, p.User.IsVerified },
                p.CreatedAt
            })
            .ToListAsync();

        return Ok(posts);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS CONTROLLER
// ═══════════════════════════════════════════════════════════════════════════════
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    public NotificationsController(ApplicationDbContext db) => _db = db;

    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    // GET /api/notifications
    [HttpGet]
    public async Task<ActionResult<List<NotificationDto>>> GetNotifications(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 30)
    {
        var notifications = await _db.Notifications
            .Where(n => n.RecipientId == CurrentUserId)
            .OrderByDescending(n => n.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Include(n => n.Actor)
            .ToListAsync();

        return Ok(notifications.Select(n => new NotificationDto(
            n.Id, n.Type.ToString(),
            n.Actor == null ? null : new UserDto(n.Actor.Id, n.Actor.UserName ?? "",
                n.Actor.DisplayName, n.Actor.AvatarUrl, null, n.Actor.IsVerified, 0, 0, false),
            n.PostId, n.Message, n.IsRead, n.CreatedAt
        )));
    }

    // GET /api/notifications/unread-count
    [HttpGet("unread-count")]
    public async Task<ActionResult<int>> GetUnreadCount() =>
        Ok(await _db.Notifications.CountAsync(n => n.RecipientId == CurrentUserId && !n.IsRead));

    // PUT /api/notifications/mark-all-read
    [HttpPut("mark-all-read")]
    public async Task<IActionResult> MarkAllRead()
    {
        await _db.Notifications
            .Where(n => n.RecipientId == CurrentUserId && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));
        return NoContent();
    }
}
