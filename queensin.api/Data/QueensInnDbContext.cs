using Microsoft.EntityFrameworkCore;
using queensin.api.Data.Entities;

namespace queensin.api.Data;

/// <summary>
/// Database-first context. Tables are created by database/migrations/*.sql; entities are
/// mapped explicitly with ToTable(...) because MySQL on Windows lower-cases table names.
/// Later stages add Rooms, Media, Pages, Enquiries etc. here as their features land.
/// </summary>
public sealed class QueensInnDbContext : DbContext
{
    public QueensInnDbContext(DbContextOptions<QueensInnDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<UserExternalLogin> UserExternalLogins => Set<UserExternalLogin>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<SiteSetting> SiteSettings => Set<SiteSetting>();
    public DbSet<ThemeSetting> ThemeSettings => Set<ThemeSetting>();
    public DbSet<AuditEntry> AuditLog => Set<AuditEntry>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<User>(e =>
        {
            e.ToTable("Users");
            e.HasKey(x => x.UserId);
            e.HasIndex(x => x.NormalizedEmail).IsUnique();
        });

        b.Entity<Role>(e =>
        {
            e.ToTable("Roles");
            e.HasKey(x => x.RoleId);
        });

        b.Entity<Permission>(e =>
        {
            e.ToTable("Permissions");
            e.HasKey(x => x.PermissionId);
        });

        b.Entity<UserRole>(e =>
        {
            e.ToTable("UserRoles");
            e.HasKey(x => new { x.UserId, x.RoleId });
            e.HasOne(x => x.User).WithMany(u => u.UserRoles).HasForeignKey(x => x.UserId);
            e.HasOne(x => x.Role).WithMany().HasForeignKey(x => x.RoleId);
        });

        b.Entity<RolePermission>(e =>
        {
            e.ToTable("RolePermissions");
            e.HasKey(x => new { x.RoleId, x.PermissionId });
            e.HasOne(x => x.Role).WithMany(r => r.RolePermissions).HasForeignKey(x => x.RoleId);
            e.HasOne(x => x.Permission).WithMany().HasForeignKey(x => x.PermissionId);
        });

        b.Entity<UserExternalLogin>(e =>
        {
            e.ToTable("UserExternalLogins");
            e.HasKey(x => x.UserExternalLoginId);
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId);
        });

        b.Entity<RefreshToken>(e =>
        {
            e.ToTable("RefreshTokens");
            e.HasKey(x => x.RefreshTokenId);
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId);
        });

        b.Entity<SiteSetting>(e => { e.ToTable("SiteSettings"); e.HasKey(x => x.SettingKey); });
        b.Entity<ThemeSetting>(e => { e.ToTable("ThemeSettings"); e.HasKey(x => x.SettingKey); });

        b.Entity<AuditEntry>(e =>
        {
            e.ToTable("AuditLog");
            e.HasKey(x => x.AuditId);
        });
    }
}
