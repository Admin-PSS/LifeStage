// src/LifeStageAPI/Controllers/UploadController.cs
// POST /api/upload  — upload image/video to Azure Blob Storage
// Returns: { url: "https://..." }

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using LifeStageAPI.Services;

namespace LifeStageAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UploadController : ControllerBase
{
    private readonly IBlobStorageService _blob;

    public UploadController(IBlobStorageService blob) => _blob = blob;

    // ── POST /api/upload ───────────────────────────────────────────────────────
    [HttpPost]
    [RequestSizeLimit(110 * 1024 * 1024)] // 110 MB absolute max
    public async Task<IActionResult> Upload(IFormFile file, [FromQuery] string container = "posts")
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file received." });

        // Validate container (whitelist)
        var allowed = new[] { "posts", "avatars", "banners" };
        if (!allowed.Contains(container))
            return BadRequest(new { message = "Invalid container." });

        try
        {
            await using var stream = file.OpenReadStream();
            var url = await _blob.UploadAsync(
                stream,
                file.FileName,
                file.ContentType,
                container
            );

            return Ok(new { url });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Upload failed.", detail = ex.Message });
        }
    }

    // ── POST /api/upload/audio ─────────────────────────────────────────────────
    [HttpPost("audio")]
    [RequestSizeLimit(50 * 1024 * 1024)] // 50 MB for audio
    public async Task<IActionResult> UploadAudio(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file received." });

        var audioTypes = new[] { "audio/mpeg", "audio/mp3", "audio/aac", "audio/ogg", "audio/wav", "audio/x-wav", "audio/mp4" };
        if (!audioTypes.Contains(file.ContentType.ToLower()))
            return BadRequest(new { message = "Only audio files allowed (MP3, AAC, OGG, WAV)." });

        if (file.Length > 50 * 1024 * 1024)
            return BadRequest(new { message = "Audio file must be under 50 MB." });

        try
        {
            await using var stream = file.OpenReadStream();
            var url = await _blob.UploadAsync(stream, file.FileName, file.ContentType, "songs");
            return Ok(new { url });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Upload failed.", detail = ex.Message });
        }
    }

    // ── GET /api/upload/video/sas ─────────────────────────────────────────────
    // Returns a short-lived SAS URL so the client can PUT the video directly to
    // Azure Blob Storage (bypassing the API for large files).
    [HttpGet("video/sas")]
    public async Task<IActionResult> GetVideoSas([FromQuery] string ext = ".mp4")
    {
        var allowed = new[] { ".mp4", ".webm", ".mov" };
        if (!allowed.Contains(ext.ToLower()))
            return BadRequest(new { message = "Only .mp4, .webm, and .mov extensions are allowed." });

        try
        {
            var (sasUrl, blobUrl) = await _blob.GenerateVideoSasAsync(ext);
            return Ok(new { sasUrl, blobUrl });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // ── POST /api/upload/avatar ────────────────────────────────────────────────
    [HttpPost("avatar")]
    [RequestSizeLimit(5 * 1024 * 1024)] // 5 MB for avatars
    public async Task<IActionResult> UploadAvatar(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file received." });

        var imageTypes = new[] { "image/jpeg", "image/png", "image/gif", "image/webp" };
        if (!imageTypes.Contains(file.ContentType.ToLower()))
            return BadRequest(new { message = "Only image files allowed for avatars." });

        try
        {
            await using var stream = file.OpenReadStream();
            var url = await _blob.UploadAsync(stream, file.FileName, file.ContentType, "avatars");
            return Ok(new { url });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
