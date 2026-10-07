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

public sealed record AttractionAdminDto(long Id, string Name, decimal DistanceKm, string? Description, MediaDto? Media, bool Visible);

/// <summary>An attraction as the editor sends it. A missing Id means a new one; the list order is the display order.</summary>
public sealed record SaveAttraction(long? Id, string Name, decimal DistanceKm, string? Description, long? MediaId, bool Visible);

public interface IAttractionsAdminService
{
    Task<IReadOnlyList<AttractionAdminDto>> ListAsync(CancellationToken ct = default);
    Task<IReadOnlyList<AttractionAdminDto>> SaveAsync(long actorId, List<SaveAttraction> items, CancellationToken ct = default);
}

public sealed class AttractionsAdminService : IAttractionsAdminService
{
    private const int MaxItems = 40;
    private readonly QueensInnDbContext _db;
    private readonly IAuditService _audit;

    public AttractionsAdminService(QueensInnDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public async Task<IReadOnlyList<AttractionAdminDto>> ListAsync(CancellationToken ct = default)
    {
        var rows = await _db.Attractions.AsNoTracking().OrderBy(a => a.DisplayOrder).ThenBy(a => a.AttractionId).ToListAsync(ct);
        var ids = rows.Where(r => r.MediaId != null).Select(r => r.MediaId!.Value).Distinct().ToList();
        var media = (await _db.MediaAssets.AsNoTracking().Where(m => ids.Contains(m.MediaId)).ToListAsync(ct)).ToDictionary(m => m.MediaId, MediaService.ToDto);
        return rows.Select(r => new AttractionAdminDto(r.AttractionId, r.Name, r.DistanceKm, r.Description, r.MediaId is { } m ? media.GetValueOrDefault(m) : null, r.IsVisible)).ToList();
    }

    public async Task<IReadOnlyList<AttractionAdminDto>> SaveAsync(long actorId, List<SaveAttraction> items, CancellationToken ct = default)
    {
        if (items.Count > MaxItems) throw new AppException($"There can be at most {MaxItems} places.");
        foreach (var i in items)
        {
            var name = (i.Name ?? "").Trim();
            if (name.Length is < 2 or > 120) throw new AppException("Every place needs a name (2 to 120 characters).");
            if (i.DistanceKm is < 0 or > 999) throw new AppException($"The distance for “{name}” must be between 0 and 999 km.");
            if ((i.Description?.Length ?? 0) > 2000) throw new AppException($"The description for “{name}” is too long (2,000 characters at most).");
        }

        var mediaIds = items.Where(i => i.MediaId != null).Select(i => i.MediaId!.Value).Distinct().ToList();
        if (mediaIds.Count > 0)
        {
            var found = await _db.MediaAssets.Where(m => mediaIds.Contains(m.MediaId)).Select(m => new { m.MediaId, m.Kind }).ToListAsync(ct);
            if (found.Count != mediaIds.Count) throw new AppException("One of the chosen photos no longer exists. Please choose it again.");
            if (found.Any(m => m.Kind != "image")) throw new AppException("Places can only use photos, not videos.");
        }

        var existing = await _db.Attractions.ToListAsync(ct);
        var keep = new HashSet<long>();
        var order = 0;
        foreach (var i in items)
        {
            order++;
            var row = i.Id is { } id ? existing.FirstOrDefault(a => a.AttractionId == id) : null;
            if (row is null) { row = new Attraction(); _db.Attractions.Add(row); }
            row.Name = i.Name.Trim();
            row.DistanceKm = Math.Round(i.DistanceKm, 1);
            row.Description = string.IsNullOrWhiteSpace(i.Description) ? null : i.Description.Trim();
            row.MediaId = i.MediaId;
            row.IsVisible = i.Visible;
            row.DisplayOrder = order;
            if (row.AttractionId != 0) keep.Add(row.AttractionId);
        }
        _db.Attractions.RemoveRange(existing.Where(a => !keep.Contains(a.AttractionId)));
        _audit.Record(actorId, "Update", "Attractions", null, $"{items.Count} places");
        await _db.SaveChangesAsync(ct);
        return await ListAsync(ct);
    }
}

[ApiController]
[Route("api/admin/attractions")]
[Authorize(Policy = Perm.CmsManage)]
public sealed class AttractionsAdminController : ControllerBase
{
    private readonly IAttractionsAdminService _items;
    private readonly IOutputCacheStore _cache;
    public AttractionsAdminController(IAttractionsAdminService items, IOutputCacheStore cache) { _items = items; _cache = cache; }

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct) => Ok(ApiResponse<IReadOnlyList<AttractionAdminDto>>.Ok(await _items.ListAsync(ct)));

    [HttpPut]
    public async Task<IActionResult> Save(List<SaveAttraction> items, CancellationToken ct)
    {
        var result = await _items.SaveAsync(User.UserId(), items, ct);
        await _cache.EvictByTagAsync(SiteController.CacheTag, ct);
        return Ok(ApiResponse<IReadOnlyList<AttractionAdminDto>>.Ok(result, "Saved. The website shows these places now."));
    }
}
