using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using LifeStageAPI.Models;

namespace LifeStageAPI.Data;

public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

    public DbSet<Post> Posts => Set<Post>();
    public DbSet<Comment> Comments => Set<Comment>();
    public DbSet<Like> Likes => Set<Like>();
    public DbSet<Follow> Follows => Set<Follow>();
    public DbSet<Hashtag> Hashtags => Set<Hashtag>();
    public DbSet<PostHashtag> PostHashtags => Set<PostHashtag>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<AiChatHistory> AiChatHistories => Set<AiChatHistory>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // ── ApplicationUser ──────────────────────────────────────────────────
        builder.Entity<ApplicationUser>(e =>
        {
            e.Property(u => u.DisplayName).HasMaxLength(100).IsRequired();
            e.Property(u => u.Bio).HasMaxLength(500);
            e.Property(u => u.Website).HasMaxLength(200);
            e.Property(u => u.Location).HasMaxLength(100);
        });

        // ── Post ─────────────────────────────────────────────────────────────
        builder.Entity<Post>(e =>
        {
            e.HasKey(p => p.Id);
            e.Property(p => p.Content).HasMaxLength(280).IsRequired();
            e.HasOne(p => p.User)
                .WithMany(u => u.Posts)
                .HasForeignKey(p => p.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(p => p.ParentPost)
                .WithMany(p => p.Reposts)
                .HasForeignKey(p => p.ParentPostId)
                .OnDelete(DeleteBehavior.NoAction);
            e.HasIndex(p => p.CreatedAt);
            e.HasIndex(p => p.UserId);
        });

        // ── Comment ──────────────────────────────────────────────────────────
        builder.Entity<Comment>(e =>
        {
            e.HasKey(c => c.Id);
            e.Property(c => c.Content).HasMaxLength(500).IsRequired();
            e.HasOne(c => c.Post)
                .WithMany(p => p.Comments)
                .HasForeignKey(c => c.PostId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(c => c.User)
                .WithMany(u => u.Comments)
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.NoAction);
            e.HasOne(c => c.ParentComment)
                .WithMany(c => c.Replies)
                .HasForeignKey(c => c.ParentCommentId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        // ── Like ─────────────────────────────────────────────────────────────
        builder.Entity<Like>(e =>
        {
            e.HasKey(l => l.Id);
            e.HasOne(l => l.User)
                .WithMany(u => u.Likes)
                .HasForeignKey(l => l.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(l => l.Post)
                .WithMany(p => p.Likes)
                .HasForeignKey(l => l.PostId)
                .OnDelete(DeleteBehavior.NoAction);
            e.HasOne(l => l.Comment)
                .WithMany(c => c.Likes)
                .HasForeignKey(l => l.CommentId)
                .OnDelete(DeleteBehavior.NoAction);
            // prevent duplicate likes
            e.HasIndex(l => new { l.UserId, l.PostId }).IsUnique().HasFilter("[PostId] IS NOT NULL");
            e.HasIndex(l => new { l.UserId, l.CommentId }).IsUnique().HasFilter("[CommentId] IS NOT NULL");
        });

        // ── Follow ────────────────────────────────────────────────────────────
        builder.Entity<Follow>(e =>
        {
            e.HasKey(f => f.Id);
            e.HasOne(f => f.Follower)
                .WithMany(u => u.Following)
                .HasForeignKey(f => f.FollowerId)
                .OnDelete(DeleteBehavior.NoAction);
            e.HasOne(f => f.Followee)
                .WithMany(u => u.Followers)
                .HasForeignKey(f => f.FolloweeId)
                .OnDelete(DeleteBehavior.NoAction);
            e.HasIndex(f => new { f.FollowerId, f.FolloweeId }).IsUnique();
        });

        // ── Hashtag ───────────────────────────────────────────────────────────
        builder.Entity<Hashtag>(e =>
        {
            e.HasKey(h => h.Id);
            e.Property(h => h.Tag).HasMaxLength(100).IsRequired();
            e.HasIndex(h => h.Tag).IsUnique();
        });

        // ── PostHashtag (composite PK) ────────────────────────────────────────
        builder.Entity<PostHashtag>(e =>
        {
            e.HasKey(ph => new { ph.PostId, ph.HashtagId });
            e.HasOne(ph => ph.Post)
                .WithMany(p => p.PostHashtags)
                .HasForeignKey(ph => ph.PostId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(ph => ph.Hashtag)
                .WithMany(h => h.PostHashtags)
                .HasForeignKey(ph => ph.HashtagId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ── AiChatHistory ─────────────────────────────────────────────────────
        builder.Entity<AiChatHistory>(e =>
        {
            e.HasKey(h => h.Id);
            e.Property(h => h.Role).HasMaxLength(20).IsRequired();
            e.Property(h => h.Content).IsRequired();
            e.HasOne(h => h.User)
                .WithMany()
                .HasForeignKey(h => h.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(h => new { h.UserId, h.CreatedAt });
        });

        // ── Notification ──────────────────────────────────────────────────────
        builder.Entity<Notification>(e =>
        {
            e.HasKey(n => n.Id);
            e.HasOne(n => n.Recipient)
                .WithMany(u => u.Notifications)
                .HasForeignKey(n => n.RecipientId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(n => n.Actor)
                .WithMany()
                .HasForeignKey(n => n.ActorId)
                .OnDelete(DeleteBehavior.NoAction);
            e.HasIndex(n => new { n.RecipientId, n.IsRead });
        });
    }
}
