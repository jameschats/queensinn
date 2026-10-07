using System.Text.Json;
using System.Text.RegularExpressions;
using Ganss.Xss;
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

/// <summary>Helpers shared by the public and admin sides for the page-section JSON.</summary>
public static class PageContentJson
{
    /// <summary>The home page has the empty slug in the database; the API and URLs call it "home".</summary>
    public static string ApiSlug(string dbSlug) => dbSlug.Length == 0 ? "home" : dbSlug;
    public static string DbSlug(string apiSlug) => apiSlug == "home" ? "" : apiSlug;

    public static IReadOnlyDictionary<string, string> Parse(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new Dictionary<string, string>();
        try { return JsonSerializer.Deserialize<Dictionary<string, string>>(json) ?? new(); }
        catch (JsonException) { return new Dictionary<string, string>(); }
    }
}

// ---- admin contracts ----

public sealed record PageSummaryDto(string Slug, string Title, string? MetaTitle);

public sealed record PageEditDto(
    string Slug, string Title, string? MetaTitle, string? MetaDescription, MediaDto? OgImage,
    IReadOnlyDictionary<string, IReadOnlyDictionary<string, string>> Sections,
    IReadOnlyList<MediaDto> HeroPhotos, MediaDto? HeroVideo,
    IReadOnlyDictionary<string, MediaDto?> Slots);

/// <summary>What the editor sends back. A null collection means "leave that part alone".</summary>
public sealed record SavePageRequest(
    string? MetaTitle, string? MetaDescription, long? OgMediaId,
    Dictionary<string, Dictionary<string, string>>? Sections,
    List<long>? HeroMediaIds,
    Dictionary<string, long?>? Slots);

public sealed record PolicyDto(string Slug, string Title, string BodyHtml, DateTime UpdatedAt);
public sealed record SavePolicyRequest(string Title, string BodyHtml);

public interface IPageAdminService
{
    Task<IReadOnlyList<PageSummaryDto>> ListAsync(CancellationToken ct = default);
    Task<PageEditDto> GetAsync(string apiSlug, CancellationToken ct = default);
    Task<PageEditDto> SaveAsync(long actorId, string apiSlug, SavePageRequest req, CancellationToken ct = default);
    Task<IReadOnlyList<PolicyDto>> ListPoliciesAsync(CancellationToken ct = default);
    Task<PolicyDto> SavePolicyAsync(long actorId, string slug, SavePolicyRequest req, CancellationToken ct = default);
    Task<PolicyDto?> GetPolicyAsync(string slug, CancellationToken ct = default);
}

public sealed partial class PageAdminService : IPageAdminService
{
    private const int MaxSections = 40, MaxFieldsPerSection = 60, MaxValueLength = 4000, MaxHeroPhotos = 12, MaxPolicyHtml = 60_000;

    private readonly QueensInnDbContext _db;
    private readonly IAuditService _audit;
    private static readonly HtmlSanitizer Sanitizer = BuildSanitizer();

