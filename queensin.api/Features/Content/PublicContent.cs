using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.EntityFrameworkCore;
using queensin.api.Common.Models;
using queensin.api.Data;
using queensin.api.Features.Media;

namespace queensin.api.Features.Content;

public sealed record RoomDto(
    long Id, string Slug, string Name, string? Tagline, string? Description, int? SizeSqFt, string? BedType, string? ViewType,
    int MaxGuests, decimal? StartingTariff, string? TaxNote, MediaDto? Image, IReadOnlyList<MediaDto> Images, IReadOnlyList<string> Amenities);

public sealed record AttractionDto(long Id, string Name, decimal DistanceKm, string? Description, MediaDto? Image);

public sealed record TestimonialDto(string Quote, string GuestName, string? Origin);

/// <summary>A card in the sliding strip on the home page.</summary>
public sealed record StripItemDto(long Id, string? Title, string? Caption, string? LinkUrl, MediaDto Image);

/// <summary>
/// One page's editable content. <see cref="Sections"/> maps section key to field values; a field that is
/// absent means "use the built-in default" (the web app holds the defaults). <see cref="HeroVideo"/> is
/// played muted on capable devices; <see cref="HeroPhotos"/> is the slideshow and the fallback.
/// </summary>
public sealed record PageContentDto(
    string Title, string? MetaTitle, string? MetaDescription, MediaDto? OgImage,
    IReadOnlyDictionary<string, IReadOnlyDictionary<string, string>> Sections,
    IReadOnlyList<MediaDto> HeroPhotos, MediaDto? HeroVideo);

/// <summary>Everything the public pages draw from, in one cached call (a few KB of JSON).</summary>
public sealed record PublicContentDto(
    IReadOnlyList<RoomDto> Rooms,
    IReadOnlyList<MediaDto> Gallery,
    IReadOnlyList<StripItemDto> Strip,
    IReadOnlyList<AttractionDto> Attractions,
    IReadOnlyList<TestimonialDto> Testimonials,
    IReadOnlyDictionary<string, MediaDto> Slots,
    IReadOnlyDictionary<string, PageContentDto> Pages);

public interface IPublicContentService
{
    Task<PublicContentDto> GetAsync(CancellationToken ct = default);
}

public sealed class PublicContentService : IPublicContentService
{
    private readonly QueensInnDbContext _db;
    public PublicContentService(QueensInnDbContext db) => _db = db;

