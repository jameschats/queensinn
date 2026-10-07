namespace queensin.api.Features.Site;

/// <summary>
/// Colours plus typography. The typography fields default so an older client that only
/// sends the three colours still binds.
/// </summary>
public sealed record ThemeDto(
    string Primary, string Accent, string Surface,
    string HeadingFont = "Cormorant Garamond", string BodyFont = "Jost",
    int HeadingWeight = 500, int BodyWeight = 400, int BaseSize = 17);

/// <summary>Everything the public site needs at start-up, in one cached call.</summary>
public sealed record SiteDto(IReadOnlyDictionary<string, string?> Settings, ThemeDto Theme);

public sealed record UpdateSettingsRequest(Dictionary<string, string?> Settings);
