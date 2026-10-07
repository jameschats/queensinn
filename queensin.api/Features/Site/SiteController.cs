using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using queensin.api.Common.Models;
using queensin.api.Common.Security;

namespace queensin.api.Features.Site;

[ApiController]
public sealed class SiteController : ControllerBase
{
    public const string CacheTag = "public";

    private readonly ISiteService _site;
    private readonly IFaviconService _favicon;
    private readonly IOutputCacheStore _cache;

    public SiteController(ISiteService site, IFaviconService favicon, IOutputCacheStore cache)
    {
        _site = site;
        _favicon = favicon;
        _cache = cache;
    }

    /// <summary>Settings + theme for the public site. Cached; evicted when an admin saves.</summary>
    [HttpGet("api/site")]
    [OutputCache(PolicyName = "public")]
    public async Task<IActionResult> Get(CancellationToken ct)
        => Ok(ApiResponse<SiteDto>.Ok(await _site.GetAsync(ct)));

    [HttpGet("api/admin/settings")]
    [Authorize(Policy = Perm.SettingsManage)]
    public async Task<IActionResult> GetSettings(CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyDictionary<string, string?>>.Ok((await _site.GetAsync(ct)).Settings));

    [HttpPut("api/admin/settings")]
    [Authorize(Policy = Perm.SettingsManage)]
    public async Task<IActionResult> UpdateSettings(UpdateSettingsRequest request, CancellationToken ct)
    {
        var result = await _site.UpdateSettingsAsync(User.UserId(), request.Settings, ct);
        await _cache.EvictByTagAsync(CacheTag, ct);
        return Ok(ApiResponse<IReadOnlyDictionary<string, string?>>.Ok(result, "Settings saved."));
    }

    [HttpPut("api/admin/theme")]
    [Authorize(Policy = Perm.ThemeManage)]
    public async Task<IActionResult> UpdateTheme(ThemeDto theme, CancellationToken ct)
    {
        var result = await _site.UpdateThemeAsync(User.UserId(), theme, ct);
        await _cache.EvictByTagAsync(CacheTag, ct);
        return Ok(ApiResponse<ThemeDto>.Ok(result, "Theme saved. The website now uses these colours and fonts."));
    }

    /// <summary>Upload a favicon (any square-ish PNG/JPG/WebP, at least 192 px). The server makes every size.</summary>
    [HttpPost("api/admin/settings/favicon")]
    [Authorize(Policy = Perm.SettingsManage)]
    [RequestSizeLimit(12_000_000)]
    public async Task<IActionResult> UploadFavicon(IFormFile file, CancellationToken ct)
    {
        await using var stream = file.OpenReadStream();
        var url = await _favicon.SetAsync(User.UserId(), stream, ct);
        await _cache.EvictByTagAsync(CacheTag, ct);
        return Ok(ApiResponse<object>.Ok(new { url }, "Favicon updated."));
    }

    [HttpDelete("api/admin/settings/favicon")]
    [Authorize(Policy = Perm.SettingsManage)]
    public async Task<IActionResult> ResetFavicon(CancellationToken ct)
    {
        await _favicon.ClearAsync(User.UserId(), ct);
        await _cache.EvictByTagAsync(CacheTag, ct);
        return Ok(ApiResponse<object>.Ok(new { reset = true }, "Favicon reset to the default."));
    }
}
