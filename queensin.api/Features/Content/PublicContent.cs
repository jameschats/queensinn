using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.EntityFrameworkCore;
using queensin.api.Common.Models;
using queensin.api.Data;
using queensin.api.Features.Media;

namespace queensin.api.Features.Content;

public sealed record HeroSlideDto(long Id, string? Kicker, string? Headline, string? SubHeadline, string? CtaText, string? CtaUrl, MediaDto? Image);

public sealed record RoomDto(
    long Id, string Slug, string Name, string? Tagline, string? Description, int? SizeSqFt, string? BedType, string? ViewType,
    int MaxGuests, decimal? StartingTariff, string? TaxNote, MediaDto? Image, IReadOnlyList<MediaDto> Images, IReadOnlyList<string> Amenities);

public sealed record AttractionDto(long Id, string Name, decimal DistanceKm, string? Description, MediaDto? Image);

public sealed record TestimonialDto(string Quote, string GuestName, string? Origin);

/// <summary>Everything the public pages draw from, in one cached call (a few KB of JSON).</summary>
public sealed record PublicContentDto(
    IReadOnlyList<HeroSlideDto> Hero,
    IReadOnlyList<RoomDto> Rooms,
    IReadOnlyList<MediaDto> Gallery,
    IReadOnlyList<AttractionDto> Attractions,
    IReadOnlyList<TestimonialDto> Testimonials,
    IReadOnlyDictionary<string, MediaDto> Slots);

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
        var homeId = await _db.Pages.AsNoTracking().Where(p => p.Slug == "").Select(p => (long?)p.PageId).FirstOrDefaultAsync(ct);
        var slides = homeId is null ? [] : await _db.HeroSlides.AsNoTracking().Where(s => s.PageId == homeId).OrderBy(s => s.DisplayOrder).ToListAsync(ct);
        var rooms = await _db.Rooms.AsNoTracking().Where(r => r.IsActive).OrderBy(r => r.DisplayOrder).ToListAsync(ct);
        var roomIds = rooms.Select(r => r.RoomId).ToList();
        var roomImages = await _db.RoomImages.AsNoTracking().Where(i => roomIds.Contains(i.RoomId)).OrderBy(i => i.DisplayOrder).ToListAsync(ct);
        var amenityLinks = await (from ra in _db.RoomAmenities.AsNoTracking()
                                  join a in _db.Amenities.AsNoTracking() on ra.AmenityId equals a.AmenityId
                                  where roomIds.Contains(ra.RoomId)
                                  orderby a.DisplayOrder
                                  select new { ra.RoomId, a.Name }).ToListAsync(ct);
        var gallery = await _db.GalleryItems.AsNoTracking().Where(g => g.ShowOnHome).OrderBy(g => g.DisplayOrder).ToListAsync(ct);
        var attractions = await _db.Attractions.AsNoTracking().Where(a => a.IsVisible).OrderBy(a => a.DisplayOrder).ToListAsync(ct);
        var slotRows = await _db.ImageSlots.AsNoTracking().Where(x => x.MediaId != null).ToListAsync(ct);
        var quotes = await _db.Testimonials.AsNoTracking().Where(t => t.IsVisible).OrderBy(t => t.DisplayOrder).ToListAsync(ct);

        // One query for every image referenced above.
        var ids = slides.Select(s => s.MediaId).Concat(rooms.Select(r => r.FeaturedMediaId)).Concat(roomImages.Select(i => (long?)i.MediaId))
            .Concat(gallery.Select(g => (long?)g.MediaId)).Concat(attractions.Select(a => a.MediaId)).Concat(slotRows.Select(x => x.MediaId))
            .Where(i => i.HasValue).Select(i => i!.Value).Distinct().ToList();
        var media = (await _db.MediaAssets.AsNoTracking().Where(m => ids.Contains(m.MediaId)).ToListAsync(ct))
            .ToDictionary(m => m.MediaId, MediaService.ToDto);
        MediaDto? Img(long? id) => id is { } v && media.TryGetValue(v, out var m) ? m : null;

        return new PublicContentDto(
            slides.Select(s => new HeroSlideDto(s.SlideId, s.Kicker, s.Headline, s.SubHeadline, s.CtaText, s.CtaUrl, Img(s.MediaId))).ToList(),
            rooms.Select(r => new RoomDto(r.RoomId, r.Slug, r.Name, r.Tagline, r.Description, r.SizeSqFt, r.BedType, r.ViewType, r.MaxGuests,
                r.StartingTariff, r.TaxNote, Img(r.FeaturedMediaId),
                roomImages.Where(i => i.RoomId == r.RoomId).Select(i => Img(i.MediaId)).OfType<MediaDto>().ToList(),
                amenityLinks.Where(a => a.RoomId == r.RoomId).Select(a => a.Name).ToList())).ToList(),
            gallery.Select(g => Img(g.MediaId)).OfType<MediaDto>().ToList(),
            attractions.Select(a => new AttractionDto(a.AttractionId, a.Name, a.DistanceKm, a.Description, Img(a.MediaId))).ToList(),
            quotes.Select(t => new TestimonialDto(t.Quote, t.GuestName, t.Origin)).ToList(),
            slotRows.Where(x => Img(x.MediaId) != null).ToDictionary(x => x.SlotKey, x => Img(x.MediaId)!));
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
