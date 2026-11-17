# Database migrations

Forward-only, numbered SQL scripts. **SQL is the source of truth**; EF Core entities are hand-written to match.

- Apply in order: `for f in database/migrations/0*.sql; do mysql -u root -p queensinn < "$f"; done`
- Each script is idempotent (`IF NOT EXISTS` / `INSERT IGNORE`) and records itself in `__schema_migrations`.
- **Never edit a script that has been applied anywhere.** Add `010_*.sql`, `011_*.sql`, …

| Script | Creates |
| --- | --- |
| 001 | `__schema_migrations` |
| 002 | Users, Roles, Permissions, UserRoles, RolePermissions, UserExternalLogins, RefreshTokens, OtpVerifications |
| 003 | 7 permissions, Super Admin / Manager / Front Desk roles, first admin (password set by API on first start) |
| 004 | SiteSettings, ThemeSettings (+ defaults from the live site) |
| 005 | MediaAssets |
| 006 | Rooms, RoomImages, Amenities, RoomAmenities (+ 4 seeded rooms) |
| 007 | Pages, PageSections, HeroSlides, Attractions, GalleryCategories, GalleryItems, Testimonials, PolicyPages (+ seeds) |
| 008 | Enquiries, EnquiryNotes |
| 009 | AuditLog |
| 010–016 | Photo links, image slots, page hero photos, home strip gallery, contact hero, travel-desk slot |
| 017 | Launch content: room descriptions and the three policy pages (one-off; replaces the starter text) |

Photos and hero videos are not migrations: they ship in `deploy/seed/media/`, are listed in `deploy/seed/media-manifest.json`,
imported by `import-media` and placed by `database/seed/link-media.sql`. To swap the whole set on an existing site:
`REPLACE_KEYS=all DOMAIN=... ./deploy/deploy.sh`.
