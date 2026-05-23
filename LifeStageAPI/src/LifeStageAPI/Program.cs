using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using LifeStageAPI.Data;
using LifeStageAPI.Hubs;
using LifeStageAPI.Middleware;
using LifeStageAPI.Models;
using LifeStageAPI.Services;
using Microsoft.Extensions.Azure;
using Microsoft.Azure.SignalR;
using Microsoft.AspNetCore.Authentication;


var builder = WebApplication.CreateBuilder(args);

// ── Serilog ───────────────────────────────────────────────────────────────────
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.File("logs/lifestage-.log", rollingInterval: RollingInterval.Day)
    .CreateLogger();
builder.Host.UseSerilog();

// ── Database ──────────────────────────────────────────────────────────────────
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"),
        sql => sql.EnableRetryOnFailure(3)));

// ── Identity ──────────────────────────────────────────────────────────────────
builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
{
    options.Password.RequiredLength = 8;
    options.Password.RequireNonAlphanumeric = false;
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    options.User.RequireUniqueEmail = true;
})
.AddEntityFrameworkStores<ApplicationDbContext>()
.AddDefaultTokenProviders();

// ── JWT + OAuth ───────────────────────────────────────────────────────────────
var jwtSettings = builder.Configuration.GetSection("Jwt");
var jwtSecret = jwtSettings["Secret"];

if (string.IsNullOrEmpty(jwtSecret))
{
    throw new InvalidOperationException("JWT Secret is not configured. Please set Jwt:Secret in app settings.");
}

var jwtKey = Encoding.UTF8.GetBytes(jwtSecret);

var authBuilder = builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme    = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = jwtSettings["Issuer"],
            ValidAudience            = jwtSettings["Audience"],
            IssuerSigningKey         = new SymmetricSecurityKey(jwtKey),
            ClockSkew                = TimeSpan.FromMinutes(1),
        };

        // Support SignalR token from query string
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                var accessToken = ctx.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(accessToken) &&
                    ctx.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                {
                    ctx.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });

// ── OAuth Providers (only if configured) ──────────────────────────────────────
// Google
var googleClientId = builder.Configuration["OAuth:Google:ClientId"];
var googleClientSecret = builder.Configuration["OAuth:Google:ClientSecret"];
if (!string.IsNullOrEmpty(googleClientId) && !string.IsNullOrEmpty(googleClientSecret))
{
    authBuilder.AddGoogle(options =>
    {
        options.ClientId     = googleClientId;
        options.ClientSecret = googleClientSecret;
        options.Scope.Add("profile");
        options.Scope.Add("email");
    });
}

// Microsoft
var msClientId = builder.Configuration["OAuth:Microsoft:ClientId"];
var msClientSecret = builder.Configuration["OAuth:Microsoft:ClientSecret"];
if (!string.IsNullOrEmpty(msClientId) && !string.IsNullOrEmpty(msClientSecret))
{
    authBuilder.AddMicrosoftAccount(options =>
    {
        options.ClientId     = msClientId;
        options.ClientSecret = msClientSecret;
    });
}




// ── Authorization Policies ────────────────────────────────────────────────────
builder.Services.AddAuthorizationBuilder()
    .AddPolicy("AdminOnly",  p => p.RequireRole("Admin"))
    .AddPolicy("Verified",   p => p.RequireClaim("isVerified", "True"))
    .AddPolicy("UserOrAdmin", p => p.RequireRole("User", "Admin"));

// ── CORS (allow frontend dev server) ─────────────────────────────────────────
var frontendUrl = builder.Configuration["App:FrontendUrl"] ?? "http://localhost:5173";
var allowedOrigins = new List<string>
{
    "http://localhost:3000",
    "http://localhost:5173",
    "https://localhost:7001"
};

// Add production frontend URL if configured
if (!frontendUrl.Contains("localhost"))
{
    allowedOrigins.Add(frontendUrl);
}

builder.Services.AddCors(options =>
    options.AddPolicy("FrontendPolicy", policy =>
 policy.WithOrigins(allowedOrigins.ToArray())
        .AllowAnyHeader()
          .AllowAnyMethod()
  .AllowCredentials()));

builder.Services.AddHttpClient("ACS");
builder.Services.AddScoped<IBlobStorageService, BlobStorageService>();
builder.Services.AddScoped<IEmailService, EmailService>();

// ── Application Services ──────────────────────────────────────────────────────
builder.Services.AddScoped<ITokenService, TokenService>();

// ── Controllers + JSON ────────────────────────────────────────────────────────
builder.Services.AddControllers()
    .AddJsonOptions(opts =>
    {
        opts.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        opts.JsonSerializerOptions.DefaultIgnoreCondition =
            System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    });

// ── Swagger / OpenAPI ─────────────────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "LifeStage Social API",
        Version = "v1",
        Description = "Social media platform REST API",
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description = "Enter JWT token (without 'Bearer ' prefix)",
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

// ── Azure Services (only if configured) ───────────────────────────────────────
var azureStorageConnectionString = builder.Configuration["Azure:StorageConnectionString"];
if (!string.IsNullOrEmpty(azureStorageConnectionString))
{
    builder.Services.AddAzureClients(clientBuilder =>
    {
        clientBuilder.AddBlobServiceClient(azureStorageConnectionString);
    });
}

var azureSignalRConnectionString = builder.Configuration["Azure:SignalR:ConnectionString"];
if (!string.IsNullOrEmpty(azureSignalRConnectionString))
{
    builder.Services.AddSignalR().AddAzureSignalR(azureSignalRConnectionString);
}
else
{
    builder.Services.AddSignalR();
}

// ──────────────────────────────────────────────────────────────────────────────
var app = builder.Build();
// ──────────────────────────────────────────────────────────────────────────────

// ── Migrate + Seed ────────────────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

   logger.LogInformation("Starting database migration...");
        await db.Database.MigrateAsync();
        logger.LogInformation("Database migration completed successfully.");

        logger.LogInformation("Seeding roles...");
        foreach (var role in new[] { "Admin", "User", "Moderator" })
        {
  if (!await roleManager.RoleExistsAsync(role))
        {
await roleManager.CreateAsync(new IdentityRole(role));
          logger.LogInformation("Created role: {Role}", role);
     }
        }
      logger.LogInformation("Role seeding completed.");
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred during database migration or seeding.");

        // In production, you might want to continue without failing
 if (app.Environment.IsProduction())
        {
            logger.LogWarning("Continuing startup despite migration error in production.");
        }
        else
        {
      throw;
        }
    }
}

// ── Pipeline ──────────────────────────────────────────────────────────────────
app.UseMiddleware<ExceptionMiddleware>();

// Enable Swagger in all environments for API documentation
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "LifeStage Social API v1");
  if (app.Environment.IsDevelopment())
    {
   c.RoutePrefix = string.Empty; // serve Swagger at root in development
    }
});

app.UseHttpsRedirection();
app.UseCors("FrontendPolicy");
app.UseSerilogRequestLogging();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<NotificationHub>("/hubs/notifications");

app.Run();
