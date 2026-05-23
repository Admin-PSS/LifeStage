// src/LifeStageAPI/Services/BlobStorageService.cs

using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Sas;

namespace LifeStageAPI.Services;

public interface IBlobStorageService
{
    Task<string> UploadAsync(Stream stream, string fileName, string contentType, string container = "posts");
    Task DeleteAsync(string blobUrl);
    Task<(string SasUrl, string BlobUrl)> GenerateVideoSasAsync(string extension);
}

public class BlobStorageService : IBlobStorageService
{
    private readonly BlobServiceClient _client;

    private static readonly string[] AllowedTypes = {
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "video/mp4", "video/webm",
        "audio/mpeg", "audio/mp3", "audio/aac", "audio/ogg",
        "audio/wav", "audio/x-wav", "audio/mp4",
    };

    private const long MaxImageBytes = 10 * 1024 * 1024;  // 10 MB
    private const long MaxVideoBytes = 100 * 1024 * 1024; // 100 MB
    private const long MaxAudioBytes = 50 * 1024 * 1024;  // 50 MB

    public BlobStorageService(IConfiguration config)
    {
        var connStr = config["Azure:StorageConnectionString"]
            ?? throw new InvalidOperationException("Azure:StorageConnectionString is not configured.");
        _client = new BlobServiceClient(connStr);
    }

    public async Task<string> UploadAsync(Stream stream, string fileName, string contentType, string container = "posts")
    {
        if (!AllowedTypes.Contains(contentType.ToLower()))
            throw new InvalidOperationException($"File type '{contentType}' is not allowed.");

        var maxBytes = contentType.StartsWith("video") ? MaxVideoBytes
                     : contentType.StartsWith("audio") ? MaxAudioBytes
                     : MaxImageBytes;
        if (stream.Length > maxBytes)
            throw new InvalidOperationException($"File exceeds {maxBytes / 1024 / 1024}MB limit.");

        var containerClient = _client.GetBlobContainerClient(container);
        await containerClient.CreateIfNotExistsAsync(PublicAccessType.Blob);

        var ext      = Path.GetExtension(fileName).ToLower();
        var safeName = $"{DateTime.UtcNow:yyyy/MM/dd}/{Guid.NewGuid()}{ext}";

        var blobClient = containerClient.GetBlobClient(safeName);
        await blobClient.UploadAsync(stream, new BlobHttpHeaders { ContentType = contentType });

        return blobClient.Uri.ToString();
    }

    public async Task<(string SasUrl, string BlobUrl)> GenerateVideoSasAsync(string extension)
    {
        var allowed = new[] { ".mp4", ".webm", ".mov" };
        if (!allowed.Contains(extension.ToLower()))
            throw new InvalidOperationException("Only .mp4, .webm, and .mov files are allowed.");

        var container = "videos";
        var blobName = $"{DateTime.UtcNow:yyyy/MM/dd}/{Guid.NewGuid()}{extension.ToLower()}";

        var containerClient = _client.GetBlobContainerClient(container);
        await containerClient.CreateIfNotExistsAsync(PublicAccessType.Blob);

        var blobClient = containerClient.GetBlobClient(blobName);

        var sasBuilder = new BlobSasBuilder
        {
            BlobContainerName = container,
            BlobName = blobName,
            Resource = "b",
            ExpiresOn = DateTimeOffset.UtcNow.AddMinutes(10),
        };
        sasBuilder.SetPermissions(BlobSasPermissions.Write | BlobSasPermissions.Create);

        var sasUri = blobClient.GenerateSasUri(sasBuilder);
        return (sasUri.ToString(), blobClient.Uri.ToString());
    }

    public async Task DeleteAsync(string blobUrl)
    {
        if (string.IsNullOrWhiteSpace(blobUrl)) return;
        try
        {
            var uri   = new Uri(blobUrl);
            var parts = uri.AbsolutePath.TrimStart('/').Split('/', 2);
            if (parts.Length < 2) return;
            var blobClient = _client.GetBlobContainerClient(parts[0]).GetBlobClient(parts[1]);
            await blobClient.DeleteIfExistsAsync();
        }
        catch { }
    }
}
