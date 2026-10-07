using System.Text.RegularExpressions;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using MimeKit;
using queensin.api.Common.Exceptions;
using queensin.api.Common.Models;
using queensin.api.Common.Security;
using queensin.api.Data;
using queensin.api.Data.Entities;
using queensin.api.Features.Audit;

namespace queensin.api.Features.Enquiries;

public static class EnquiryTypes
{
    public const string Room = "Room", Mahal = "Mahal", Contact = "Contact";
    public static readonly string[] All = [Room, Mahal, Contact];
}

public static class EnquiryStatuses
{
    public static readonly string[] All = ["New", "Contacted", "Confirmed", "Lost"];
}

// ---- contracts ----

/// <summary>What the website's forms send. Only the fields relevant to <see cref="Type"/> are used.</summary>
public sealed record CreateEnquiryRequest(
    string Type, string Name, string Phone, string? Email,
    DateOnly? CheckIn, DateOnly? CheckOut, long? RoomId, string? Guests,
    string? EventType, DateOnly? EventDate, DateOnly? AltDate, string? GuestCount, string? RoomsNeeded,
    string? Subject, string? Message, string? SourcePage,
    /// <summary>Honeypot: hidden from people, filled in by bots.</summary>
    string? Website);

public sealed record EnquiryReceiptDto(string Reference, string Message);

public sealed record EnquirySummaryDto(
    long Id, string Reference, string Type, string Status, string Name, string Phone, string? Email, string Detail, DateTime CreatedAt);

public sealed record EnquiryNoteDto(long Id, string Note, string? By, DateTime CreatedAt);

public sealed record EnquiryDetailDto(
    long Id, string Reference, string Type, string Status, string Name, string Phone, string? Email,
    DateOnly? CheckIn, DateOnly? CheckOut, string? RoomName, string? Guests,
    string? EventType, DateOnly? EventDate, DateOnly? AltDate, string? GuestCount, string? RoomsNeeded,
    string? Subject, string? Message, string? SourcePage, DateTime CreatedAt,
    IReadOnlyList<EnquiryNoteDto> Notes);

public sealed record EnquiryCountsDto(int New, int Total, IReadOnlyDictionary<string, int> ByStatus);
public sealed record SetStatusRequest(string Status);
public sealed record AddNoteRequest(string Note);

// ---- email ----

/// <summary>Tells staff a new enquiry has arrived. Does nothing (and says so in the log) until Smtp:Host is configured.</summary>
public interface IEnquiryNotifier
{
    Task NotifyAsync(Enquiry e, string reference, string? roomName, CancellationToken ct);
}

public sealed class SmtpEnquiryNotifier : IEnquiryNotifier
{
    private readonly IConfiguration _config;
    private readonly QueensInnDbContext _db;
    private readonly ILogger<SmtpEnquiryNotifier> _log;

    public SmtpEnquiryNotifier(IConfiguration config, QueensInnDbContext db, ILogger<SmtpEnquiryNotifier> log)
    {
        _config = config;
        _db = db;
        _log = log;
    }

