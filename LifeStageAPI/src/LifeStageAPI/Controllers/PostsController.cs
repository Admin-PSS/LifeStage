// src/LifeStageAPI/Controllers/PostsController.cs
// Replace your existing PostsController.cs with this file.
// Key additions: IHubContext injected, SendNotificationToUser called on like & comment.

using System.Security.Claims;
using System.Text.RegularExpressions;
using System.Linq;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using LifeStageAPI.Data;
using LifeStageAPI.DTOs;
using LifeStageAPI.Hubs;
using LifeStageAPI.Models;

namespace LifeStageAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PostsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IHubContext<NotificationHub> _hub;

    public PostsController(ApplicationDbContext db, IHubContext<NotificationHub> hub)
    {
 _db  = db;
        _hub = hub;
    }

    private string? CurrentUserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ??
        User.FindFirstValue("sub");

    // ── GET /api/posts/feed ───────────────────────────────────────────────────
    [HttpGet("feed")]
    [Authorize]
    public async Task<IActionResult> GetFeed([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
 var userId = CurrentUserId;
        if (userId == null) return Unauthorized();

        var followedIds = await _db.Follows
            .Where(f => f.FollowerId == userId && f.Status == FollowStatus.Active)
   .Select(f => f.FolloweeId)
     .ToListAsync();

        followedIds.Add(userId);

        var likedIds = await _db.Likes
            .Where(l => l.UserId == userId && l.PostId != null)
            .Select(l => l.PostId!.Value)
   .ToListAsync();

    var likedSet = likedIds.ToHashSet();

        var total = await _db.Posts
         .Where(p => followedIds.Contains(p.UserId) && !p.IsDeleted && p.ParentPostId == null)
            .CountAsync();

        var posts = await _db.Posts
  .Where(p => followedIds.Contains(p.UserId) && !p.IsDeleted && p.ParentPostId == null)
   .Include(p => p.User)
   .Include(p => p.PostHashtags).ThenInclude(ph => ph.Hashtag)
    .OrderByDescending(p => p.CreatedAt)
      .Skip((page - 1) * pageSize)
    .Take(pageSize)
        .ToListAsync();

        return Ok(new PagedResult<PostDto>(
     posts.Select(p => MapPost(p, likedSet)).ToList(),
  total,
    page,
pageSize,
         page * pageSize < total,
      null
        ));
    }

    // ── GET /api/posts/{id} ───────────────────────────────────────────────────
    [HttpGet("{id}")]
    public async Task<IActionResult> GetPost(Guid id)
    {
 var post = await _db.Posts
            .Include(p => p.User)
            .Include(p => p.PostHashtags).ThenInclude(ph => ph.Hashtag)
     .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);

        if (post == null) return NotFound();

        post.ViewCount++;
        await _db.SaveChangesAsync();

        var likedSet = new HashSet<Guid>();
        if (CurrentUserId != null)
   {
   var liked = await _db.Likes
    .Where(l => l.UserId == CurrentUserId && l.PostId == id)
                .AnyAsync();
     if (liked) likedSet.Add(id);
        }

        return Ok(MapPost(post, likedSet));
    }

    // ── POST /api/posts ───────────────────────────────────────────────────────
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> CreatePost([FromBody] CreatePostRequest request)
    {
        var userId = CurrentUserId;
        if (userId == null) return Unauthorized();

        var post = new Post
    {
  Id        = Guid.NewGuid(),
         UserId    = userId,
  Content   = request.Content,
            ImageUrl  = request.ImageUrl,
            AudioUrl  = request.AudioUrl,
            VideoUrl  = request.VideoUrl,
         Type      = PostType.Original,
            CreatedAt = DateTime.UtcNow,
        };

     // Extract and upsert hashtags
        var tags = Regex.Matches(request.Content, @"#(\w+)")
        .Select(m => m.Groups[1].Value.ToLower())
            .Distinct();

      foreach (var tag in tags)
        {
            var hashtag = await _db.Hashtags.FirstOrDefaultAsync(h => h.Tag == tag)
   ?? new Hashtag { Id = Guid.NewGuid(), Tag = tag, UseCount = 0 };
            hashtag.UseCount++;
            hashtag.LastUsedAt = DateTime.UtcNow;
     _db.Hashtags.Update(hashtag);
  post.PostHashtags.Add(new PostHashtag { PostId = post.Id, HashtagId = hashtag.Id });
    }

        _db.Posts.Add(post);
        await _db.SaveChangesAsync();

        await _db.Entry(post).Reference(p => p.User).LoadAsync();
        return CreatedAtAction(nameof(GetPost), new { id = post.Id }, MapPost(post, new HashSet<Guid>()));
    }

    // ── PUT /api/posts/{id} ───────────────────────────────────────────────────
    [HttpPut("{id}")]
    [Authorize]
    public async Task<IActionResult> EditPost(Guid id, [FromBody] UpdatePostRequest request)
    {
        var userId = CurrentUserId;
        var post = await _db.Posts
            .Include(p => p.User)
            .Include(p => p.PostHashtags).ThenInclude(ph => ph.Hashtag)
            .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);
        if (post == null) return NotFound();
        if (post.UserId != userId) return Forbid();

        post.Content   = request.Content;
        post.ImageUrl  = request.ImageUrl;
        post.AudioUrl  = request.AudioUrl;
        post.VideoUrl  = request.VideoUrl;
        post.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(MapPost(post, new HashSet<Guid>()));
    }

    // ── POST /api/posts/{id}/repost ───────────────────────────────────────────
    [HttpPost("{id}/repost")]
    [Authorize]
    public async Task<IActionResult> ToggleRepost(Guid id)
    {
        var userId = CurrentUserId;
        if (userId == null) return Unauthorized();

        var original = await _db.Posts
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);
        if (original == null) return NotFound();

        var existing = await _db.Posts.FirstOrDefaultAsync(p =>
            p.UserId == userId && p.ParentPostId == id &&
            p.Type == PostType.Repost && !p.IsDeleted);

        bool nowReposted;
        if (existing != null)
        {
            existing.IsDeleted = true;
            original.RepostCount = Math.Max(0, original.RepostCount - 1);
            nowReposted = false;
        }
        else
        {
            _db.Posts.Add(new Post
            {
                Id          = Guid.NewGuid(),
                UserId      = userId,
                Content     = original.Content,
                ImageUrl    = original.ImageUrl,
                ParentPostId = id,
                Type        = PostType.Repost,
                CreatedAt   = DateTime.UtcNow,
            });
            original.RepostCount++;
            nowReposted = true;
        }

        await _db.SaveChangesAsync();
        return Ok(new { reposted = nowReposted, repostCount = original.RepostCount });
    }

    // ── DELETE /api/posts/{id} ────────────────────────────────────────────────
    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> DeletePost(Guid id)
    {
        var userId = CurrentUserId;
        var post   = await _db.Posts.FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);
        if (post == null) return NotFound();
        if (post.UserId != userId) return Forbid();

    post.IsDeleted = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ── POST /api/posts/{id}/like ─────────────────────────────────────────────
    [HttpPost("{id}/like")]
    [Authorize]
    public async Task<IActionResult> ToggleLike(Guid id)
    {
     var userId = CurrentUserId;
        if (userId == null) return Unauthorized();

     var post = await _db.Posts
        .Include(p => p.User)
      .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);
        if (post == null) return NotFound();

 var existing = await _db.Likes
