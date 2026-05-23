// src/LifeStageAPI/Controllers/AuthController.cs
// Replace your existing AuthController.cs with this file.
// Adds: email confirmation on register, confirm endpoint, resend endpoint.

using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LifeStageAPI.Data;
using LifeStageAPI.DTOs;
using LifeStageAPI.Models;
using LifeStageAPI.Services;

namespace LifeStageAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly ITokenService _tokenService;
    private readonly IEmailService _emailService;
    private readonly ApplicationDbContext _db;
    private readonly IConfiguration _config;

    public AuthController(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        ITokenService tokenService,
        IEmailService emailService,
        ApplicationDbContext db,
        IConfiguration config)
    {
        _userManager   = userManager;
        _signInManager = signInManager;
        _tokenService  = tokenService;
        _emailService  = emailService;
        _db            = db;
        _config        = config;
    }

    // ── POST /api/auth/register ───────────────────────────────────────────────
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (await _userManager.FindByEmailAsync(request.Email) != null)
            return Conflict(new { message = "An account with this email already exists." });

        if (await _userManager.FindByNameAsync(request.UserName) != null)
            return Conflict(new { message = "This username is already taken." });

        var user = new ApplicationUser
        {
            Id          = Guid.NewGuid().ToString(),
            UserName    = request.UserName,
            Email       = request.Email,
            DisplayName = request.DisplayName ?? request.UserName,
            CreatedAt   = DateTime.UtcNow,
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) });

        // Generate email confirmation token
        var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
        // URL-encode the token (it may contain special characters)
        var encodedToken = Uri.EscapeDataString(token);

        var frontendUrl = _config["App:FrontendUrl"] ?? "http://localhost:5173";
        var confirmLink = $"{frontendUrl}/confirm-email?userId={user.Id}&token={encodedToken}";

        // Send confirmation email (fire-and-forget — don't block registration)
        _ = Task.Run(async () =>
        {
            try { await _emailService.SendConfirmationEmailAsync(user.Email!, user.DisplayName!, confirmLink); }
            catch (Exception ex) { Console.WriteLine($"[Email] Failed: {ex.Message}"); }
        });

        // Assign default "User" role
        await _userManager.AddToRoleAsync(user, "User");
        var roles = await _userManager.GetRolesAsync(user);

        // Return JWT so they can use the app (but show unconfirmed banner)
        var jwt = _tokenService.GenerateAccessToken(user, roles);
        return Ok(new AuthResponse(jwt, "", DateTime.UtcNow.AddMinutes(60), MapUser(user), false, user.Email));
    }

    // ── POST /api/auth/login ──────────────────────────────────────────────────
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null)
          return Unauthorized(new { message = "Invalid email or password." });

        var result = await _signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);
        if (result.IsLockedOut)
            return StatusCode(423, new { message = "Account locked out. Try again in 5 minutes." });
    if (!result.Succeeded)
  return Unauthorized(new { message = "Invalid email or password." });

      var roles = await _userManager.GetRolesAsync(user);
        var jwt = _tokenService.GenerateAccessToken(user, roles);
        return Ok(new AuthResponse(jwt, "", DateTime.UtcNow.AddMinutes(60), MapUser(user), user.EmailConfirmed, user.Email));
    }

    // ── GET /api/auth/confirm-email ───────────────────────────────────────────
    [HttpGet("confirm-email")]
    public async Task<IActionResult> ConfirmEmail([FromQuery] string userId, [FromQuery] string token)
    {
        if (string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(token))
            return BadRequest(new { message = "Invalid confirmation link." });

        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
            return NotFound(new { message = "User not found." });

        if (user.EmailConfirmed)
            return Ok(new { message = "Email already confirmed.", alreadyConfirmed = true });

        var decodedToken = Uri.UnescapeDataString(token);
     var result       = await _userManager.ConfirmEmailAsync(user, decodedToken);

        if (!result.Succeeded)
   return BadRequest(new { message = "Invalid or expired confirmation link.", errors = result.Errors.Select(e => e.Description) });

 // Send welcome email after successful confirmation
        _ = Task.Run(async () =>
    {
            try { await _emailService.SendWelcomeEmailAsync(user.Email!, user.DisplayName ?? user.UserName!); }
  catch { }
        });

        var roles = await _userManager.GetRolesAsync(user);
        var jwt = _tokenService.GenerateAccessToken(user, roles);
      return Ok(new AuthResponse(jwt, "", DateTime.UtcNow.AddMinutes(60), MapUser(user), true, user.Email));
    }

    // ── POST /api/auth/resend-confirmation ────────────────────────────────────
    [HttpPost("resend-confirmation")]
    public async Task<IActionResult> ResendConfirmation([FromBody] ResendConfirmationRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);

        // Always return OK even if email not found (security: don't reveal existence)
        if (user == null || user.EmailConfirmed)
            return Ok(new { message = "If your email is registered and unconfirmed, a new link has been sent." });

        var token        = await _userManager.GenerateEmailConfirmationTokenAsync(user);
        var encodedToken = Uri.EscapeDataString(token);
        var frontendUrl  = _config["App:FrontendUrl"] ?? "http://localhost:5173";
        var confirmLink  = $"{frontendUrl}/confirm-email?userId={user.Id}&token={encodedToken}";

        _ = Task.Run(async () =>
        {
            try { await _emailService.SendConfirmationEmailAsync(user.Email!, user.DisplayName ?? user.UserName!, confirmLink); }
            catch { }
        });

        return Ok(new { message = "If your email is registered and unconfirmed, a new link has been sent." });
    }

    // ── POST /api/auth/forgot-password ────────────────────────────────────────
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user != null)
        {
            var token        = await _userManager.GeneratePasswordResetTokenAsync(user);
            var encodedToken = Uri.EscapeDataString(token);
            var frontendUrl  = _config["App:FrontendUrl"] ?? "http://localhost:5173";
            var resetLink    = $"{frontendUrl}/reset-password?userId={user.Id}&token={encodedToken}";

            _ = Task.Run(async () =>
            {
                try { await _emailService.SendPasswordResetEmailAsync(user.Email!, user.DisplayName ?? user.UserName!, resetLink); }
                catch { }
            });
        }

        return Ok(new { message = "If your email is registered, a password reset link has been sent." });
    }

    // ── POST /api/auth/reset-password ─────────────────────────────────────────
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        var user = await _userManager.FindByIdAsync(request.UserId);
        if (user == null)
            return BadRequest(new { message = "Invalid reset link." });

        var decodedToken = Uri.UnescapeDataString(request.Token);
        var result       = await _userManager.ResetPasswordAsync(user, decodedToken, request.NewPassword);

        if (!result.Succeeded)
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) });

        return Ok(new { message = "Password has been reset successfully." });
    }

    // ── GET /api/auth/oauth/{provider} ────────────────────────────────────────
    [HttpGet("oauth/{provider}")]
    public IActionResult OAuthLogin(string provider, [FromQuery] string? returnUrl = null)
    {
        var redirectUrl = Url.Action(nameof(OAuthCallback), "Auth", new { provider, returnUrl });
        var props       = _signInManager.ConfigureExternalAuthenticationProperties(provider, redirectUrl);
        return Challenge(props, provider);
    }

    // ── GET /api/auth/oauth/{provider}/callback ───────────────────────────────
    [HttpGet("oauth/{provider}/callback")]
    public async Task<IActionResult> OAuthCallback(string provider, [FromQuery] string? returnUrl = null)
    {
        var info = await _signInManager.GetExternalLoginInfoAsync();
        var configuredUrl = _config["App:FrontendUrl"] ?? "http://localhost:5173";
        var trustedList   = new[] { configuredUrl, "http://localhost:5173", "http://localhost:3000", "http://localhost:5174" };
        var errorRedirect = !string.IsNullOrEmpty(returnUrl)
            && trustedList.Any(o => returnUrl.StartsWith(o, StringComparison.OrdinalIgnoreCase))
            ? returnUrl : configuredUrl;

        if (info == null)
            return Redirect($"{errorRedirect}?error=oauth_failed");

        var signInResult = await _signInManager.ExternalLoginSignInAsync(
            info.LoginProvider, info.ProviderKey, isPersistent: false);

        ApplicationUser user;

        if (signInResult.Succeeded)
        {
            user = (await _userManager.FindByLoginAsync(info.LoginProvider, info.ProviderKey))!;
        }
        else
        {
            // New OAuth user — create account
            var email       = info.Principal.FindFirstValue(ClaimTypes.Email) ?? "";
            var displayName = info.Principal.FindFirstValue(ClaimTypes.Name)  ?? "User";
            var userName    = await GenerateUniqueUserName(displayName);

            // If provider didn't return an email, generate a placeholder so Identity doesn't choke
            if (string.IsNullOrWhiteSpace(email))
                email = $"{userName}@{info.LoginProvider.ToLower()}.oauth.local";

            // Check if a user with this email already exists (link the login instead)
            var existingUser = await _userManager.FindByEmailAsync(email);
            if (existingUser != null)
            {
                await _userManager.AddLoginAsync(existingUser, info);
                user = existingUser;
            }
            else
            {
                user = new ApplicationUser
                {
                    Id             = Guid.NewGuid().ToString(),
                    UserName       = userName,
                    Email          = email,
                    DisplayName    = displayName,
                    EmailConfirmed = true, // OAuth providers verify email themselves
                    CreatedAt      = DateTime.UtcNow,
                };

                var createResult = await _userManager.CreateAsync(user);
                if (!createResult.Succeeded)
                    return Redirect($"{errorRedirect}?error=oauth_create_failed");

                await _userManager.AddLoginAsync(user, info);
            }

            // Send welcome email for new OAuth users
            if (!string.IsNullOrEmpty(email) && !email.EndsWith(".oauth.local"))
            {
        _ = Task.Run(async () =>
     {
    try { await _emailService.SendWelcomeEmailAsync(email, displayName); }
        catch { }
         });
            }
        }

        var roles = await _userManager.GetRolesAsync(user);
        var jwt   = _tokenService.GenerateAccessToken(user, roles);

        var configuredFrontend = _config["App:FrontendUrl"] ?? "http://localhost:5173";
        var trustedOrigins = new[] { configuredFrontend, "http://localhost:5173", "http://localhost:3000", "http://localhost:5174" };
        var redirectTo = !string.IsNullOrEmpty(returnUrl)
            && trustedOrigins.Any(o => returnUrl.StartsWith(o, StringComparison.OrdinalIgnoreCase))
            ? returnUrl
            : configuredFrontend;

        var uname = Uri.EscapeDataString(user.UserName ?? "");
        var dname = Uri.EscapeDataString(user.DisplayName ?? user.UserName ?? "User");
        return Redirect($"{redirectTo}?token={jwt}&userId={user.Id}&userName={uname}&displayName={dname}");
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private async Task<string> GenerateUniqueUserName(string displayName)
 {
  var base_ = new string(displayName.ToLower()
       .Replace(" ", "")
  .Where(c => char.IsLetterOrDigit(c))
   .Take(15)
 .ToArray());

  if (string.IsNullOrEmpty(base_)) base_ = "user";

     var candidate = base_;
  var i = 1;
    while (await _userManager.FindByNameAsync(candidate) != null)
   candidate = $"{base_}{i++}";

        return candidate;
  }

    private static UserDto MapUser(ApplicationUser u) => new(
   u.Id,
        u.UserName ?? "",
  u.DisplayName ?? u.UserName ?? "",
        u.AvatarUrl,
        u.Bio,
      u.IsVerified,
        0,
        0,
        false
    );
}
