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
using queensin.api.Features.Site;

namespace queensin.api.Features.Content;

public sealed record TestimonialAdminDto(long Id, string Quote, string GuestName, string? Origin, bool Visible);

/// <summary>A guest quote as the editor sends it. A missing Id means a new one; the list order is the display order.</summary>
public sealed record SaveTestimonial(long? Id, string Quote, string GuestName, string? Origin, bool Visible);

public interface ITestimonialsAdminService
{
    Task<IReadOnlyList<TestimonialAdminDto>> ListAsync(CancellationToken ct = default);
    Task<IReadOnlyList<TestimonialAdminDto>> SaveAsync(long actorId, List<SaveTestimonial> items, CancellationToken ct = default);
}

public sealed class TestimonialsAdminService : ITestimonialsAdminService
{
    private const int MaxItems = 30;
    private readonly QueensInnDbContext _db;
    private readonly IAuditService _audit;

    public TestimonialsAdminService(QueensInnDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public async Task<IReadOnlyList<TestimonialAdminDto>> ListAsync(CancellationToken ct = default)
        => await _db.Testimonials.AsNoTracking().OrderBy(t => t.DisplayOrder).ThenBy(t => t.TestimonialId)
            .Select(t => new TestimonialAdminDto(t.TestimonialId, t.Quote, t.GuestName, t.Origin, t.IsVisible)).ToListAsync(ct);

    public async Task<IReadOnlyList<TestimonialAdminDto>> SaveAsync(long actorId, List<SaveTestimonial> items, CancellationToken ct = default)
    {
        if (items.Count > MaxItems) throw new AppException($"There can be at most {MaxItems} quotes.");
        foreach (var i in items)
        {
            if ((i.Quote ?? "").Trim().Length is < 10 or > 600) throw new AppException("Each quote needs 10 to 600 characters.");
            if ((i.GuestName ?? "").Trim().Length is < 1 or > 120) throw new AppException("Each quote needs the guest's name (or a label such as “Guest”).");
            if ((i.Origin?.Length ?? 0) > 120) throw new AppException("The place a guest is from is too long (120 characters at most).");
        }

        var existing = await _db.Testimonials.ToListAsync(ct);
        var keep = new HashSet<long>();
        var order = 0;
        foreach (var i in items)
        {
            order++;
            var row = i.Id is { } id ? existing.FirstOrDefault(t => t.TestimonialId == id) : null;
            if (row is null) { row = new Testimonial(); _db.Testimonials.Add(row); }
            row.Quote = i.Quote.Trim();
            row.GuestName = i.GuestName.Trim();
            row.Origin = string.IsNullOrWhiteSpace(i.Origin) ? null : i.Origin.Trim();
            row.IsVisible = i.Visible;
            row.DisplayOrder = order;
            if (row.TestimonialId != 0) keep.Add(row.TestimonialId);
        }
        _db.Testimonials.RemoveRange(existing.Where(t => !keep.Contains(t.TestimonialId)));
        _audit.Record(actorId, "Update", "Testimonials", null, $"{items.Count} quotes");
        await _db.SaveChangesAsync(ct);
        return await ListAsync(ct);
    }
}

[ApiController]
[Route("api/admin/testimonials")]
[Authorize(Policy = Perm.CmsManage)]
public sealed class TestimonialsAdminController : ControllerBase
{
    private readonly ITestimonialsAdminService _items;
    private readonly IOutputCacheStore _cache;
    public TestimonialsAdminController(ITestimonialsAdminService items, IOutputCacheStore cache) { _items = items; _cache = cache; }

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct) => Ok(ApiResponse<IReadOnlyList<TestimonialAdminDto>>.Ok(await _items.ListAsync(ct)));

    [HttpPut]
    public async Task<IActionResult> Save(List<SaveTestimonial> items, CancellationToken ct)
    {
        var result = await _items.SaveAsync(User.UserId(), items, ct);
        await _cache.EvictByTagAsync(SiteController.CacheTag, ct);
        return Ok(ApiResponse<IReadOnlyList<TestimonialAdminDto>>.Ok(result, "Saved. The website shows these quotes now."));
    }
}