    public async Task NotifyAsync(Enquiry e, string reference, string? roomName, CancellationToken ct)
    {
        var host = _config["Smtp:Host"];
        if (string.IsNullOrWhiteSpace(host)) { _log.LogInformation("Enquiry {Ref} saved; email not sent because Smtp:Host is not configured.", reference); return; }

        try
        {
            var settings = await _db.SiteSettings.AsNoTracking().Where(s => s.SettingKey == "ReservationsEmail" || s.SettingKey == "SalesEmail").ToDictionaryAsync(s => s.SettingKey, s => s.SettingValue, ct);
            var to = e.Type == EnquiryTypes.Mahal ? (settings.GetValueOrDefault("SalesEmail") ?? settings.GetValueOrDefault("ReservationsEmail")) : settings.GetValueOrDefault("ReservationsEmail");
            if (string.IsNullOrWhiteSpace(to)) { _log.LogWarning("Enquiry {Ref}: no staff email address in Site settings.", reference); return; }

            var from = _config["Smtp:From"] ?? _config["Smtp:User"] ?? to;
            var msg = new MimeMessage();
            msg.From.Add(new MailboxAddress("Queen's Inn website", from));
            msg.To.Add(MailboxAddress.Parse(to));
            if (!string.IsNullOrWhiteSpace(e.Email) && MailboxAddress.TryParse(e.Email, out var guest)) msg.ReplyTo.Add(new MailboxAddress(e.Name, guest.Address));
            msg.Subject = $"[Queen's Inn] New {e.Type} enquiry {reference} — {e.Name}";

            var lines = new List<string?>
            {
                $"New {e.Type} enquiry {reference}", "",
                $"Name:   {e.Name}", $"Phone:  {e.Phone}", e.Email is null ? null : $"Email:  {e.Email}",
                roomName is null ? null : $"Room:   {roomName}",
                e.CheckIn is null ? null : $"Check-in:  {e.CheckIn:dd MMM yyyy}", e.CheckOut is null ? null : $"Check-out: {e.CheckOut:dd MMM yyyy}",
                e.Guests is null ? null : $"Guests: {e.Guests}",
                e.EventType is null ? null : $"Event:  {e.EventType}", e.EventDate is null ? null : $"Event date: {e.EventDate:dd MMM yyyy}",
                e.AltDate is null ? null : $"Alternative date: {e.AltDate:dd MMM yyyy}",
                e.GuestCount is null ? null : $"Expected guests: {e.GuestCount}", e.RoomsNeeded is null ? null : $"Rooms needed: {e.RoomsNeeded}",
                e.Subject is null ? null : $"Subject: {e.Subject}",
                "", e.Message, "",
                "Open it in the admin inbox to reply and track it. Replying to this email goes to the guest (if they gave an address).",
            };
            msg.Body = new TextPart("plain") { Text = string.Join("\n", lines.Where(l => l is not null)) };

            using var smtp = new SmtpClient { Timeout = 15000 };
            var port = _config.GetValue<int?>("Smtp:Port") ?? 587;
            var secure = port == 465 ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.StartTls;
            await smtp.ConnectAsync(host, port, secure, ct);
            if (!string.IsNullOrWhiteSpace(_config["Smtp:User"])) await smtp.AuthenticateAsync(_config["Smtp:User"], _config["Smtp:Password"], ct);
            await smtp.SendAsync(msg, ct);
            await smtp.DisconnectAsync(true, ct);
        }
        catch (Exception ex)
        {
            // The enquiry is already saved; a mail problem must never lose it or show the guest an error.
            _log.LogError(ex, "Enquiry {Ref} saved, but the notification email failed.", reference);
        }
    }
}

// ---- service ----

public interface IEnquiryService
{
    Task<EnquiryReceiptDto> CreateAsync(CreateEnquiryRequest req, string? clientIp, CancellationToken ct = default);
    Task<PagedResult<EnquirySummaryDto>> ListAsync(string? status, string? type, string? search, int page, int pageSize, CancellationToken ct = default);
    Task<EnquiryDetailDto> GetAsync(long id, CancellationToken ct = default);
    Task<EnquiryDetailDto> SetStatusAsync(long actorId, long id, string status, CancellationToken ct = default);
    Task<EnquiryDetailDto> AddNoteAsync(long actorId, long id, string note, CancellationToken ct = default);
    Task DeleteAsync(long actorId, long id, CancellationToken ct = default);
    Task<EnquiryCountsDto> CountsAsync(CancellationToken ct = default);
}

public sealed partial class EnquiryService : IEnquiryService
{
    private readonly QueensInnDbContext _db;
    private readonly IAuditService _audit;
    private readonly IEnquiryNotifier _notifier;

    public EnquiryService(QueensInnDbContext db, IAuditService audit, IEnquiryNotifier notifier)
    {
        _db = db;
        _audit = audit;
        _notifier = notifier;
    }

    public static string Reference(long id) => $"QI-{id:D5}";

    /// <summary>Today in the hotel's time zone, so "tomorrow" means tomorrow in Velankanni, not on the server.</summary>
    private static DateOnly Today() => DateOnly.FromDateTime(DateTime.UtcNow.AddHours(5.5));