    public async Task<PublicContentDto> GetAsync(CancellationToken ct = default)
    {
        var pageRows = await _db.Pages.AsNoTracking().ToListAsync(ct);
        var heroRows = await _db.HeroSlides.AsNoTracking().Where(h => h.MediaId != null).OrderBy(h => h.DisplayOrder).ToListAsync(ct);
        var sectionRows = await _db.PageSections.AsNoTracking().Where(x => x.IsVisible).ToListAsync(ct);
        var rooms = await _db.Rooms.AsNoTracking().Where(r => r.IsActive).OrderBy(r => r.DisplayOrder).ToListAsync(ct);
        var roomIds = rooms.Select(r => r.RoomId).ToList();
        var roomImages = await _db.RoomImages.AsNoTracking().Where(i => roomIds.Contains(i.RoomId)).OrderBy(i => i.DisplayOrder).ToListAsync(ct);
        var amenityLinks = await (from ra in _db.RoomAmenities.AsNoTracking()
                                  join a in _db.Amenities.AsNoTracking() on ra.AmenityId equals a.AmenityId
                                  where roomIds.Contains(ra.RoomId)
                                  orderby a.DisplayOrder
                                  select new { ra.RoomId, a.Name }).ToListAsync(ct);
        var gallery = await _db.GalleryItems.AsNoTracking().Where(g => g.ShowOnHome && g.Placement == "collage").OrderBy(g => g.DisplayOrder).ToListAsync(ct);
        var strip = await _db.GalleryItems.AsNoTracking().Where(g => g.ShowOnHome && g.Placement == "strip").OrderBy(g => g.DisplayOrder).ToListAsync(ct);
        var attractions = await _db.Attractions.AsNoTracking().Where(a => a.IsVisible).OrderBy(a => a.DisplayOrder).ToListAsync(ct);
        var slotRows = await _db.ImageSlots.AsNoTracking().Where(x => x.MediaId != null).ToListAsync(ct);
        var quotes = await _db.Testimonials.AsNoTracking().Where(t => t.IsVisible).OrderBy(t => t.DisplayOrder).ToListAsync(ct);

        // One query for every image referenced above.
        var sections = sectionRows.GroupBy(x => x.PageId).ToDictionary(
            g => g.Key,
            g => (IReadOnlyDictionary<string, IReadOnlyDictionary<string, string>>)g.ToDictionary(x => x.SectionKey, x => PageContentJson.Parse(x.ContentJson)));
        long? VideoId(long pageId) => sections.TryGetValue(pageId, out var sx) && sx.TryGetValue("hero", out var hero)
            && hero.TryGetValue("videoMediaId", out var v) && long.TryParse(v, out var id) ? id : null;

        var ids = heroRows.Select(h => h.MediaId).Concat(pageRows.Select(p => p.OgMediaId)).Concat(pageRows.Select(p => VideoId(p.PageId)))
            .Concat(rooms.Select(r => r.FeaturedMediaId)).Concat(roomImages.Select(i => (long?)i.MediaId))
            .Concat(gallery.Select(g => (long?)g.MediaId)).Concat(strip.Select(g => (long?)g.MediaId)).Concat(attractions.Select(a => a.MediaId)).Concat(slotRows.Select(x => x.MediaId))
            .Where(i => i.HasValue).Select(i => i!.Value).Distinct().ToList();
        var media = (await _db.MediaAssets.AsNoTracking().Where(m => ids.Contains(m.MediaId)).ToListAsync(ct))
            .ToDictionary(m => m.MediaId, MediaService.ToDto);
        MediaDto? Img(long? id) => id is { } v && media.TryGetValue(v, out var m) ? m : null;

        var empty = new Dictionary<string, IReadOnlyDictionary<string, string>>();
        var pages = pageRows.ToDictionary(
            p => PageContentJson.ApiSlug(p.Slug),
            p => new PageContentDto(p.Title, p.MetaTitle, p.MetaDescription, Img(p.OgMediaId),
                sections.TryGetValue(p.PageId, out var sx) ? sx : empty,
                heroRows.Where(h => h.PageId == p.PageId).Select(h => Img(h.MediaId)).OfType<MediaDto>().ToList(),
                Img(VideoId(p.PageId))));

        return new PublicContentDto(
            rooms.Select(r => new RoomDto(r.RoomId, r.Slug, r.Name, r.Tagline, r.Description, r.SizeSqFt, r.BedType, r.ViewType, r.MaxGuests,
                r.StartingTariff, r.TaxNote, Img(r.FeaturedMediaId),
                roomImages.Where(i => i.RoomId == r.RoomId).Select(i => Img(i.MediaId)).OfType<MediaDto>().ToList(),
                amenityLinks.Where(a => a.RoomId == r.RoomId).Select(a => a.Name).ToList())).ToList(),
            gallery.Select(g => Img(g.MediaId)).OfType<MediaDto>().ToList(),
            strip.Where(g => Img(g.MediaId) != null).Select(g => new StripItemDto(g.GalleryItemId, g.Title, g.Caption, g.LinkUrl, Img(g.MediaId)!)).ToList(),
            attractions.Select(a => new AttractionDto(a.AttractionId, a.Name, a.DistanceKm, a.Description, Img(a.MediaId))).ToList(),
            quotes.Select(t => new TestimonialDto(t.Quote, t.GuestName, t.Origin)).ToList(),
            slotRows.Where(x => Img(x.MediaId) != null).ToDictionary(x => x.SlotKey, x => Img(x.MediaId)!),
            pages);
    }
}

[ApiController]
public sealed class ContentController : ControllerBase
{
    private readonly IPublicContentService _content;
    public ContentController(IPublicContentService content) => _content = content;

    [HttpGet("api/content")]
    [OutputCache(PolicyName = "public")]
    public async Task<IActionResult> Get(CancellationToken ct) => Ok(ApiResponse<PublicContentDto>.Ok(await _content.GetAsync(ct)));
}
