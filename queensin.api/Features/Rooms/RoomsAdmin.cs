using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.EntityFrameworkCore;
using queensin.api.Common.Exceptions;
using queensin.api.Common.Models;
using queensin.api.Common.Security;
using queensin.api.Data;
using queensin.api.Data.Entities;
using queensin.api.Features.Audit;
using queensin.api.Features.Media;
using queensin.api.Features.Site;

namespace queensin.api.Features.Rooms;

public sealed record AmenityDto(long Id, string Name, string? Icon);

public sealed record RoomAdminDto(
    long Id, string Slug, string Name, string? Tagline, string? Description, int? SizeSqFt, string? BedType, string? ViewType,
    int MaxGuests, decimal? StartingTariff, string? TaxNote, bool IsActive, int DisplayOrder,
    MediaDto? Featured, IReadOnlyList<MediaDto> Images, IReadOnlyList<long> AmenityIds);

public sealed record SaveRoomRequest(
    string Name, string? Tagline, string? Description, int? SizeSqFt, string? BedType, string? ViewType,
    int MaxGuests, decimal? StartingTariff, string? TaxNote, bool IsActive,
    long? FeaturedMediaId, List<long>? ImageIds, List<long>? AmenityIds);

public sealed record CreateAmenityRequest(string Name);

public interface IRoomsAdminService
{
    Task<IReadOnlyList<RoomAdminDto>> ListAsync(CancellationToken ct = default);
    Task<RoomAdminDto> GetAsync(long id, CancellationToken ct = default);
    Task<RoomAdminDto> CreateAsync(long actorId, SaveRoomRequest req, CancellationToken ct = default);
    Task<RoomAdminDto> UpdateAsync(long actorId, long id, SaveRoomRequest req, CancellationToken ct = default);
    Task ReorderAsync(long actorId, List<long> orderedIds, CancellationToken ct = default);
    Task DeleteAsync(long actorId, long id, CancellationToken ct = default);
    Task<IReadOnlyList<AmenityDto>> AmenitiesAsync(CancellationToken ct = default);
    Task<AmenityDto> CreateAmenityAsync(long actorId, string name, CancellationToken ct = default);
}

public sealed partial class RoomsAdminService : IRoomsAdminService
{
    private const int MaxImages = 12, MaxRooms = 30;
    private readonly QueensInnDbContext _db;
    private readonly IAuditService _audit;

