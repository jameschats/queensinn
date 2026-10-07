using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using queensin.api.Common.Exceptions;
using queensin.api.Data;
using queensin.api.Data.Entities;
using queensin.api.Features.Audit;

namespace queensin.api.Features.Site;

public interface ISiteService
{
    Task<SiteDto> GetAsync(CancellationToken ct = default);
    Task<IReadOnlyDictionary<string, string?>> UpdateSettingsAsync(long actorId, Dictionary<string, string?> values, CancellationToken ct = default);
    Task<ThemeDto> UpdateThemeAsync(long actorId, ThemeDto theme, CancellationToken ct = default);
}

public sealed partial class SiteService : ISiteService
{
    public static readonly ThemeDto DefaultTheme = new("#0F243E", "#C5A880", "#FBFBF9");

    private static readonly int[] HeadingWeights = [400, 500, 600, 700];
    private static readonly int[] BodyWeights = [300, 400, 500, 600];
    private const int MinBaseSize = 14, MaxBaseSize = 22;

    /// <summary>
    /// Settings the admin may edit. Anything else is rejected rather than silently stored,
    /// so a typo in a key can't create a setting nothing reads.
    /// </summary>
    public static readonly HashSet<string> EditableKeys = new(StringComparer.Ordinal)
    {
        "HotelName", "LocationLine", "Phone1", "Phone2", "WhatsAppNumber", "WhatsAppMessage",
        "ReservationsEmail", "SalesEmail", "Address", "MapUrl", "Latitude", "Longitude",
        "CheckInTime", "CheckOutTime", "LogoLightUrl", "LogoDarkUrl", "FaviconUrl",
        "FacebookUrl", "InstagramUrl", "YouTubeUrl", "ReserveAction", "ReserveLabel", "ReserveMessage",
    };

    private readonly QueensInnDbContext _db;
    private readonly IAuditService _audit;