    public async Task<EnquiryReceiptDto> CreateAsync(CreateEnquiryRequest r, string? clientIp, CancellationToken ct = default)
    {
        // Bots fill the hidden field. Pretend it worked so they don't adapt, but store nothing.
        if (!string.IsNullOrWhiteSpace(r.Website)) return new EnquiryReceiptDto("QI-00000", "Thank you. We will be in touch shortly.");

        if (!EnquiryTypes.All.Contains(r.Type)) throw new AppException("Unknown enquiry type.");
        var name = Text(r.Name, 150) ?? throw new AppException("Please tell us your name.");
        if (name.Length < 2) throw new AppException("Please tell us your name.");
        var phone = CleanPhone(r.Phone);
        var email = Text(r.Email, 256);
        if (email is not null && !EmailShape().IsMatch(email)) throw new AppException("That email address doesn't look right. You can leave it blank.");

        var today = Today();
        var latest = today.AddYears(2);
        long? roomId = null;
        string? roomName = null;
        var e = new Enquiry { Type = r.Type, Status = "New", Name = name, Phone = phone, Email = email, ClientIp = Text(clientIp, 45), SourcePage = Text(r.SourcePage, 120) };

        switch (r.Type)
        {
            case EnquiryTypes.Room:
                if (r.CheckIn is null) throw new AppException("Please choose your check-in date.");
                CheckDate(r.CheckIn.Value, today, latest, "check-in");
                if (r.CheckOut is { } co)
                {
                    CheckDate(co, today, latest, "check-out");
                    if (co <= r.CheckIn.Value) throw new AppException("Check-out must be after check-in.");
                }
                e.CheckIn = r.CheckIn; e.CheckOut = r.CheckOut;
                e.Guests = Text(r.Guests, 40);
                if (r.RoomId is { } rid)
                {
                    roomName = await _db.Rooms.AsNoTracking().Where(x => x.RoomId == rid && x.IsActive).Select(x => x.Name).FirstOrDefaultAsync(ct)
                        ?? throw new AppException("That room is no longer available. Please choose another.");
                    roomId = rid;
                }
                e.RoomId = roomId;
                e.Message = Text(r.Message, 2000);
                break;

            case EnquiryTypes.Mahal:
                e.EventType = Text(r.EventType, 40) ?? throw new AppException("Please choose the type of event.");
                if (r.EventDate is null) throw new AppException("Please choose your event date.");
                CheckDate(r.EventDate.Value, today, latest.AddYears(1), "event");
                if (r.AltDate is { } ad) CheckDate(ad, today, latest.AddYears(1), "alternative");
                e.EventDate = r.EventDate; e.AltDate = r.AltDate;
                e.GuestCount = Text(r.GuestCount, 40); e.RoomsNeeded = Text(r.RoomsNeeded, 40);
                e.Message = Text(r.Message, 2000);
                break;

            default:
                e.Subject = Text(r.Subject, 120);
                e.Message = Text(r.Message, 2000) ?? throw new AppException("Please write a short message.");
                break;
        }

        _db.Enquiries.Add(e);
        await _db.SaveChangesAsync(ct);
        var reference = Reference(e.EnquiryId);
        _audit.Record(null, "Create", "Enquiry", e.EnquiryId.ToString(), $"{e.Type} from {e.Name}");
        await _db.SaveChangesAsync(ct);

        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeout.CancelAfter(TimeSpan.FromSeconds(20));
        await _notifier.NotifyAsync(e, reference, roomName, timeout.Token);

        return new EnquiryReceiptDto(reference, "Thank you. Our team will contact you shortly.");
    }

