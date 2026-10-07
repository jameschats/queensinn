namespace queensin.api.Common.Security;

/// <summary>
/// Permission codes, matching the Code column of the Permissions table (migration 003).
/// Constants rather than strings at call sites: a typo in [Authorize(Policy = ...)]
/// compiles fine and silently locks everyone out of a screen.
/// </summary>
public static class Perm
{
    public const string EnquiryManage = "enquiry.manage";
    public const string RoomManage = "room.manage";
    public const string MediaManage = "media.manage";
    public const string CmsManage = "cms.manage";
    public const string ThemeManage = "theme.manage";
    public const string SettingsManage = "settings.manage";
    public const string UserManage = "user.manage";

    /// <summary>Every code, so one authorization policy is registered per permission.</summary>
    public static readonly string[] All =
    [
        EnquiryManage, RoomManage, MediaManage, CmsManage, ThemeManage, SettingsManage, UserManage,
    ];

    /// <summary>The JWT claim type that carries these codes.</summary>
    public const string ClaimType = "perm";
}
