namespace queensin.api.Data.Entities;

/// <summary>An uploaded image (migration 005). VariantsJson maps pixel width to a WebP URL.</summary>
public sealed class MediaAsset
{
    public long MediaId { get; set; }
    public string Kind { get; set; } = "image";
    public string FileName { get; set; } = string.Empty;
    public string OriginalUrl { get; set; } = string.Empty;
    public string? VariantsJson { get; set; }
    public string? Placeholder { get; set; }
    public int? Width { get; set; }
    public int? Height { get; set; }
    public long SizeBytes { get; set; }
    public string? AltText { get; set; }
    public string? Caption { get; set; }
    public string? Category { get; set; }
    public long? UploadedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