    public async Task<PagedResult<EnquirySummaryDto>> ListAsync(string? status, string? type, string? search, int page, int pageSize, CancellationToken ct = default)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var q = _db.Enquiries.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(status) && EnquiryStatuses.All.Contains(status)) q = q.Where(e => e.Status == status);
        if (!string.IsNullOrWhiteSpace(type) && EnquiryTypes.All.Contains(type)) q = q.Where(e => e.Type == type);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            q = q.Where(e => e.Name.Contains(s) || e.Phone.Contains(s) || (e.Email != null && e.Email.Contains(s)) || (e.Message != null && e.Message.Contains(s)));
        }
        var total = await q.LongCountAsync(ct);
        var rows = await q.OrderByDescending(e => e.CreatedAt).ThenByDescending(e => e.EnquiryId).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        var roomIds = rows.Where(r => r.RoomId != null).Select(r => r.RoomId!.Value).Distinct().ToList();
        var rooms = await _db.Rooms.AsNoTracking().Where(r => roomIds.Contains(r.RoomId)).ToDictionaryAsync(r => r.RoomId, r => r.Name, ct);
        return new PagedResult<EnquirySummaryDto>
        {
            Items = rows.Select(e => new EnquirySummaryDto(e.EnquiryId, Reference(e.EnquiryId), e.Type, e.Status, e.Name, e.Phone, e.Email, Detail(e, rooms), e.CreatedAt)).ToList(),
            Page = page, PageSize = pageSize, TotalCount = total,
        };
    }

    public async Task<EnquiryDetailDto> GetAsync(long id, CancellationToken ct = default)
    {
        var e = await _db.Enquiries.AsNoTracking().FirstOrDefaultAsync(x => x.EnquiryId == id, ct) ?? throw new AppException("Enquiry not found.", 404);
        return await ToDetailAsync(e, ct);
    }

    public async Task<EnquiryDetailDto> SetStatusAsync(long actorId, long id, string status, CancellationToken ct = default)
    {
        if (!EnquiryStatuses.All.Contains(status)) throw new AppException($"Status must be one of: {string.Join(", ", EnquiryStatuses.All)}.");
        var e = await _db.Enquiries.FirstOrDefaultAsync(x => x.EnquiryId == id, ct) ?? throw new AppException("Enquiry not found.", 404);
        var was = e.Status;
        e.Status = status;
        _audit.Record(actorId, "Update", "Enquiry", id.ToString(), $"{Reference(id)}: {was} → {status}");
        await _db.SaveChangesAsync(ct);
        return await ToDetailAsync(e, ct);
    }

    public async Task<EnquiryDetailDto> AddNoteAsync(long actorId, long id, string note, CancellationToken ct = default)
    {
        note = ControlChars().Replace(note ?? "", "").Trim();
        if (note.Length == 0) throw new AppException("Please write a note.");
        if (note.Length > 2000) throw new AppException("That note is too long (2,000 characters at most).");
        var e = await _db.Enquiries.FirstOrDefaultAsync(x => x.EnquiryId == id, ct) ?? throw new AppException("Enquiry not found.", 404);
        _db.EnquiryNotes.Add(new EnquiryNote { EnquiryId = id, UserId = actorId, Note = note, CreatedAt = DateTime.UtcNow });
        await _db.SaveChangesAsync(ct);
        return await ToDetailAsync(e, ct);
    }

    public async Task DeleteAsync(long actorId, long id, CancellationToken ct = default)
    {
        var e = await _db.Enquiries.FirstOrDefaultAsync(x => x.EnquiryId == id, ct) ?? throw new AppException("Enquiry not found.", 404);
        _db.Enquiries.Remove(e);     // notes go with it (cascade)
        _audit.Record(actorId, "Delete", "Enquiry", id.ToString(), Reference(id));
        await _db.SaveChangesAsync(ct);
    }

    public async Task<EnquiryCountsDto> CountsAsync(CancellationToken ct = default)
    {
        var by = await _db.Enquiries.AsNoTracking().GroupBy(e => e.Status).Select(g => new { g.Key, N = g.Count() }).ToListAsync(ct);
        var dict = EnquiryStatuses.All.ToDictionary(s => s, s => by.FirstOrDefault(b => b.Key == s)?.N ?? 0);
        return new EnquiryCountsDto(dict["New"], dict.Values.Sum(), dict);
    }

    // ---- helpers ----

    private async Task<EnquiryDetailDto> ToDetailAsync(Enquiry e, CancellationToken ct)
    {
        var roomName = e.RoomId is { } rid ? await _db.Rooms.AsNoTracking().Where(r => r.RoomId == rid).Select(r => r.Name).FirstOrDefaultAsync(ct) : null;
        var notes = await (from n in _db.EnquiryNotes.AsNoTracking()
                           join u in _db.Users.AsNoTracking() on n.UserId equals u.UserId into uj
                           from u in uj.DefaultIfEmpty()
                           where n.EnquiryId == e.EnquiryId
                           orderby n.CreatedAt, n.EnquiryNoteId
                           select new EnquiryNoteDto(n.EnquiryNoteId, n.Note, u != null ? u.FullName : null, n.CreatedAt)).ToListAsync(ct);
        return new EnquiryDetailDto(e.EnquiryId, Reference(e.EnquiryId), e.Type, e.Status, e.Name, e.Phone, e.Email, e.CheckIn, e.CheckOut, roomName, e.Guests,
            e.EventType, e.EventDate, e.AltDate, e.GuestCount, e.RoomsNeeded, e.Subject, e.Message, e.SourcePage, e.CreatedAt, notes);
    }

    private static string Detail(Enquiry e, IReadOnlyDictionary<long, string> rooms) => e.Type switch
    {
        EnquiryTypes.Room => string.Join(" · ", new[]
        {
            e.RoomId is { } r && rooms.TryGetValue(r, out var n) ? n : "Any room",
            e.CheckIn is null ? null : $"{e.CheckIn:d MMM}" + (e.CheckOut is null ? "" : $" – {e.CheckOut:d MMM}"),
            e.Guests,
        }.Where(s => !string.IsNullOrEmpty(s))),
        EnquiryTypes.Mahal => string.Join(" · ", new[] { e.EventType, e.EventDate is null ? null : $"{e.EventDate:d MMM yyyy}", e.GuestCount is null ? null : $"{e.GuestCount} guests" }.Where(s => !string.IsNullOrEmpty(s))),
        _ => e.Subject ?? (e.Message is { Length: > 70 } m ? m[..70] + "…" : e.Message ?? ""),
    };

    private static void CheckDate(DateOnly d, DateOnly today, DateOnly latest, string what)
    {
        if (d < today) throw new AppException($"The {what} date can't be in the past.");
        if (d > latest) throw new AppException($"The {what} date is too far ahead. Please call us for dates that far out.");
    }

    private static string? Text(string? s, int max)
    {
        s = s is null ? null : ControlChars().Replace(s, "").Replace("\r\n", "\n").Trim();
        if (string.IsNullOrEmpty(s)) return null;
        return s.Length <= max ? s : throw new AppException($"One of the answers is too long (the limit is {max} characters).");
    }

    private static string CleanPhone(string? raw)
    {
        var p = (raw ?? "").Trim();
        if (!PhoneShape().IsMatch(p) || p.Count(char.IsDigit) < 7) throw new AppException("Please enter a phone number we can reach you on, e.g. +91 98765 43210.");
        return p;
    }

    [GeneratedRegex(@"[\u0000-\u0008\u000B\u000C\u000E-\u001F]")] private static partial Regex ControlChars();
    [GeneratedRegex(@"^[^@\s]+@[^@\s]+\.[^@\s]{2,}$")] private static partial Regex EmailShape();
    [GeneratedRegex(@"^\+?[0-9 ()\-]{7,20}$")] private static partial Regex PhoneShape();
}

