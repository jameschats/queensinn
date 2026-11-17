using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.EntityFrameworkCore;
using queensin.api.Common.Exceptions;
using queensin.api.Common.Models;
using queensin.api.Common.Security;
using queensin.api.Data;
using queensin.api.Data.Entities;
using queensin.api.Features.Audit;
using queensin.api.Features.Media;
using queensin.api.Features.Site;

namespace queensin.api.Features.Content;

/// <summary>The galleries: the home page's masonry "collage" and sliding "strip", and the KVR Mahal page's own strip.</summary>
public static class GalleryPlacement
{
    public const string Collage = "collage";
    public const string Strip = "strip";
    public const string Mahal = "mahal";
    public static bool IsValid(string p) => p is Collage or Strip or Mahal;
}

public sealed record GalleryItemDto(long Id, long MediaId, MediaDto? Media, string? Title, string? Caption, string? LinkUrl, bool Visible);

/// <summary>An item as the editor sends it. A missing Id means a new item.</summary>
public sealed record SaveGalleryItem(long? Id, long MediaId, string? Title, string? Caption, string? LinkUrl, bool Visible);

public interface IGalleryAdminService
{
    Task<IReadOnlyList<GalleryItemDto>> ListAsync(string placement, CancellationToken ct = default);
    Task<IReadOnlyList<GalleryItemDto>> SaveAsync(long actorId, string placement, List<SaveGalleryItem> items, CancellationToken ct = default);
}

public sealed class GalleryAdminService : IGalleryAdminService
{
    private const int MaxItems = 60;
    private readonly QueensInnDbContext _db;
    private readonly IAuditService _audit;

    public GalleryAdminService(QueensInnDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public async Task<IReadOnlyList<GalleryItemDto>> ListAsync(string placement, CancellationToken ct = default)
    {
        RequireValid(placement);
        var rows = await _db.GalleryItems.AsNoTracking().Where(g => g.Placement == placement).OrderBy(g => g.DisplayOrder).ThenBy(g => g.GalleryItemId).ToListAsync(ct);
        var ids = rows.Select(r => r.MediaId).Distinct().ToList();
        var media = (await _db.MediaAssets.AsNoTracking().Where(m => ids.Contains(m.MediaId)).ToListAsync(ct)).ToDictionary(m => m.MediaId, MediaService.ToDto);
        return rows.Select(r => new GalleryItemDto(r.GalleryItemId, r.MediaId, media.GetValueOrDefault(r.MediaId), r.Title, r.Caption, r.LinkUrl, r.ShowOnHome)).ToList();
    }

    public async Task<IReadOnlyList<GalleryItemDto>> SaveAsync(long actorId, string placement, List<SaveGalleryItem> items, CancellationToken ct = default)
    {
        RequireValid(placement);
        if (items.Count > MaxItems) throw new AppException($"A gallery can hold at most {MaxItems} photos.");

        var mediaIds = items.Select(i => i.MediaId).Distinct().ToList();
        var found = await _db.MediaAssets.Where(m => mediaIds.Contains(m.MediaId)).Select(m => new { m.MediaId, m.Kind }).ToListAsync(ct);
        if (found.Count != mediaIds.Count) throw new AppException("One of the chosen photos no longer exists. Please choose it again.");
        if (found.Any(m => m.Kind != "image")) throw new AppException("Galleries can only hold photos, not videos.");

        var existing = await _db.GalleryItems.Where(g => g.Placement == placement).ToListAsync(ct);
        var keep = new HashSet<long>();
        var order = 0;
        foreach (var item in items)
        {
            order++;
            var strip = placement != GalleryPlacement.Collage;     // the collage is photos only; strip cards carry a title, caption and link
            var title = strip ? Clean(item.Title, 120) : null;
            var caption = strip ? Clean(item.Caption, 300) : null;
            var link = strip ? CleanLink(item.LinkUrl) : null;

            var row = item.Id is { } id ? existing.FirstOrDefault(g => g.GalleryItemId == id) : null;
            if (row is null)
            {
                row = new GalleryItem { Placement = placement };
                _db.GalleryItems.Add(row);
            }
            row.MediaId = item.MediaId;
            row.Title = title;
            row.Caption = caption;
            row.LinkUrl = link;
            row.ShowOnHome = item.Visible;
            row.DisplayOrder = order;
            if (row.GalleryItemId != 0) keep.Add(row.GalleryItemId);
        }
        _db.GalleryItems.RemoveRange(existing.Where(g => !keep.Contains(g.GalleryItemId)));

        _audit.Record(actorId, "Update", "Gallery", placement, $"{items.Count} photos");
        await _db.SaveChangesAsync(ct);
        return await ListAsync(placement, ct);
    }

    private static void RequireValid(string placement)
    {
        if (!GalleryPlacement.IsValid(placement)) throw new AppException("Unknown gallery.", 404);
    }

    private static string? Clean(string? s, int max)
    {
        s = s?.Trim();
        if (string.IsNullOrEmpty(s)) return null;
        return s.Length <= max ? s : throw new AppException($"That text is too long (limit {max} characters).");
    }

    /// <summary>Links are a page on this site (/bookroom, /#restaurant) or a full http(s) address; nothing else.</summary>
    private static string? CleanLink(string? s)
    {
        s = s?.Trim();
        if (string.IsNullOrEmpty(s)) return null;
        if (s.Length > 300) throw new AppException("That link is too long.");
        var internalLink = s.StartsWith('/') && !s.StartsWith("//") && !s.Contains(' ');
        var external = Uri.TryCreate(s, UriKind.Absolute, out var u) && (u.Scheme == Uri.UriSchemeHttps || u.Scheme == Uri.UriSchemeHttp);
        if (!internalLink && !external) throw new AppException("A link must start with / (a page on this site) or be a full https:// address.");
        return s;
    }
}

[ApiController]
[Route("api/admin/gallery")]
[Authorize(Policy = Perm.MediaManage)]
public sealed class GalleryAdminController : ControllerBase
{
    private readonly IGalleryAdminService _gallery;
    private readonly IOutputCacheStore _cache;
    public GalleryAdminController(IGalleryAdminService gallery, IOutputCacheStore cache) { _gallery = gallery; _cache = cache; }

    [HttpGet("{placement}")]
    public async Task<IActionResult> List(string placement, CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<GalleryItemDto>>.Ok(await _gallery.ListAsync(placement, ct)));

    [HttpPut("{placement}")]
    public async Task<IActionResult> Save(string placement, List<SaveGalleryItem> items, CancellationToken ct)
    {
        var result = await _gallery.SaveAsync(User.UserId(), placement, items, ct);
        await _cache.EvictByTagAsync(SiteController.CacheTag, ct);
        return Ok(ApiResponse<IReadOnlyList<GalleryItemDto>>.Ok(result, "Gallery saved. The website shows it now."));
    }
}
