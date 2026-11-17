using Microsoft.EntityFrameworkCore;
using queensin.api.Common.Exceptions;
using queensin.api.Data;
using queensin.api.Data.Entities;
using queensin.api.Features.Audit;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Png;
using SixLabors.ImageSharp.Processing;

namespace queensin.api.Features.Site;

public interface IFaviconService
{
    /// <summary>Crops to a centred square, writes the PNG sizes and points the FaviconUrl setting at them.</summary>
    Task<string> SetAsync(long? actorId, Stream source, CancellationToken ct = default);
    /// <summary>Removes the uploaded favicon so the site falls back to its built-in icon.</summary>
    Task ClearAsync(long? actorId, CancellationToken ct = default);
}

/// <summary>
/// The favicon is stored as <c>/uploads/brand/fav-&lt;id&gt;-{32|48|180|192|512}.png</c>; the setting holds the
/// path without the size suffix, which the web app completes. Each upload gets a new id, so browsers
/// and CDNs never serve a stale icon.
/// </summary>
public sealed class FaviconService : IFaviconService
{
    public const string SettingKey = "FaviconUrl";
    private static readonly int[] Sizes = [32, 48, 180, 192, 512];
    private const int MinSide = 192;
    private const long MaxBytes = 10 * 1024 * 1024;

    private readonly QueensInnDbContext _db;
    private readonly IAuditService _audit;
    private readonly string _root;
    private readonly string _requestPath;

    public FaviconService(QueensInnDbContext db, IAuditService audit, IConfiguration config, IWebHostEnvironment env)
    {
        _db = db;
        _audit = audit;
        var upload = config["Media:UploadPath"] ?? "uploads";
        _root = Path.GetFullPath(Path.IsPathRooted(upload) ? upload : Path.Combine(env.ContentRootPath, upload));
        _requestPath = (config["Media:RequestPath"] ?? "/uploads").TrimEnd('/');
    }

    public async Task<string> SetAsync(long? actorId, Stream source, CancellationToken ct = default)
    {
        using var buffer = new MemoryStream();
        await source.CopyToAsync(buffer, ct);
        if (buffer.Length == 0) throw new AppException("The file is empty.");
        if (buffer.Length > MaxBytes) throw new AppException("Favicon must be under 10 MB.", 413);

        buffer.Position = 0;
        ImageInfo info;
        try { info = await Image.IdentifyAsync(buffer, ct); }
        catch (Exception e) when (e is UnknownImageFormatException or InvalidImageContentException or NotSupportedException)
        { throw new AppException("That file is not a supported image. Use PNG, JPG or WebP (SVG is not supported)."); }
        if (Math.Min(info.Width, info.Height) < MinSide)
            throw new AppException($"The image is too small. Use at least {MinSide} × {MinSide} pixels, ideally 512 × 512.");

        buffer.Position = 0;
        using var image = await Image.LoadAsync(buffer, ct);
        image.Mutate(x => x.AutoOrient());
        image.Metadata.ExifProfile = null;

        var dir = Path.Combine(_root, "brand");
        Directory.CreateDirectory(dir);
        var stem = "fav-" + Guid.NewGuid().ToString("N")[..10];
        var written = new List<string>();
        try
        {
            foreach (var px in Sizes)
            {
                using var square = image.Clone(x => x.Resize(new ResizeOptions { Size = new Size(px, px), Mode = ResizeMode.Crop, Position = AnchorPositionMode.Center }));
                var path = Path.Combine(dir, $"{stem}-{px}.png");
                await square.SaveAsync(path, new PngEncoder(), ct);
                written.Add(path);
            }
        }
        catch
        {
            foreach (var f in written) TryDelete(f);
            throw;
        }

        var url = $"{_requestPath}/brand/{stem}";
        var row = await _db.SiteSettings.FirstOrDefaultAsync(s => s.SettingKey == SettingKey, ct);
        var previous = row?.SettingValue;
        if (row is null) _db.SiteSettings.Add(new SiteSetting { SettingKey = SettingKey, SettingValue = url });
        else row.SettingValue = url;
        _audit.Record(actorId, "Update", "Favicon", null, "Uploaded a new favicon");
        await _db.SaveChangesAsync(ct);

        DeleteFiles(previous);
        return url;
    }

    public async Task ClearAsync(long? actorId, CancellationToken ct = default)
    {
        var row = await _db.SiteSettings.FirstOrDefaultAsync(s => s.SettingKey == SettingKey, ct);
        if (row?.SettingValue is null) return;
        var previous = row.SettingValue;
        row.SettingValue = null;
        _audit.Record(actorId, "Update", "Favicon", null, "Reset to the default favicon");
        await _db.SaveChangesAsync(ct);
        DeleteFiles(previous);
    }

    /// <summary>Deletes the PNG set for a stored base URL, only ever inside the brand folder.</summary>
    private void DeleteFiles(string? baseUrl)
    {
        if (string.IsNullOrEmpty(baseUrl)) return;
        var stem = Path.GetFileName(baseUrl);
        if (!stem.StartsWith("fav-", StringComparison.Ordinal) || stem.Any(c => !char.IsLetterOrDigit(c) && c != '-')) return;
        foreach (var px in Sizes) TryDelete(Path.Combine(_root, "brand", $"{stem}-{px}.png"));
    }

    private static void TryDelete(string path)
    {
        try { File.Delete(path); } catch (IOException) { /* harmless leftover */ }
    }
}