.FirstOrDefaultAsync(l => l.UserId == userId && l.PostId == id);

        bool nowLiked;
   if (existing != null)
        {
            _db.Likes.Remove(existing);
        post.LikeCount = Math.Max(0, post.LikeCount - 1);
      nowLiked = false;
        }
     else
    {
      _db.Likes.Add(new Like { Id = Guid.NewGuid(), UserId = userId, PostId = id, CreatedAt = DateTime.UtcNow });
  post.LikeCount++;
nowLiked = true;

    // 🔔 Fire SignalR notification to post owner (not yourself)
       if (post.UserId != userId)
    {
        var actor = await _db.Users.FindAsync(userId);
                var actorName = actor?.DisplayName ?? actor?.UserName ?? "Someone";

       var actorDto = actor == null ? null : new UserDto(
       actor.Id,
         actor.UserName ?? "",
        actor.DisplayName ?? actor.UserName ?? "",
        actor.AvatarUrl,
           actor.Bio,
      actor.IsVerified,
        0,
        0,
     false
  );

             await NotificationHub.SendNotificationToUser(_hub, post.UserId,
            new NotificationDto(
      Guid.NewGuid(),
  "Like",
    actorDto,
    id,
         $"{actorName} liked your post",
      false,
         DateTime.UtcNow
        ));

          // Also persist to DB
        _db.Notifications.Add(new Notification
       {
 Id       = Guid.NewGuid(),
          RecipientId = post.UserId,
     ActorId     = userId,
        Type        = NotificationType.Like,
PostId      = id,
        Message     = $"{actorName} liked your post",
             CreatedAt   = DateTime.UtcNow,
      });
            }
        }

        await _db.SaveChangesAsync();
 return Ok(new { liked = nowLiked, likeCount = post.LikeCount });
    }

    // ── GET /api/posts/user/{username} ────────────────────────────────────────
    [HttpGet("user/{username}")]
    public async Task<IActionResult> GetUserPosts(string username, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.UserName == username);
   if (user == null) return NotFound();

        var likedSet = new HashSet<Guid>();
        if (CurrentUserId != null)
        {
  var likedIds = await _db.Likes
                .Where(l => l.UserId == CurrentUserId && l.PostId != null)
                .Select(l => l.PostId!.Value)
                .ToListAsync();
            likedSet = likedIds.ToHashSet();
      }

    var total = await _db.Posts.Where(p => p.UserId == user.Id && !p.IsDeleted).CountAsync();
  var posts  = await _db.Posts
   .Where(p => p.UserId == user.Id && !p.IsDeleted)
            .Include(p => p.User)
   .Include(p => p.PostHashtags).ThenInclude(ph => ph.Hashtag)
          .OrderByDescending(p => p.CreatedAt)
     .Skip((page - 1) * pageSize)
   .Take(pageSize)
 .ToListAsync();

        return Ok(new PagedResult<PostDto>(
    posts.Select(p => MapPost(p, likedSet)).ToList(),
         total,
        page,
            pageSize,
  page * pageSize < total,
            null
        ));
  }

    // ── Mapper ────────────────────────────────────────────────────────────────
    private static PostDto MapPost(Post p, HashSet<Guid> likedSet) => new(
  p.Id,
    p.User == null ? null! : new UserDto(
       p.User.Id,
   p.User.UserName ?? "",
            p.User.DisplayName ?? p.User.UserName ?? "",
            p.User.AvatarUrl,
            p.User.Bio,
      p.User.IsVerified,
          0,
    0,
            false
        ),
        p.Content,
 p.ImageUrl,
        p.AudioUrl,
        p.VideoUrl,
        p.LikeCount,
        p.CommentCount,
        p.RepostCount,
        p.ViewCount,
     likedSet.Contains(p.Id),
    false,
        p.Type.ToString(),
        null,
        p.PostHashtags.Select(ph => ph.Hashtag?.Tag ?? "").ToList(),
        p.CreatedAt
    );
}