    public PageAdminService(QueensInnDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public async Task<IReadOnlyList<PageSummaryDto>> ListAsync(CancellationToken ct = default)
        => (await _db.Pages.AsNoTracking().OrderBy(p => p.PageId).ToListAsync(ct))
            .Select(p => new PageSummaryDto(PageContentJson.ApiSlug(p.Slug), p.Title, p.MetaTitle)).ToList();

    public async Task<PageEditDto> GetAsync(string apiSlug, CancellationToken ct = default)
    {
        var page = await FindPageAsync(apiSlug, ct);
        var sectionRows = await _db.PageSections.AsNoTracking().Where(x => x.PageId == page.PageId).ToListAsync(ct);
        var heroRows = await _db.HeroSlides.AsNoTracking().Where(h => h.PageId == page.PageId && h.MediaId != null).OrderBy(h => h.DisplayOrder).ToListAsync(ct);
        var slotRows = await _db.ImageSlots.AsNoTracking().ToListAsync(ct);

        var sections = sectionRows.ToDictionary(x => x.SectionKey, x => PageContentJson.Parse(x.ContentJson));
        long? videoId = sections.TryGetValue("hero", out var h) && h.TryGetValue("videoMediaId", out var v) && long.TryParse(v, out var id) ? id : null;

        var ids = heroRows.Select(r => r.MediaId).Concat(slotRows.Select(r => r.MediaId)).Append(page.OgMediaId).Append(videoId)
            .Where(i => i.HasValue).Select(i => i!.Value).Distinct().ToList();
        var media = (await _db.MediaAssets.AsNoTracking().Where(m => ids.Contains(m.MediaId)).ToListAsync(ct)).ToDictionary(m => m.MediaId, MediaService.ToDto);
        MediaDto? Img(long? mid) => mid is { } x && media.TryGetValue(x, out var m) ? m : null;

        return new PageEditDto(
            PageContentJson.ApiSlug(page.Slug), page.Title, page.MetaTitle, page.MetaDescription, Img(page.OgMediaId),
            sections.ToDictionary(x => x.Key, x => (IReadOnlyDictionary<string, string>)x.Value),
            heroRows.Select(r => Img(r.MediaId)).OfType<MediaDto>().ToList(),
            Img(videoId),
            slotRows.ToDictionary(r => r.SlotKey, r => Img(r.MediaId)));
    }

    public async Task<PageEditDto> SaveAsync(long actorId, string apiSlug, SavePageRequest req, CancellationToken ct = default)
    {
        var page = await FindPageAsync(apiSlug, ct);

        // Everything is validated before anything is written.
        var cleanSections = CleanSections(req.Sections);
        var mediaIds = new HashSet<long>();
        if (req.OgMediaId is { } og) mediaIds.Add(og);
        if (req.HeroMediaIds is { } hm)
        {
            if (hm.Count > MaxHeroPhotos) throw new AppException($"A hero can have at most {MaxHeroPhotos} photos.");
            foreach (var m in hm) mediaIds.Add(m);
        }
        if (req.Slots is { } sl) foreach (var m in sl.Values.OfType<long>()) mediaIds.Add(m);
        if (cleanSections is not null && cleanSections.TryGetValue("hero", out var heroFields) && heroFields.TryGetValue("videoMediaId", out var vs) && vs.Length > 0)
        {
            if (!long.TryParse(vs, out var vid)) throw new AppException("The hero video is not valid.");
            mediaIds.Add(vid);
            if (await _db.MediaAssets.AnyAsync(m => m.MediaId == vid && m.Kind != "video", ct)) throw new AppException("The hero video must be a video file.");
        }
        if (mediaIds.Count > 0)
        {
            var found = await _db.MediaAssets.Where(m => mediaIds.Contains(m.MediaId)).Select(m => m.MediaId).ToListAsync(ct);
            if (found.Count != mediaIds.Count) throw new AppException("One of the chosen photos or videos no longer exists. Please choose it again.");
        }
        if (req.Slots is { } slots)
        {
            var known = await _db.ImageSlots.Select(s => s.SlotKey).ToListAsync(ct);
            var bad = slots.Keys.Where(k => !known.Contains(k)).ToList();
            if (bad.Count > 0) throw new AppException($"Unknown photo position: {string.Join(", ", bad)}.");
        }

        page.MetaTitle = Clean(req.MetaTitle, 160);
        page.MetaDescription = Clean(req.MetaDescription, 320);
        page.OgMediaId = req.OgMediaId;

        if (cleanSections is not null)
        {
            var existing = await _db.PageSections.Where(x => x.PageId == page.PageId).ToListAsync(ct);
            var order = 0;
            foreach (var (key, fields) in cleanSections)
            {
                order++;
                var row = existing.FirstOrDefault(x => x.SectionKey == key);
                if (fields.Count == 0) { if (row is not null) _db.PageSections.Remove(row); continue; }   // all defaults again
                var json = JsonSerializer.Serialize(fields);
                if (row is null) _db.PageSections.Add(new PageSection { PageId = page.PageId, SectionKey = key, SectionType = "text", ContentJson = json, DisplayOrder = order });
                else row.ContentJson = json;
            }
        }

        if (req.HeroMediaIds is { } photos)
        {
            _db.HeroSlides.RemoveRange(await _db.HeroSlides.Where(h => h.PageId == page.PageId).ToListAsync(ct));
            var n = 0;
            foreach (var mid in photos.Distinct()) _db.HeroSlides.Add(new HeroSlide { PageId = page.PageId, MediaId = mid, DisplayOrder = ++n });
        }

        if (req.Slots is { } slotChanges)
        {
            var rows = await _db.ImageSlots.Where(s => slotChanges.Keys.Contains(s.SlotKey)).ToListAsync(ct);
            foreach (var r in rows) r.MediaId = slotChanges[r.SlotKey];
        }

        page.UpdatedAt = DateTime.UtcNow;
        _audit.Record(actorId, "Update", "Page", page.PageId.ToString(), $"/{page.Slug}");
        await _db.SaveChangesAsync(ct);
        return await GetAsync(apiSlug, ct);
    }

    // ---- policies ----

    public async Task<IReadOnlyList<PolicyDto>> ListPoliciesAsync(CancellationToken ct = default)
        => (await _db.PolicyPages.AsNoTracking().OrderBy(p => p.Slug).ToListAsync(ct)).Select(ToDto).ToList();

    public async Task<PolicyDto?> GetPolicyAsync(string slug, CancellationToken ct = default)
        => await _db.PolicyPages.AsNoTracking().Where(p => p.Slug == slug).Select(p => new PolicyDto(p.Slug, p.Title, p.BodyHtml, p.UpdatedAt)).FirstOrDefaultAsync(ct);

    public async Task<PolicyDto> SavePolicyAsync(long actorId, string slug, SavePolicyRequest req, CancellationToken ct = default)
    {
        var row = await _db.PolicyPages.FirstOrDefaultAsync(p => p.Slug == slug, ct) ?? throw new AppException("Policy page not found.", 404);
        if (string.IsNullOrWhiteSpace(req.Title)) throw new AppException("A title is required.");
        if ((req.BodyHtml?.Length ?? 0) > MaxPolicyHtml) throw new AppException("That text is too long.");
        row.Title = req.Title.Trim()[..Math.Min(req.Title.Trim().Length, 150)];
        row.BodyHtml = Sanitizer.Sanitize(req.BodyHtml ?? "");   // headings, paragraphs, lists, links, bold/italic only
        row.UpdatedAt = DateTime.UtcNow;
        _audit.Record(actorId, "Update", "Policy", slug, row.Title);
        await _db.SaveChangesAsync(ct);
        return ToDto(row);
    }

    // ---- helpers ----

    private async Task<Page> FindPageAsync(string apiSlug, CancellationToken ct)
        => await _db.Pages.FirstOrDefaultAsync(p => p.Slug == PageContentJson.DbSlug(apiSlug), ct) ?? throw new AppException("Page not found.", 404);

    private static PolicyDto ToDto(PolicyPage p) => new(p.Slug, p.Title, p.BodyHtml, p.UpdatedAt);

    /// <summary>
    /// Section and field names must be plain identifiers; values are trimmed, length-limited, and have control
    /// characters removed. Empty values are dropped so the page falls back to its built-in wording.
    /// </summary>
    private static Dictionary<string, Dictionary<string, string>>? CleanSections(Dictionary<string, Dictionary<string, string>>? input)
    {
        if (input is null) return null;
        if (input.Count > MaxSections) throw new AppException("Too many sections.");
        var result = new Dictionary<string, Dictionary<string, string>>();
        foreach (var (key, fields) in input)
        {
            if (!SectionKey().IsMatch(key)) throw new AppException($"Invalid section name: {key}.");
            if (fields.Count > MaxFieldsPerSection) throw new AppException("Too many fields in a section.");
            var clean = new Dictionary<string, string>();
            foreach (var (name, raw) in fields)
            {
                if (!FieldKey().IsMatch(name)) throw new AppException($"Invalid field name: {name}.");
                var value = ControlChars().Replace(raw ?? "", "").Replace("\r\n", "\n").Trim();
                if (value.Length > MaxValueLength) throw new AppException($"The text in “{name}” is too long (limit {MaxValueLength} characters).");
                if (value.Length > 0) clean[name] = value;
            }
            result[key] = clean;
        }
        return result;
    }

    private static string? Clean(string? s, int max)
    {
        s = s?.Trim();
        if (string.IsNullOrEmpty(s)) return null;
        return s.Length <= max ? s : s[..max];
    }

    private static HtmlSanitizer BuildSanitizer()
    {
        var s = new HtmlSanitizer();
        s.AllowedTags.Clear();
        foreach (var t in new[] { "h2", "h3", "p", "ul", "ol", "li", "a", "strong", "b", "em", "i", "br", "hr" }) s.AllowedTags.Add(t);
        s.AllowedAttributes.Clear();
        s.AllowedAttributes.Add("href");
        s.AllowedSchemes.Clear();
        foreach (var scheme in new[] { "http", "https", "mailto", "tel" }) s.AllowedSchemes.Add(scheme);
        s.AllowDataAttributes = false;
        return s;
    }

    [GeneratedRegex("^[a-z0-9-]{1,60}$")] private static partial Regex SectionKey();
    [GeneratedRegex("^[A-Za-z0-9]{1,40}$")] private static partial Regex FieldKey();
    [GeneratedRegex(@"[\u0000-\u0008\u000B\u000C\u000E-\u001F]")] private static partial Regex ControlChars();
}

// ---- controllers ----

[ApiController]
[Route("api/admin/pages")]
[Authorize(Policy = Perm.CmsManage)]
public sealed class PagesAdminController : ControllerBase
{
    private readonly IPageAdminService _pages;
    private readonly IOutputCacheStore _cache;
    public PagesAdminController(IPageAdminService pages, IOutputCacheStore cache) { _pages = pages; _cache = cache; }

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct) => Ok(ApiResponse<IReadOnlyList<PageSummaryDto>>.Ok(await _pages.ListAsync(ct)));

