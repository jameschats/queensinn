using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using queensin.api.Common.Exceptions;
using queensin.api.Common.Models;
using queensin.api.Common.Security;
using queensin.api.Data;
using queensin.api.Data.Entities;

namespace queensin.api.Features.Analytics;

public sealed record TrackRequest(string? Path, string? Referrer);

public sealed record CountRow(string Label, int Views, int Visitors);
public sealed record SeriesPoint(string Label, int Views, int Visitors);
public sealed record Totals(int Views, int Visitors);
public sealed record AnalyticsDto(
    string From, string To, string Bucket, Totals Current, Totals Previous,
    IReadOnlyList<SeriesPoint> Series, IReadOnlyList<CountRow> TopPages, IReadOnlyList<CountRow> Referrers, IReadOnlyList<CountRow> Devices);

/// <summary>
/// Counts page views without cookies or stored personal data. A visitor is a one-way hash of IP + browser + day + a secret salt,
/// so "visitors" means distinct people per day; over several days the figure is the sum of each day's visitors.
/// Staff are skipped by the website (signed-in browsers do not send), and known bots are skipped here.
/// </summary>
public sealed partial class AnalyticsService
{
    private static readonly TimeSpan Ist = TimeSpan.FromMinutes(330);
    private readonly QueensInnDbContext _db;
    private readonly IConfiguration _config;
    public AnalyticsService(QueensInnDbContext db, IConfiguration config) { _db = db; _config = config; }

    public static DateOnly Today() => DateOnly.FromDateTime(DateTime.UtcNow + Ist);

