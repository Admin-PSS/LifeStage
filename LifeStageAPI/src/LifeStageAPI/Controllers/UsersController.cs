// src/LifeStageAPI/Controllers/UsersController.cs
// Replace your existing UsersController.cs with this file.
// Key addition: SignalR notification fired on follow.

using System.Security.Claims;
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
public class UsersController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IHubContext<NotificationHub> _hub;

    public UsersController(ApplicationDbContext db, IHubContext<NotificationHub> hub)
    {
        _db  = db;
        _hub = hub;
    }

    private string? CurrentUserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ??
        User.FindFirstValue("sub");

    // ── GET /api/users/me ─────────────────────────────────────────────────────
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetMe()
    {
        var userId = CurrentUserId;
     if (userId == null) return Unauthorized();

        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound();

        return Ok(MapProfile(user,
         followerCount:  await _db.Follows.CountAsync(f => f.FolloweeId == userId && f.Status == FollowStatus.Active),
       followingCount: await _db.Follows.CountAsync(f => f.FollowerId == userId && f.Status == FollowStatus.Active),
     postCount:    await _db.Posts.CountAsync(p => p.UserId == userId && !p.IsDeleted),
            isFollowedByMe: false));
    }

    // ── PUT /api/users/me ─────────────────────────────────────────────────────
    [HttpPut("me")]
    [Authorize]
    public async Task<IActionResult> UpdateMe([FromBody] UpdateProfileRequest request)
    {
     var userId = CurrentUserId;
  if (userId == null) return Unauthorized();

  var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound();

    user.DisplayName = request.DisplayName ?? user.DisplayName;
        user.Bio       = request.Bio       ?? user.Bio;
      user.Website     = request.Website     ?? user.Website;
    user.Location= request.Location    ?? user.Location;
      user.AvatarUrl   = request.AvatarUrl   ?? user.AvatarUrl;
     user.BannerUrl   = request.BannerUrl   ?? user.BannerUrl;
        if (request.IsPrivate.HasValue)
            user.IsPrivate = request.IsPrivate.Value;

        await _db.SaveChangesAsync();

        return Ok(MapProfile(user,
      followerCount:  await _db.Follows.CountAsync(f => f.FolloweeId == userId && f.Status == FollowStatus.Active),
   followingCount: await _db.Follows.CountAsync(f => f.FollowerId == userId && f.Status == FollowStatus.Active),
         postCount:    await _db.Posts.CountAsync(p => p.UserId == userId && !p.IsDeleted)));
    }

    // ── GET /api/users/{username} ─────────────────────────────────────────────
    [HttpGet("{username}")]
    public async Task<IActionResult> GetProfile(string username)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.UserName == username);
        if (user == null) return NotFound();

        bool isFollowing = false;
        if (CurrentUserId != null)
            isFollowing = await _db.Follows.AnyAsync(f => f.FollowerId == CurrentUserId && f.FolloweeId == user.Id && f.Status == FollowStatus.Active);

        var profile = MapProfile(user,
            followerCount:  await _db.Follows.CountAsync(f => f.FolloweeId == user.Id && f.Status == FollowStatus.Active),
            followingCount: await _db.Follows.CountAsync(f => f.FollowerId == user.Id && f.Status == FollowStatus.Active),
            postCount:      await _db.Posts.CountAsync(p => p.UserId == user.Id && !p.IsDeleted),
            isFollowedByMe: isFollowing);

        return Ok(profile);
    }

    // ── POST /api/users/{username}/follow ─────────────────────────────────────
    [HttpPost("{username}/follow")]
    [Authorize]
    public async Task<IActionResult> ToggleFollow(string username)
    {
        var userId = CurrentUserId;
        if (userId == null) return Unauthorized();

        var target = await _db.Users.FirstOrDefaultAsync(u => u.UserName == username);
        if (target == null) return NotFound();
        if (target.Id == userId) return BadRequest(new { message = "You cannot follow yourself." });

        var existing = await _db.Follows
            .FirstOrDefaultAsync(f => f.FollowerId == userId && f.FolloweeId == target.Id);

        bool nowFollowing;
        if (existing != null)
        {
            _db.Follows.Remove(existing);
            nowFollowing = false;
        }
        else
        {
            var status = target.IsPrivate ? FollowStatus.Pending : FollowStatus.Active;
            _db.Follows.Add(new Follow
            {
                Id         = Guid.NewGuid(),
                FollowerId = userId,
                FolloweeId = target.Id,
                Status     = status,
                CreatedAt  = DateTime.UtcNow,
            });
            nowFollowing = true;

            // 🔔 Fire SignalR notification to the person being followed
            var actor     = await _db.Users.FindAsync(userId);
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

            await NotificationHub.SendNotificationToUser(_hub, target.Id,
                new NotificationDto(
                    Guid.NewGuid(),
                    "Follow",
                    actorDto,
                    null,
                    $"{actorName} started following you",
                    false,
                    DateTime.UtcNow
                ));

            // Persist notification
            _db.Notifications.Add(new Notification
            {
                Id          = Guid.NewGuid(),
                RecipientId = target.Id,
                ActorId     = userId,
                Type        = NotificationType.Follow,
                Message     = $"{actorName} started following you",
                CreatedAt   = DateTime.UtcNow,
            });
        }

        await _db.SaveChangesAsync();

        var followerCount = await _db.Follows.CountAsync(f => f.FolloweeId == target.Id && f.Status == FollowStatus.Active);
        return Ok(new { following = nowFollowing, followerCount });
    }

    // ── GET /api/users/{username}/followers ───────────────────────────────────
    [HttpGet("{username}/followers")]
    public async Task<IActionResult> GetFollowers(string username, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.UserName == username);
        if (user == null) return NotFound();

  var followers = await _db.Follows
   .Where(f => f.FolloweeId == user.Id && f.Status == FollowStatus.Active)
       .Include(f => f.Follower)
    .Skip((page - 1) * pageSize).Take(pageSize)
         .Select(f => new UserDto(
    f.Follower!.Id,
    f.Follower.UserName ?? "",
      f.Follower.DisplayName ?? f.Follower.UserName ?? "",
    f.Follower.AvatarUrl,
         f.Follower.Bio,
     f.Follower.IsVerified,
       0,
      0,
     false
     ))
  .ToListAsync();

    return Ok(followers);
    }

    // ── GET /api/users/{username}/following ───────────────────────────────────
    [HttpGet("{username}/following")]
    public async Task<IActionResult> GetFollowing(string username, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.UserName == username);
        if (user == null) return NotFound();

 var following = await _db.Follows
    .Where(f => f.FollowerId == user.Id && f.Status == FollowStatus.Active)
  .Include(f => f.Followee)
   .Skip((page - 1) * pageSize).Take(pageSize)
       .Select(f => new UserDto(
      f.Followee!.Id,
    f.Followee.UserName ?? "",
 f.Followee.DisplayName ?? f.Followee.UserName ?? "",
         f.Followee.AvatarUrl,
         f.Followee.Bio,
  f.Followee.IsVerified,
     0,
     0,
             false
   ))
        .ToListAsync();

    return Ok(following);
    }

    // ── GET /api/users/search?q= ──────────────────────────────────────────────
    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string q, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        if (string.IsNullOrWhiteSpace(q)) return Ok(new List<UserDto>());

 var users = await _db.Users
       .Where(u => (u.DisplayName != null && u.DisplayName.Contains(q)) ||
      (u.UserName   != null && u.UserName.Contains(q)))
  .Skip((page - 1) * pageSize).Take(pageSize)
  .Select(u => new UserDto(
       u.Id,
   u.UserName ?? "",
     u.DisplayName ?? u.UserName ?? "",
   u.AvatarUrl,
  u.Bio,
      u.IsVerified,
  0,
    0,
        false
    ))
     .ToListAsync();

        return Ok(users);
    }

    // ── Mapper ────────────────────────────────────────────────────────────────
    private static UserProfileDto MapProfile(ApplicationUser u, int followerCount, int followingCount, int postCount, bool isFollowedByMe = false) => new(
      u.Id,
  u.UserName ?? "",
    u.DisplayName ?? u.UserName ?? "",
        u.AvatarUrl,
        u.BannerUrl,
        u.Bio,
        u.Website,
        u.Location,
   u.IsVerified,
        u.IsPrivate,
     followerCount,
        followingCount,
    postCount,
        isFollowedByMe,
        u.CreatedAt,
        u.Email,
        u.EmailConfirmed
    );
}

