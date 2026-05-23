// src/LifeStageAPI/Services/EmailService.cs
// Uses Azure Communication Services (ACS) Email to send:
//   - Email confirmation on registration
//   - Password reset links
//   - Welcome email after confirmation

using Azure;
using Azure.Communication.Email;

namespace LifeStageAPI.Services;

public interface IEmailService
{
    Task SendConfirmationEmailAsync(string toEmail, string toName, string confirmationLink);
    Task SendPasswordResetEmailAsync(string toEmail, string toName, string resetLink);
    Task SendWelcomeEmailAsync(string toEmail, string toName);
}

public class EmailService : IEmailService
{
    private readonly EmailClient _client;
    private readonly string _fromAddress;
    private readonly string _appBaseUrl;

    public EmailService(IConfiguration config)
    {
        var connStr = config["Azure:EmailConnectionString"]
            ?? throw new InvalidOperationException("Azure:EmailConnectionString is not configured.");

        _client      = new EmailClient(connStr);
        _fromAddress = config["Azure:EmailFrom"] ?? "donotreply@lifestage.app";
        _appBaseUrl  = config["App:BaseUrl"]     ?? "https://lifestage.app";
    }

    // ── Confirmation email ─────────────────────────────────────────────────────
    public async Task SendConfirmationEmailAsync(string toEmail, string toName, string confirmationLink)
    {
        var html = EmailTemplate(
            preheader: "One click to activate your LifeStage account",
            bodyHtml: $@"
                <h1 style='font-family:Georgia,serif;color:#3a2e26;font-size:26px;margin:0 0 16px'>
                    Welcome to LifeStage, {HtmlEncode(toName)}! 🎭
                </h1>
                <p style='color:#5a4a40;font-size:16px;line-height:1.7;margin:0 0 24px'>
                    Your account is almost ready. Click the button below to confirm your email
                    address and step onto your stage.
                </p>
                <a href='{confirmationLink}'
                   style='display:inline-block;background:linear-gradient(135deg,#c8824a,#e8a870);
                          color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;
                          font-weight:700;font-size:16px;font-family:Georgia,serif;
                          box-shadow:0 4px 16px rgba(200,130,74,0.4)'>
                    Confirm Email Address
                </a>
                <p style='color:#a08878;font-size:13px;margin:24px 0 0;line-height:1.6'>
                    This link expires in <strong>24 hours</strong>.<br>
                    If you didn't create a LifeStage account, you can safely ignore this email.
                </p>",
            footerNote: "You're receiving this because an account was created with this email address."
        );

        await SendAsync(toEmail, toName, "Confirm your LifeStage email address 🎭", html);
    }

    // ── Password reset email ───────────────────────────────────────────────────
    public async Task SendPasswordResetEmailAsync(string toEmail, string toName, string resetLink)
    {
        var html = EmailTemplate(
            preheader: "Reset your LifeStage password",
            bodyHtml: $@"
                <h1 style='font-family:Georgia,serif;color:#3a2e26;font-size:26px;margin:0 0 16px'>
                    Password reset request
                </h1>
                <p style='color:#5a4a40;font-size:16px;line-height:1.7;margin:0 0 24px'>
                    Hi {HtmlEncode(toName)}, we received a request to reset your password.
                    Click the button below — the link expires in <strong>1 hour</strong>.
                </p>
                <a href='{resetLink}'
                   style='display:inline-block;background:linear-gradient(135deg,#c8824a,#e8a870);
                          color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;
                          font-weight:700;font-size:16px;font-family:Georgia,serif;
                          box-shadow:0 4px 16px rgba(200,130,74,0.4)'>
                    Reset My Password
                </a>
                <p style='color:#a08878;font-size:13px;margin:24px 0 0;line-height:1.6'>
                    If you didn't request this, your password remains unchanged and you can
                    safely ignore this email.
                </p>",
            footerNote: "You're receiving this because a password reset was requested for your account."
        );

        await SendAsync(toEmail, toName, "Reset your LifeStage password", html);
    }

