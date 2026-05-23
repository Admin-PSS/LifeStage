using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LifeStageAPI.Data;
using LifeStageAPI.DTOs;

namespace LifeStageAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MessagesController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly HttpClient _http;
    private readonly string _acsEndpoint;
    private readonly string _acsKey;
    private readonly string _openAiEndpoint;
    private readonly string _openAiKey;
    private readonly string _openAiDeployment;

    public MessagesController(ApplicationDbContext db, IHttpClientFactory httpFactory, IConfiguration config)
    {
        _db = db;
        _http = httpFactory.CreateClient("ACS");

        var connStr = config["Azure:EmailConnectionString"] ?? "";
        _acsEndpoint = ParseConnStr(connStr, "endpoint").TrimEnd('/');
        _acsKey      = ParseConnStr(connStr, "accesskey");

        _openAiEndpoint   = (config["Azure:OpenAI:Endpoint"] ?? "").TrimEnd('/');
        _openAiKey        = config["Azure:OpenAI:ApiKey"] ?? "";
        _openAiDeployment = config["Azure:OpenAI:DeploymentName"] ?? "gpt-4o";
    }

    private static string ParseConnStr(string connStr, string key) =>
        connStr.Split(';')
               .Select(p => p.Split('=', 2))
               .Where(p => p.Length == 2 && p[0].Equals(key, StringComparison.OrdinalIgnoreCase))
               .Select(p => p[1])
               .FirstOrDefault() ?? "";

    private string? CurrentUserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ??
        User.FindFirstValue("sub");

    // ── POST /api/messages/token ───────────────────────────────────────────────
    [HttpPost("token")]
    public async Task<IActionResult> GetToken()
    {
        var userId = CurrentUserId;
        if (userId == null) return Unauthorized();

        var user = await _db.Users.FindAsync(userId);
        if (user == null) return Unauthorized();

        if (string.IsNullOrEmpty(_acsEndpoint) || string.IsNullOrEmpty(_acsKey))
            return StatusCode(503, new { message = "Messaging service not configured." });

        try
        {
            // Lazy-create ACS identity for this user
            if (string.IsNullOrEmpty(user.AcsUserId))
            {
                var identity = await CreateAcsIdentityAsync();
                if (identity == null) return StatusCode(503, new { message = "Could not create messaging identity." });
                user.AcsUserId = identity;
                await _db.SaveChangesAsync();
            }

            // Issue token
            var token = await IssueAcsTokenAsync(user.AcsUserId);
            if (token == null) return StatusCode(503, new { message = "Could not issue messaging token." });

            return Ok(new AcsTokenResponse(
                user.AcsUserId,
                token.Value.Token,
                token.Value.ExpiresOn,
                _acsEndpoint + "/",
                user.DisplayName
            ));
        }
        catch (Exception ex)
        {
            return StatusCode(503, new { message = "Messaging service error.", detail = ex.Message });
        }
    }

    // ── GET /api/messages/participants?q= ─────────────────────────────────────
    [HttpGet("participants")]
    public async Task<IActionResult> SearchParticipants([FromQuery] string q = "")
    {
        var userId = CurrentUserId;
        if (userId == null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(q))
            return Ok(Array.Empty<AcsParticipantDto>());

        var users = await _db.Users
            .Where(u => u.Id != userId &&
                (u.UserName!.Contains(q) || u.DisplayName.Contains(q)))
            .Take(10)
            .ToListAsync();

        var needsId = users.Where(u => string.IsNullOrEmpty(u.AcsUserId)).ToList();
        foreach (var u in needsId)
        {
            var identity = await CreateAcsIdentityAsync();
            if (identity != null) u.AcsUserId = identity;
        }
        if (needsId.Count > 0) await _db.SaveChangesAsync();

        var result = users
            .Where(u => !string.IsNullOrEmpty(u.AcsUserId))
            .Select(u => new AcsParticipantDto(u.Id, u.UserName!, u.DisplayName, u.AvatarUrl, u.AcsUserId!))
            .ToList();

        return Ok(result);
    }

    // ── GET /api/messages/ai-chat/history ─────────────────────────────────────
    [HttpGet("ai-chat/history")]
    public async Task<IActionResult> GetAiHistory([FromQuery] int limit = 100)
    {
        var userId = CurrentUserId;
        if (userId == null) return Unauthorized();

        var rows = await _db.AiChatHistories
            .Where(h => h.UserId == userId)
            .OrderByDescending(h => h.CreatedAt)
            .Take(limit)
            .ToListAsync();

        var result = rows
            .OrderBy(h => h.CreatedAt)
            .Select(h => new { h.Id, h.Role, h.Content, createdAt = h.CreatedAt });

        return Ok(result);
    }

    // ── POST /api/messages/ai-chat ────────────────────────────────────────────
    // Body: { userMessage: "..." }  — history loaded from DB server-side
    [HttpPost("ai-chat")]
    public async Task<IActionResult> AiChat([FromBody] AiChatRequest request)
    {
        var userId = CurrentUserId;
        if (userId == null) return Unauthorized();

        if (string.IsNullOrEmpty(_openAiEndpoint) || string.IsNullOrEmpty(_openAiKey))
            return StatusCode(503, new { message = "AI service not configured." });

        if (string.IsNullOrWhiteSpace(request.UserMessage))
            return BadRequest(new { message = "No message provided." });

        // Load recent history from DB (last 40 messages for context window)
        var history = await _db.AiChatHistories
            .Where(h => h.UserId == userId)
            .OrderByDescending(h => h.CreatedAt)
            .Take(40)
            .ToListAsync();
        history.Reverse();

        var systemMessage = new { role = "system", content =
            "You are Sage, a warm and thoughtful AI companion on LifeStage — a social platform where people share life moments. " +
            "You offer friendly conversation, life advice, encouragement, and thoughtful reflections. " +
            "Keep responses concise (2-4 sentences) unless the user asks for more detail. " +
            "Be empathetic, positive, and genuine." };

        var payload = new
        {
            messages = new object[] { systemMessage }
                .Concat(history.Select(h => new { role = h.Role, content = h.Content }))
                .Append(new { role = "user", content = request.UserMessage })
                .ToArray(),
            max_tokens = 600,
            temperature = 0.8,
        };

        var url = $"{_openAiEndpoint}/openai/deployments/{_openAiDeployment}/chat/completions?api-version=2024-02-01";
        var req = new HttpRequestMessage(HttpMethod.Post, url);
        req.Headers.Add("api-key", _openAiKey);
        req.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

        try
        {
            var resp = await _http.SendAsync(req);
            var body = await resp.Content.ReadAsStringAsync();

            if (!resp.IsSuccessStatusCode)
                return StatusCode(503, new { message = "AI service error.", detail = body });

            using var doc = JsonDocument.Parse(body);
            var reply = doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString() ?? "";

            // Persist both messages to DB
            _db.AiChatHistories.AddRange(
                new Models.AiChatHistory { UserId = userId, Role = "user",      Content = request.UserMessage },
                new Models.AiChatHistory { UserId = userId, Role = "assistant", Content = reply }
            );
            await _db.SaveChangesAsync();

            return Ok(new { reply });
        }
        catch (Exception ex)
        {
            return StatusCode(503, new { message = "AI service error.", detail = ex.Message });
        }
    }

    // ── ACS REST helpers ───────────────────────────────────────────────────────

    private async Task<string?> CreateAcsIdentityAsync()
    {
        var url     = $"{_acsEndpoint}/identities?api-version=2022-10-01";
        var body    = JsonSerializer.Serialize(new { createTokenWithScopes = new[] { "chat", "voip" } });
        var request = BuildRequest(HttpMethod.Post, url, body);
        var resp    = await _http.SendAsync(request);
        if (!resp.IsSuccessStatusCode) return null;
        var json = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.GetProperty("identity").GetProperty("id").GetString();
    }

    private async Task<(string Token, DateTimeOffset ExpiresOn)?> IssueAcsTokenAsync(string acsUserId)
    {
        var url     = $"{_acsEndpoint}/identities/{Uri.EscapeDataString(acsUserId)}/:issueAccessToken?api-version=2022-10-01";
        var body    = JsonSerializer.Serialize(new { scopes = new[] { "chat", "voip" } });
        var request = BuildRequest(HttpMethod.Post, url, body);
        var resp    = await _http.SendAsync(request);
        if (!resp.IsSuccessStatusCode) return null;
        var json = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var token   = doc.RootElement.GetProperty("token").GetString()!;
        var expires = doc.RootElement.GetProperty("expiresOn").GetString()!;
        return (token, DateTimeOffset.Parse(expires));
    }

    private HttpRequestMessage BuildRequest(HttpMethod method, string url, string? jsonBody = null)
    {
        var req = new HttpRequestMessage(method, url);
        var utcNow = DateTimeOffset.UtcNow.ToString("r");
        req.Headers.Add("x-ms-date", utcNow);

        var content = jsonBody ?? "";
        req.Content = new StringContent(content, Encoding.UTF8, "application/json");

        // HMAC-SHA256 signature
        var keyBytes    = Convert.FromBase64String(_acsKey);
        var contentHash = Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(content)));
        req.Content.Headers.Add("x-ms-content-sha256", contentHash);

        var uri        = new Uri(url);
        var pathAndQuery = uri.PathAndQuery;
        var host        = uri.Host;
        var stringToSign = $"{method.Method}\n{pathAndQuery}\n{utcNow};{host};{contentHash}";
        var signature   = Convert.ToBase64String(new HMACSHA256(keyBytes).ComputeHash(Encoding.UTF8.GetBytes(stringToSign)));

        req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue(
            "HMAC-SHA256",
            $"SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature={signature}");

        return req;
    }
}