    [HttpGet("{slug}")]
    public async Task<IActionResult> Get(string slug, CancellationToken ct) => Ok(ApiResponse<PageEditDto>.Ok(await _pages.GetAsync(slug, ct)));

    [HttpPut("{slug}")]
    public async Task<IActionResult> Save(string slug, SavePageRequest req, CancellationToken ct)
    {
        var dto = await _pages.SaveAsync(User.UserId(), slug, req, ct);
        await _cache.EvictByTagAsync(SiteController.CacheTag, ct);
        return Ok(ApiResponse<PageEditDto>.Ok(dto, "Page saved. The website shows it now."));
    }
}

[ApiController]
public sealed class PoliciesController : ControllerBase
{
    private readonly IPageAdminService _pages;
    private readonly IOutputCacheStore _cache;
    public PoliciesController(IPageAdminService pages, IOutputCacheStore cache) { _pages = pages; _cache = cache; }

    /// <summary>Public: a policy page's title and (already sanitised) body.</summary>
    [HttpGet("api/policies/{slug}")]
    [OutputCache(PolicyName = "public")]
    public async Task<IActionResult> Get(string slug, CancellationToken ct)
    {
        var p = await _pages.GetPolicyAsync(slug, ct);
        return p is null ? NotFound(ApiResponse<PolicyDto>.Fail("Not found.")) : Ok(ApiResponse<PolicyDto>.Ok(p));
    }

    [HttpGet("api/admin/policies")]
    [Authorize(Policy = Perm.CmsManage)]
    public async Task<IActionResult> List(CancellationToken ct) => Ok(ApiResponse<IReadOnlyList<PolicyDto>>.Ok(await _pages.ListPoliciesAsync(ct)));

    [HttpPut("api/admin/policies/{slug}")]
    [Authorize(Policy = Perm.CmsManage)]
    public async Task<IActionResult> Save(string slug, SavePolicyRequest req, CancellationToken ct)
    {
        var dto = await _pages.SavePolicyAsync(User.UserId(), slug, req, ct);
        await _cache.EvictByTagAsync(SiteController.CacheTag, ct);
        return Ok(ApiResponse<PolicyDto>.Ok(dto, "Saved. The website shows it now."));
    }
}
