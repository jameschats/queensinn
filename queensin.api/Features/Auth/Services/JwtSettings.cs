namespace queensin.api.Features.Auth.Services;

public sealed class JwtSettings
{
    public string Issuer { get; set; } = "queensin.api";
    public string Audience { get; set; } = "queensin.web";
    public string Key { get; set; } = string.Empty;
    public int AccessTokenMinutes { get; set; } = 15;
    public int RefreshTokenDays { get; set; } = 14;
}
