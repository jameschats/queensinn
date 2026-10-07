namespace queensin.api.Data.Entities;

/// <summary>Room category (migration 006).</summary>
public sealed class Room
{
    public long RoomId { get; set; }
    public string Slug { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Tagline { get; set; }
    public string? Description { get; set; }
    public int? SizeSqFt { get; set; }
    public string? BedType { get; set; }
    public string? ViewType { get; set; }
    public int MaxGuests { get; set; }
    public decimal? StartingTariff { get; set; }
    public string? TaxNote { get; set; }
    public long? FeaturedMediaId { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; }
}

public sealed class RoomImage
{
    public long RoomId { get; set; }
    public long MediaId { get; set; }
    public int DisplayOrder { get; set; }
}

public sealed class Amenity
{
    public long AmenityId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Icon { get; set; }
    public int DisplayOrder { get; set; }
}

public sealed class RoomAmenity
{
    public long RoomId { get; set; }
    public long AmenityId { get; set; }
}

/// <summary>Page row carrying the SEO fields (migration 007). Slug is '' for Home.</summary>
public sealed class Page
{
    public long PageId { get; set; }
    public string Slug { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? MetaTitle { get; set; }
    public string? MetaDescription { get; set; }
}

public sealed class HeroSlide
{
    public long SlideId { get; set; }
    public long PageId { get; set; }
    public long? MediaId { get; set; }
    public string? VideoUrl { get; set; }
    public string? Kicker { get; set; }
    public string? Headline { get; set; }
    public string? SubHeadline { get; set; }
    public string? CtaText { get; set; }
    public string? CtaUrl { get; set; }
    public int DisplayOrder { get; set; }
}

public sealed class Attraction
{
    public long AttractionId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal DistanceKm { get; set; }
    public string? Description { get; set; }
    public long? MediaId { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsVisible { get; set; }
}

public sealed class GalleryItem
{
    public long GalleryItemId { get; set; }
    public long? CategoryId { get; set; }
    public long MediaId { get; set; }
    public int DisplayOrder { get; set; }
    public bool ShowOnHome { get; set; }
}

public sealed class Testimonial
{
    public long TestimonialId { get; set; }
    public string Quote { get; set; } = string.Empty;
    public string GuestName { get; set; } = string.Empty;
    public string? Origin { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsVisible { get; set; }
}

/// <summary>A named photo position on the public pages (migration 011).</summary>
public sealed class ImageSlot
{
    public string SlotKey { get; set; } = string.Empty;
    public long? MediaId { get; set; }
}
