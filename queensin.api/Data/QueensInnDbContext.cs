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
    public DbSet<MediaAsset> MediaAssets => Set<MediaAsset>();
    public DbSet<Room> Rooms => Set<Room>();
    public DbSet<RoomImage> RoomImages => Set<RoomImage>();
    public DbSet<Amenity> Amenities => Set<Amenity>();
    public DbSet<RoomAmenity> RoomAmenities => Set<RoomAmenity>();
    public DbSet<Page> Pages => Set<Page>();
    public DbSet<HeroSlide> HeroSlides => Set<HeroSlide>();
    public DbSet<Attraction> Attractions => Set<Attraction>();
    public DbSet<GalleryItem> GalleryItems => Set<GalleryItem>();
    public DbSet<Testimonial> Testimonials => Set<Testimonial>();
    public DbSet<ImageSlot> ImageSlots => Set<ImageSlot>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<MediaAsset>(e =>
        {
            e.ToTable("MediaAssets");
            e.HasKey(x => x.MediaId);
            e.Property(x => x.VariantsJson).HasColumnType("json");
        });

        b.Entity<Room>(e => { e.ToTable("Rooms"); e.HasKey(x => x.RoomId); e.Property(x => x.StartingTariff).HasPrecision(10, 2); });
        b.Entity<RoomImage>(e => { e.ToTable("RoomImages"); e.HasKey(x => new { x.RoomId, x.MediaId }); });
        b.Entity<Amenity>(e => { e.ToTable("Amenities"); e.HasKey(x => x.AmenityId); });
        b.Entity<RoomAmenity>(e => { e.ToTable("RoomAmenities"); e.HasKey(x => new { x.RoomId, x.AmenityId }); });
        b.Entity<Page>(e => { e.ToTable("Pages"); e.HasKey(x => x.PageId); });
        b.Entity<HeroSlide>(e => { e.ToTable("HeroSlides"); e.HasKey(x => x.SlideId); });
        b.Entity<Attraction>(e => { e.ToTable("Attractions"); e.HasKey(x => x.AttractionId); e.Property(x => x.DistanceKm).HasPrecision(6, 1); });
        b.Entity<GalleryItem>(e => { e.ToTable("GalleryItems"); e.HasKey(x => x.GalleryItemId); });
        b.Entity<Testimonial>(e => { e.ToTable("Testimonials"); e.HasKey(x => x.TestimonialId); });
        b.Entity<ImageSlot>(e => { e.ToTable("ImageSlots"); e.HasKey(x => x.SlotKey); });

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