    public async Task TrackAsync(TrackRequest req, string? ip, string? userAgent, string? ownHost, CancellationToken ct)
    {
        var ua = userAgent ?? "";
        if (ua.Length == 0 || BotPattern().IsMatch(ua)) return;
        var path = (req.Path ?? "/").Split('?', '#')[0].Trim();
        if (path.Length == 0 || path.Length > 150 || !path.StartsWith('/') || path.StartsWith("/admin", StringComparison.OrdinalIgnoreCase)) return;
        if (path.Length > 1) path = path.TrimEnd('/');

        string? referrer = null;
        if (Uri.TryCreate(req.Referrer, UriKind.Absolute, out var r) && (r.Scheme == Uri.UriSchemeHttp || r.Scheme == Uri.UriSchemeHttps))
        {
            var host = r.Host.ToLowerInvariant();
            if (host.StartsWith("www.")) host = host[4..];
            var own = (ownHost ?? "").ToLowerInvariant();
            if (own.StartsWith("www.")) own = own[4..];
            if (host.Length <= 120 && host != own && host != "localhost") referrer = host;
        }

        var now = DateTime.UtcNow;
        var day = DateOnly.FromDateTime(now + Ist);
        var salt = _config["Analytics:Salt"] ?? _config["Jwt:Key"] ?? "queens-inn";
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes($"{salt}|{day:yyyy-MM-dd}|{ip}|{ua}")))[..16].ToLowerInvariant();
        var device = TabletPattern().IsMatch(ua) ? "Tablet" : MobilePattern().IsMatch(ua) ? "Mobile" : "Desktop";

        _db.PageViews.Add(new PageView { ViewedAt = now, Day = day, Path = path, Referrer = referrer, Device = device, VisitorHash = hash });
        await _db.SaveChangesAsync(ct);
    }

    public async Task<AnalyticsDto> GetAsync(DateOnly from, DateOnly to, CancellationToken ct)
    {
        if (to < from) (from, to) = (to, from);
        var days = to.DayNumber - from.DayNumber + 1;
        if (days > 400) throw new AppException("Please choose a range of at most 400 days.");
        var prevTo = from.AddDays(-1);
        var prevFrom = prevTo.AddDays(-(days - 1));

        var q = _db.PageViews.AsNoTracking().Where(v => v.Day >= from && v.Day <= to);
        var daily = await q.GroupBy(v => v.Day)
            .Select(g => new { Day = g.Key, Views = g.Count(), Visitors = g.Select(x => x.VisitorHash).Distinct().Count() })
            .ToListAsync(ct);
        var prev = await _db.PageViews.AsNoTracking().Where(v => v.Day >= prevFrom && v.Day <= prevTo)
            .GroupBy(v => v.Day).Select(g => new { Views = g.Count(), Visitors = g.Select(x => x.VisitorHash).Distinct().Count() }).ToListAsync(ct);

        // Daily bars up to about three months, monthly bars beyond that.
        var monthly = days > 92;
        var byDay = daily.ToDictionary(d => d.Day, d => d);
        var series = new List<SeriesPoint>();
        if (!monthly)
        {
            for (var d = from; d <= to; d = d.AddDays(1))
                series.Add(byDay.TryGetValue(d, out var x) ? new(d.ToString("yyyy-MM-dd"), x.Views, x.Visitors) : new(d.ToString("yyyy-MM-dd"), 0, 0));
        }
        else
        {
            for (var m = new DateOnly(from.Year, from.Month, 1); m <= to; m = m.AddMonths(1))
            {
                var inMonth = daily.Where(d => d.Day.Year == m.Year && d.Day.Month == m.Month).ToList();
                series.Add(new(m.ToString("yyyy-MM"), inMonth.Sum(d => d.Views), inMonth.Sum(d => d.Visitors)));
            }
        }

        var pages = (await q.GroupBy(v => v.Path).Select(g => new { Label = g.Key, Views = g.Count(), Visitors = g.Select(x => x.VisitorHash).Distinct().Count() }).OrderByDescending(r => r.Views).Take(10).ToListAsync(ct)).Select(r => new CountRow(r.Label, r.Views, r.Visitors)).ToList();
        var refs = (await q.GroupBy(v => v.Referrer ?? "").Select(g => new { Label = g.Key, Views = g.Count(), Visitors = g.Select(x => x.VisitorHash).Distinct().Count() }).OrderByDescending(r => r.Views).Take(10).ToListAsync(ct)).Select(r => new CountRow(r.Label, r.Views, r.Visitors)).ToList();
        var devices = (await q.GroupBy(v => v.Device).Select(g => new { Label = g.Key, Views = g.Count(), Visitors = g.Select(x => x.VisitorHash).Distinct().Count() }).OrderByDescending(r => r.Views).ToListAsync(ct)).Select(r => new CountRow(r.Label, r.Views, r.Visitors)).ToList();

        return new AnalyticsDto(from.ToString("yyyy-MM-dd"), to.ToString("yyyy-MM-dd"), monthly ? "month" : "day",
            new Totals(daily.Sum(d => d.Views), daily.Sum(d => d.Visitors)), new Totals(prev.Sum(d => d.Views), prev.Sum(d => d.Visitors)),
            series, pages, refs, devices);
    }

    [GeneratedRegex(@"bot|crawl|spider|slurp|facebookexternalhit|preview|monitor|uptime|lighthouse|headless|curl|wget|python|httpclient|axios|node-fetch", RegexOptions.IgnoreCase)]
    private static partial Regex BotPattern();
    [GeneratedRegex(@"iPad|Tablet|PlayBook|Silk|Android(?!.*Mobile)", RegexOptions.IgnoreCase)] private static partial Regex TabletPattern();
    [GeneratedRegex(@"Mobi|iPhone|iPod|Android", RegexOptions.IgnoreCase)] private static partial Regex MobilePattern();
}

[ApiController]
public sealed class AnalyticsPublicController : ControllerBase
{
    private readonly AnalyticsService _svc;
    public AnalyticsPublicController(AnalyticsService svc) => _svc = svc;

    /// <summary>Called by the website after each page opens. Never fails the page: always answers 204.</summary>
    [HttpPost("api/track")]
    [EnableRateLimiting("track")]
    public async Task<IActionResult> Track(TrackRequest req, CancellationToken ct)
    {
        try { await _svc.TrackAsync(req, HttpContext.Connection.RemoteIpAddress?.ToString(), Request.Headers.UserAgent.ToString(), Request.Host.Host, ct); }
        catch (Exception) { /* counting must never get in a guest's way */ }
        return NoContent();
    }
}

[ApiController]
[Route("api/admin/analytics")]
[Authorize(Policy = Perm.SettingsManage)]
public sealed class AnalyticsAdminController : ControllerBase
{
    private readonly AnalyticsService _svc;
    public AnalyticsAdminController(AnalyticsService svc) => _svc = svc;

    /// <summary>Dates are yyyy-mm-dd (India time). With neither given: the last 30 days.</summary>
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] string? from, [FromQuery] string? to, CancellationToken ct)
    {
        var end = DateOnly.TryParse(to, out var t) ? t : AnalyticsService.Today();
        var start = DateOnly.TryParse(from, out var f) ? f : end.AddDays(-29);
        return Ok(ApiResponse<AnalyticsDto>.Ok(await _svc.GetAsync(start, end, ct)));
    }
}
