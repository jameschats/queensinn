using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using queensin.api.Common.Models;
using queensin.api.Common.Security;
using queensin.api.Features.Site;

namespace queensin.api.Features.Media;

[ApiController]
[Route("api/admin/media")]
[Authorize(Policy = Perm.MediaManage)]
public sealed class MediaController : ControllerBase
{
    private readonly IMediaService _media;
    private readonly IOutputCacheStore _cache;

    public MediaController(IMediaService media, IOutputCacheStore cache)
    {
        _media = media;
        _cache = cache;
    }

    [HttpGet("categories")]
    public IActionResult Categories() => Ok(ApiResponse<string[]>.Ok(MediaService.Categories));

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? category, [FromQuery] string? q,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 24, CancellationToken ct = default)
        => Ok(ApiResponse<PagedResult<MediaDto>>.Ok(await _media.ListAsync(category, q, page, pageSize, ct)));

    /// <summary>Upload one image. Several files are sent as several requests so each gets its own result.</summary>
    [HttpPost]
    [RequestSizeLimit(32_000_000)]
    public async Task<IActionResult> Upload(IFormFile file, [FromForm] string? category, [FromForm] string? altText,
        [FromForm] string? caption, CancellationToken ct)
    {
        await using var stream = file.OpenReadStream();
        var dto = await _media.SaveImageAsync(stream, file.FileName, category, altText, caption, User.UserId(), ct);
        await _cache.EvictByTagAsync(SiteController.CacheTag, ct);
        return Ok(ApiResponse<MediaDto>.Ok(dto, "Image uploaded."));
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, UpdateMediaRequest req, CancellationToken ct)
    {
        var dto = await _media.UpdateAsync(User.UserId(), id, req, ct);
        await _cache.EvictByTagAsync(SiteController.CacheTag, ct);
        return Ok(ApiResponse<MediaDto>.Ok(dto, "Image updated."));
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    {
        await _media.DeleteAsync(User.UserId(), id, ct);
        await _cache.EvictByTagAsync(SiteController.CacheTag, ct);
        return Ok(ApiResponse<object>.Ok(new { deleted = true }, "Image deleted."));
    }
}
