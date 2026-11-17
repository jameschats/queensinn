namespace queensin.api.Data.Entities;

/// <summary>One counted page view (migration 029). Holds no personal data.</summary>
public sealed class PageView
{
    public long PageViewId { get; set; }
    public DateTime ViewedAt { get; set; }
    public DateOnly Day { get; set; }
    public string Path { get; set; } = "/";
    public string? Referrer { get; set; }
    public string Device { get; set; } = "Desktop";
    public string VisitorHash { get; set; } = string.Empty;
}