    public RoomsAdminService(QueensInnDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public async Task<IReadOnlyList<RoomAdminDto>> ListAsync(CancellationToken ct = default)
    {
        var rooms = await _db.Rooms.AsNoTracking().OrderBy(r => r.DisplayOrder).ThenBy(r => r.RoomId).ToListAsync(ct);
        return await ToDtosAsync(rooms, ct);
    }

    public async Task<RoomAdminDto> GetAsync(long id, CancellationToken ct = default)
    {
        var room = await _db.Rooms.AsNoTracking().FirstOrDefaultAsync(r => r.RoomId == id, ct) ?? throw new AppException("Room not found.", 404);
        return (await ToDtosAsync([room], ct))[0];
    }

    public async Task<RoomAdminDto> CreateAsync(long actorId, SaveRoomRequest req, CancellationToken ct = default)
    {
        if (await _db.Rooms.CountAsync(ct) >= MaxRooms) throw new AppException($"There can be at most {MaxRooms} room categories.");
        var room = new Room { Slug = await UniqueSlugAsync(req.Name, ct), DisplayOrder = (await _db.Rooms.MaxAsync(r => (int?)r.DisplayOrder, ct) ?? 0) + 1 };
        await ApplyAsync(room, req, ct);
        _db.Rooms.Add(room);
        await _db.SaveChangesAsync(ct);                 // need the id before the link rows
        await SetLinksAsync(room.RoomId, req, ct);
        _audit.Record(actorId, "Create", "Room", room.RoomId.ToString(), room.Name);
        await _db.SaveChangesAsync(ct);
        return await GetAsync(room.RoomId, ct);
    }

    public async Task<RoomAdminDto> UpdateAsync(long actorId, long id, SaveRoomRequest req, CancellationToken ct = default)
    {
        var room = await _db.Rooms.FirstOrDefaultAsync(r => r.RoomId == id, ct) ?? throw new AppException("Room not found.", 404);
        await ApplyAsync(room, req, ct);              // the slug is never changed: it is part of public links
        await SetLinksAsync(id, req, ct);
        _audit.Record(actorId, "Update", "Room", id.ToString(), room.Name);
        await _db.SaveChangesAsync(ct);
        return await GetAsync(id, ct);
    }

    public async Task ReorderAsync(long actorId, List<long> orderedIds, CancellationToken ct = default)
    {
        var rooms = await _db.Rooms.ToListAsync(ct);
        if (orderedIds.Distinct().Count() != orderedIds.Count || orderedIds.Any(i => rooms.All(r => r.RoomId != i))) throw new AppException("That order is not valid. Please refresh and try again.");
        var n = 0;
        foreach (var id in orderedIds) rooms.First(r => r.RoomId == id).DisplayOrder = ++n;
        foreach (var r in rooms.Where(r => !orderedIds.Contains(r.RoomId))) r.DisplayOrder = ++n;   // anything not listed keeps its place at the end
        _audit.Record(actorId, "Update", "Room", null, "Reordered rooms");
        await _db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(long actorId, long id, CancellationToken ct = default)
    {
        var room = await _db.Rooms.FirstOrDefaultAsync(r => r.RoomId == id, ct) ?? throw new AppException("Room not found.", 404);
        _db.Rooms.Remove(room);       // its photos and amenities go too; past enquiries keep their details but lose the room link
        _audit.Record(actorId, "Delete", "Room", id.ToString(), room.Name);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<AmenityDto>> AmenitiesAsync(CancellationToken ct = default)
        => await _db.Amenities.AsNoTracking().OrderBy(a => a.DisplayOrder).ThenBy(a => a.AmenityId).Select(a => new AmenityDto(a.AmenityId, a.Name, a.Icon)).ToListAsync(ct);

    public async Task<AmenityDto> CreateAmenityAsync(long actorId, string name, CancellationToken ct = default)
    {
        name = (name ?? "").Trim();
        if (name.Length is < 2 or > 80) throw new AppException("An amenity name needs 2 to 80 characters.");
        var existing = await _db.Amenities.FirstOrDefaultAsync(a => a.Name == name, ct);
        if (existing is not null) return new AmenityDto(existing.AmenityId, existing.Name, existing.Icon);
        var a = new Amenity { Name = name, DisplayOrder = (await _db.Amenities.MaxAsync(x => (int?)x.DisplayOrder, ct) ?? 0) + 1 };
        _db.Amenities.Add(a);
        _audit.Record(actorId, "Create", "Amenity", null, name);
        await _db.SaveChangesAsync(ct);
        return new AmenityDto(a.AmenityId, a.Name, a.Icon);
    }

    // ---- helpers ----

    private async Task ApplyAsync(Room room, SaveRoomRequest r, CancellationToken ct)
    {
        var name = (r.Name ?? "").Trim();
        if (name.Length is < 2 or > 120) throw new AppException("Please give the room a name (2 to 120 characters).");
        if (r.MaxGuests is < 1 or > 20) throw new AppException("Maximum guests must be between 1 and 20.");
        if (r.SizeSqFt is < 50 or > 5000) throw new AppException("Size must be between 50 and 5,000 sq ft (or leave it blank).");
        if (r.StartingTariff is < 0 or > 1_000_000) throw new AppException("The tariff must be between 0 and 10,00,000 (or leave it blank).");

        room.Name = name;
        room.Tagline = Clean(r.Tagline, 200);
        room.Description = Clean(r.Description, 3000);
        room.SizeSqFt = r.SizeSqFt;
        room.BedType = Clean(r.BedType, 80);
        room.ViewType = Clean(r.ViewType, 80);
        room.MaxGuests = r.MaxGuests;
        room.StartingTariff = r.StartingTariff;
        room.TaxNote = Clean(r.TaxNote, 60);
        room.IsActive = r.IsActive;

        var images = (r.ImageIds ?? []).Distinct().ToList();
        if (images.Count > MaxImages) throw new AppException($"A room can have at most {MaxImages} photos.");
        var mediaIds = images.Concat(r.FeaturedMediaId is { } f ? [f] : Array.Empty<long>()).Distinct().ToList();
        if (mediaIds.Count > 0)
        {
            var found = await _db.MediaAssets.Where(m => mediaIds.Contains(m.MediaId)).Select(m => new { m.MediaId, m.Kind }).ToListAsync(ct);
            if (found.Count != mediaIds.Count) throw new AppException("One of the chosen photos no longer exists. Please choose it again.");
            if (found.Any(m => m.Kind != "image")) throw new AppException("Rooms can only use photos, not videos.");
        }
        room.FeaturedMediaId = r.FeaturedMediaId;

        var amenityIds = (r.AmenityIds ?? []).Distinct().ToList();
        if (amenityIds.Count > 0 && await _db.Amenities.CountAsync(a => amenityIds.Contains(a.AmenityId), ct) != amenityIds.Count)
            throw new AppException("One of the chosen amenities no longer exists. Please refresh and try again.");
    }

    private async Task SetLinksAsync(long roomId, SaveRoomRequest r, CancellationToken ct)
    {
        if (r.ImageIds is not null)
        {
            _db.RoomImages.RemoveRange(await _db.RoomImages.Where(i => i.RoomId == roomId).ToListAsync(ct));
            var n = 0;
            foreach (var id in r.ImageIds.Distinct()) _db.RoomImages.Add(new RoomImage { RoomId = roomId, MediaId = id, DisplayOrder = ++n });
        }
        if (r.AmenityIds is not null)
        {
            _db.RoomAmenities.RemoveRange(await _db.RoomAmenities.Where(a => a.RoomId == roomId).ToListAsync(ct));
            foreach (var id in r.AmenityIds.Distinct()) _db.RoomAmenities.Add(new RoomAmenity { RoomId = roomId, AmenityId = id });
        }
    }

    private async Task<string> UniqueSlugAsync(string name, CancellationToken ct)
    {
        var baseSlug = NonSlug().Replace((name ?? "").Trim().ToLowerInvariant(), "-").Trim('-');
        if (baseSlug.Length == 0) baseSlug = "room";
        if (baseSlug.Length > 100) baseSlug = baseSlug[..100].Trim('-');
        var slug = baseSlug;
        for (var i = 2; await _db.Rooms.AnyAsync(r => r.Slug == slug, ct); i++) slug = $"{baseSlug}-{i}";
        return slug;
    }

    private async Task<IReadOnlyList<RoomAdminDto>> ToDtosAsync(List<Room> rooms, CancellationToken ct)
    {
        var ids = rooms.Select(r => r.RoomId).ToList();
        var images = await _db.RoomImages.AsNoTracking().Where(i => ids.Contains(i.RoomId)).OrderBy(i => i.DisplayOrder).ToListAsync(ct);
        var amenities = await _db.RoomAmenities.AsNoTracking().Where(a => ids.Contains(a.RoomId)).ToListAsync(ct);
        var mediaIds = images.Select(i => i.MediaId).Concat(rooms.Where(r => r.FeaturedMediaId != null).Select(r => r.FeaturedMediaId!.Value)).Distinct().ToList();
        var media = (await _db.MediaAssets.AsNoTracking().Where(m => mediaIds.Contains(m.MediaId)).ToListAsync(ct)).ToDictionary(m => m.MediaId, MediaService.ToDto);
        return rooms.Select(r => new RoomAdminDto(r.RoomId, r.Slug, r.Name, r.Tagline, r.Description, r.SizeSqFt, r.BedType, r.ViewType, r.MaxGuests, r.StartingTariff, r.TaxNote,
            r.IsActive, r.DisplayOrder,
            r.FeaturedMediaId is { } f && media.TryGetValue(f, out var fm) ? fm : null,
            images.Where(i => i.RoomId == r.RoomId).Select(i => media.GetValueOrDefault(i.MediaId)).OfType<MediaDto>().ToList(),
            amenities.Where(a => a.RoomId == r.RoomId).Select(a => a.AmenityId).ToList())).ToList();
    }

    private static string? Clean(string? s, int max)
    {
        s = s is null ? null : Regex.Replace(s, @"[\u0000-\u0008\u000B\u000C\u000E-\u001F]", "").Replace("\r\n", "\n").Trim();
        if (string.IsNullOrEmpty(s)) return null;
        return s.Length <= max ? s : throw new AppException($"One of the texts is too long (the limit is {max} characters).");
    }

    [GeneratedRegex("[^a-z0-9]+")] private static partial Regex NonSlug();
}

[ApiController]
[Route("api/admin")]
[Authorize(Policy = Perm.RoomManage)]
public sealed class RoomsAdminController : ControllerBase
{
    private readonly IRoomsAdminService _rooms;
    private readonly IOutputCacheStore _cache;
    public RoomsAdminController(IRoomsAdminService rooms, IOutputCacheStore cache) { _rooms = rooms; _cache = cache; }

    [HttpGet("rooms")]
    public async Task<IActionResult> List(CancellationToken ct) => Ok(ApiResponse<IReadOnlyList<RoomAdminDto>>.Ok(await _rooms.ListAsync(ct)));

    [HttpGet("rooms/{id:long}")]
    public async Task<IActionResult> Get(long id, CancellationToken ct) => Ok(ApiResponse<RoomAdminDto>.Ok(await _rooms.GetAsync(id, ct)));

    [HttpPost("rooms")]
    public async Task<IActionResult> Create(SaveRoomRequest req, CancellationToken ct)
    {
        var dto = await _rooms.CreateAsync(User.UserId(), req, ct);
        await _cache.EvictByTagAsync(SiteController.CacheTag, ct);
        return Ok(ApiResponse<RoomAdminDto>.Ok(dto, "Room added."));
    }

    [HttpPut("rooms/{id:long}")]
    public async Task<IActionResult> Update(long id, SaveRoomRequest req, CancellationToken ct)
    {
        var dto = await _rooms.UpdateAsync(User.UserId(), id, req, ct);
        await _cache.EvictByTagAsync(SiteController.CacheTag, ct);
        return Ok(ApiResponse<RoomAdminDto>.Ok(dto, "Room saved. The website shows it now."));
    }

    [HttpPut("rooms/order")]
    public async Task<IActionResult> Reorder(List<long> orderedIds, CancellationToken ct)
    {
        await _rooms.ReorderAsync(User.UserId(), orderedIds, ct);
        await _cache.EvictByTagAsync(SiteController.CacheTag, ct);
        return Ok(ApiResponse<object>.Ok(new { ok = true }, "Order saved."));
    }

    [HttpDelete("rooms/{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    {
        await _rooms.DeleteAsync(User.UserId(), id, ct);
        await _cache.EvictByTagAsync(SiteController.CacheTag, ct);
        return Ok(ApiResponse<object>.Ok(new { deleted = true }, "Room deleted."));
    }

    [HttpGet("amenities")]
    public async Task<IActionResult> Amenities(CancellationToken ct) => Ok(ApiResponse<IReadOnlyList<AmenityDto>>.Ok(await _rooms.AmenitiesAsync(ct)));

    [HttpPost("amenities")]
    public async Task<IActionResult> CreateAmenity(CreateAmenityRequest req, CancellationToken ct)
        => Ok(ApiResponse<AmenityDto>.Ok(await _rooms.CreateAmenityAsync(User.UserId(), req.Name, ct), "Amenity added."));
}