// ---- controllers ----

[ApiController]
public sealed class EnquiriesPublicController : ControllerBase
{
    private readonly IEnquiryService _enquiries;
    public EnquiriesPublicController(IEnquiryService enquiries) => _enquiries = enquiries;

    [HttpPost("api/enquiries")]
    [EnableRateLimiting("enquiry")]
    public async Task<IActionResult> Create(CreateEnquiryRequest req, CancellationToken ct)
    {
        var receipt = await _enquiries.CreateAsync(req, HttpContext.Connection.RemoteIpAddress?.ToString(), ct);
        return Ok(ApiResponse<EnquiryReceiptDto>.Ok(receipt, receipt.Message));
    }
}

[ApiController]
[Route("api/admin/enquiries")]
[Authorize(Policy = Perm.EnquiryManage)]
public sealed class EnquiriesAdminController : ControllerBase
{
    private readonly IEnquiryService _enquiries;
    public EnquiriesAdminController(IEnquiryService enquiries) => _enquiries = enquiries;

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? status, [FromQuery] string? type, [FromQuery] string? q,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 25, CancellationToken ct = default)
        => Ok(ApiResponse<PagedResult<EnquirySummaryDto>>.Ok(await _enquiries.ListAsync(status, type, q, page, pageSize, ct)));

    [HttpGet("counts")]
    public async Task<IActionResult> Counts(CancellationToken ct) => Ok(ApiResponse<EnquiryCountsDto>.Ok(await _enquiries.CountsAsync(ct)));

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id, CancellationToken ct) => Ok(ApiResponse<EnquiryDetailDto>.Ok(await _enquiries.GetAsync(id, ct)));

    [HttpPut("{id:long}/status")]
    public async Task<IActionResult> SetStatus(long id, SetStatusRequest req, CancellationToken ct)
        => Ok(ApiResponse<EnquiryDetailDto>.Ok(await _enquiries.SetStatusAsync(User.UserId(), id, req.Status, ct), "Status updated."));

    [HttpPost("{id:long}/notes")]
    public async Task<IActionResult> AddNote(long id, AddNoteRequest req, CancellationToken ct)
        => Ok(ApiResponse<EnquiryDetailDto>.Ok(await _enquiries.AddNoteAsync(User.UserId(), id, req.Note, ct), "Note added."));

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    {
        await _enquiries.DeleteAsync(User.UserId(), id, ct);
        return Ok(ApiResponse<object>.Ok(new { deleted = true }, "Enquiry deleted."));
    }
}