    // ── Welcome email (after confirmation) ────────────────────────────────────
    public async Task SendWelcomeEmailAsync(string toEmail, string toName)
    {
        var html = EmailTemplate(
            preheader: "Your stage is ready — start sharing your moments",
            bodyHtml: $@"
                <h1 style='font-family:Georgia,serif;color:#3a2e26;font-size:26px;margin:0 0 16px'>
                    Your stage is set, {HtmlEncode(toName)}! ✨
                </h1>
                <p style='color:#5a4a40;font-size:16px;line-height:1.7;margin:0 0 16px'>
                    Welcome to LifeStage — a place where every life deserves its moment.
                </p>
                <p style='color:#5a4a40;font-size:15px;line-height:1.7;margin:0 0 24px'>
                    Here's what you can do to get started:
                </p>
                <ul style='color:#5a4a40;font-size:15px;line-height:2;padding-left:20px;margin:0 0 28px'>
                    <li>📝 <strong>Share your first post</strong> — what's on your mind today?</li>
                    <li>👤 <strong>Complete your profile</strong> — add a bio and photo</li>
                    <li>🔍 <strong>Discover people</strong> — find voices worth following</li>
                    <li>🏷️ <strong>Use hashtags</strong> — join the conversations that matter to you</li>
                </ul>
                <a href='{_appBaseUrl}'
                   style='display:inline-block;background:linear-gradient(135deg,#c8824a,#e8a870);
                          color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;
                          font-weight:700;font-size:16px;font-family:Georgia,serif;
                          box-shadow:0 4px 16px rgba(200,130,74,0.4)'>
                    Go to LifeStage 🎭
                </a>",
            footerNote: "You're receiving this welcome email because you just confirmed your account."
        );

        await SendAsync(toEmail, toName, "Welcome to LifeStage — your stage awaits 🎭", html);
    }

    // ── Internal helpers ───────────────────────────────────────────────────────
    private async Task SendAsync(string toEmail, string toName, string subject, string htmlBody)
    {
        var message = new EmailMessage(
            senderAddress: _fromAddress,
            recipients: new EmailRecipients(new[] { new EmailAddress(toEmail, toName) }),
            content: new EmailContent(subject) { Html = htmlBody }
        );

        await _client.SendAsync(WaitUntil.Started, message);
    }

    private static string HtmlEncode(string s) =>
        System.Web.HttpUtility.HtmlEncode(s);

    private static string EmailTemplate(string preheader, string bodyHtml, string footerNote) => $@"
<!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset='UTF-8'>
  <meta name='viewport' content='width=device-width,initial-scale=1'>
  <title>LifeStage</title>
</head>
<body style='margin:0;padding:0;background:#f5ece0;font-family:Lato,Arial,sans-serif'>
  <!-- Preheader (hidden preview text) -->
  <span style='display:none;max-height:0;overflow:hidden;mso-hide:all'>{preheader}</span>

  <table width='100%' cellpadding='0' cellspacing='0' style='background:#f5ece0;padding:40px 20px'>
    <tr><td align='center'>
      <table width='600' cellpadding='0' cellspacing='0' style='max-width:600px;width:100%'>

        <!-- Header -->
        <tr>
          <td style='background:linear-gradient(135deg,#3a2e26,#6a4a30);border-radius:20px 20px 0 0;padding:28px 40px;text-align:center'>
            <span style='font-family:Georgia,serif;font-size:28px;font-weight:800;color:#e8c87a;letter-spacing:-0.5px'>
              🎭 LifeStage
            </span>
            <div style='color:#c8a878;font-size:13px;margin-top:4px;font-style:italic'>
              every life deserves its moment
            </div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style='background:#fff;padding:40px 40px 32px;border-left:1px solid #e8ddd0;border-right:1px solid #e8ddd0'>
            {bodyHtml}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style='background:#fdf6ee;border:1px solid #e8ddd0;border-top:none;border-radius:0 0 20px 20px;padding:20px 40px;text-align:center'>
            <p style='color:#b0a090;font-size:12px;margin:0;line-height:1.6'>{footerNote}</p>
            <p style='color:#c8b0a0;font-size:11px;margin:8px 0 0'>
              &copy; {DateTime.UtcNow.Year} LifeStage &nbsp;·&nbsp;
              <a href='#' style='color:#c8824a;text-decoration:none'>Unsubscribe</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>";
}
