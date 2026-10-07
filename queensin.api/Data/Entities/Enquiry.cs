namespace queensin.api.Data.Entities;

/// <summary>A room, KVR Mahal or general enquiry from the website (migration 008).</summary>
public sealed class Enquiry
{
    public long EnquiryId { get; set; }
    public string Type { get; set; } = "Contact";
    public string Status { get; set; } = "New";
    public string Name { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Email { get; set; }
    public DateOnly? CheckIn { get; set; }
    public DateOnly? CheckOut { get; set; }
    public long? RoomId { get; set; }
    public string? Guests { get; set; }
    public string? EventType { get; set; }
    public DateOnly? EventDate { get; set; }
    public DateOnly? AltDate { get; set; }
    public string? GuestCount { get; set; }
    public string? RoomsNeeded { get; set; }
    public string? Subject { get; set; }
    public string? Message { get; set; }
    public string? SourcePage { get; set; }
    public string? ClientIp { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public sealed class EnquiryNote
{
    public long EnquiryNoteId { get; set; }
    public long EnquiryId { get; set; }
    public long? UserId { get; set; }
    public string Note { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