    public SiteService(QueensInnDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public async Task<SiteDto> GetAsync(CancellationToken ct = default)
    {
        // A couple of dozen rows: load them all and filter here, rather than rely on the
        // provider translating HashSet.Contains.
        var rows = await _db.SiteSettings.AsNoTracking().ToListAsync(ct);
        var settings = rows.Where(s => EditableKeys.Contains(s.SettingKey))
            .ToDictionary(s => s.SettingKey, s => s.SettingValue);
        return new SiteDto(settings, await GetThemeAsync(ct));
    }

    public async Task<IReadOnlyDictionary<string, string?>> UpdateSettingsAsync(
        long actorId, Dictionary<string, string?> values, CancellationToken ct = default)
    {
        var unknown = values.Keys.Where(k => !EditableKeys.Contains(k)).ToList();
        if (unknown.Count > 0) throw new AppException($"Unknown setting: {string.Join(", ", unknown)}.");

        if (values.TryGetValue("WhatsAppNumber", out var wa) && !string.IsNullOrEmpty(wa) && !Digits().IsMatch(wa))
            throw new AppException("WhatsApp number must be digits only, with the country code (e.g. 919159399988).");

        if (values.TryGetValue("ReserveAction", out var ra) && !string.IsNullOrEmpty(ra) && ra is not ("whatsapp" or "call" or "enquiry"))
            throw new AppException("The Reserve button can open WhatsApp, call, or go to the enquiry form.");
        if (values.TryGetValue("ReserveLabel", out var rl) && rl is { Length: > 30 }) throw new AppException("The Reserve button text is too long (30 characters at most).");

        var keys = values.Keys.ToList();
        var existing = await _db.SiteSettings.Where(s => keys.Contains(s.SettingKey)).ToListAsync(ct);
        foreach (var (key, raw) in values)
        {
            var value = string.IsNullOrWhiteSpace(raw) ? null : raw.Trim();
            var row = existing.FirstOrDefault(s => s.SettingKey == key);
            if (row is null) _db.SiteSettings.Add(new SiteSetting { SettingKey = key, SettingValue = value });
            else row.SettingValue = value;
        }
        _audit.Record(actorId, "Update", "SiteSettings", null, string.Join(", ", values.Keys));
        await _db.SaveChangesAsync(ct);
        return (await GetAsync(ct)).Settings;
    }

    public async Task<ThemeDto> UpdateThemeAsync(long actorId, ThemeDto theme, CancellationToken ct = default)
    {
        foreach (var (label, hex) in new[] { ("Primary", theme.Primary), ("Accent", theme.Accent), ("Surface", theme.Surface) })
            if (!Hex().IsMatch(hex ?? "")) throw new AppException($"{label} colour must be a hex value like #0F243E.");

        // Readability is enforced here as well as warned about in the admin screen, so the
        // site can never be published with text that cannot be read.
        if (Contrast(theme.Primary, theme.Surface) < 4.5)
            throw new AppException("Primary and Surface are too close in brightness for readable text (needs 4.5:1).");

        // Font names are written into a stylesheet URL and CSS on the public site, so only
        // plain family names are accepted (letters, digits, spaces); the catalogue lives in the web app.
        foreach (var (label, name) in new[] { ("Heading font", theme.HeadingFont), ("Body font", theme.BodyFont) })
            if (!FontName().IsMatch(name ?? "")) throw new AppException($"{label} must be a font family name (letters, numbers and spaces, up to 40 characters).");
        if (!HeadingWeights.Contains(theme.HeadingWeight)) throw new AppException("Heading weight must be 400, 500, 600 or 700.");
        if (!BodyWeights.Contains(theme.BodyWeight)) throw new AppException("Body weight must be 300, 400, 500 or 600.");
        if (theme.BaseSize is < MinBaseSize or > MaxBaseSize) throw new AppException($"Text size must be between {MinBaseSize} and {MaxBaseSize} px.");

        var rows = await _db.ThemeSettings.ToListAsync(ct);
        Set(rows, "HeadingFont", theme.HeadingFont.Trim());
        Set(rows, "BodyFont", theme.BodyFont.Trim());
        Set(rows, "HeadingWeight", theme.HeadingWeight.ToString());
        Set(rows, "BodyWeight", theme.BodyWeight.ToString());
        Set(rows, "BaseSize", theme.BaseSize.ToString());
        Set(rows, "PrimaryColor", theme.Primary.ToUpperInvariant());
        Set(rows, "AccentColor", theme.Accent.ToUpperInvariant());
        Set(rows, "SurfaceColor", theme.Surface.ToUpperInvariant());
        _audit.Record(actorId, "Update", "Theme", null,
            $"{theme.Primary} / {theme.Accent} / {theme.Surface} · {theme.HeadingFont} {theme.HeadingWeight} / {theme.BodyFont} {theme.BodyWeight} · {theme.BaseSize}px");
        await _db.SaveChangesAsync(ct);
        return await GetThemeAsync(ct);
    }

    // --- helpers ---

    private async Task<ThemeDto> GetThemeAsync(CancellationToken ct)
    {
        var t = await _db.ThemeSettings.AsNoTracking().ToDictionaryAsync(s => s.SettingKey, s => s.SettingValue, ct);
        return new ThemeDto(
            t.GetValueOrDefault("PrimaryColor") ?? DefaultTheme.Primary,
            t.GetValueOrDefault("AccentColor") ?? DefaultTheme.Accent,
            t.GetValueOrDefault("SurfaceColor") ?? DefaultTheme.Surface,
            t.GetValueOrDefault("HeadingFont") ?? DefaultTheme.HeadingFont,
            t.GetValueOrDefault("BodyFont") ?? DefaultTheme.BodyFont,
            int.TryParse(t.GetValueOrDefault("HeadingWeight"), out var hw) ? hw : DefaultTheme.HeadingWeight,
            int.TryParse(t.GetValueOrDefault("BodyWeight"), out var bw) ? bw : DefaultTheme.BodyWeight,
            int.TryParse(t.GetValueOrDefault("BaseSize"), out var bs) ? bs : DefaultTheme.BaseSize);
    }

    private void Set(List<ThemeSetting> rows, string key, string value)
    {
        var row = rows.FirstOrDefault(r => r.SettingKey == key);
        if (row is null) _db.ThemeSettings.Add(new ThemeSetting { SettingKey = key, SettingValue = value });
        else row.SettingValue = value;
    }

    /// <summary>WCAG 2.1 contrast ratio between two hex colours.</summary>
    public static double Contrast(string a, string b)
    {
        static double Lum(string hex)
        {
            hex = hex.TrimStart('#');
            double Ch(int i)
            {
                var c = Convert.ToInt32(hex.Substring(i, 2), 16) / 255.0;
                return c <= 0.03928 ? c / 12.92 : Math.Pow((c + 0.055) / 1.055, 2.4);
            }
            return 0.2126 * Ch(0) + 0.7152 * Ch(2) + 0.0722 * Ch(4);
        }
        var (l1, l2) = (Lum(a), Lum(b));
        return (Math.Max(l1, l2) + 0.05) / (Math.Min(l1, l2) + 0.05);
    }

    [GeneratedRegex("^#[0-9a-fA-F]{6}$")]
    private static partial Regex Hex();

    [GeneratedRegex("^[A-Za-z0-9][A-Za-z0-9 ]{1,39}$")]
    private static partial Regex FontName();

    [GeneratedRegex("^[0-9]{10,15}$")]
    private static partial Regex Digits();
}
