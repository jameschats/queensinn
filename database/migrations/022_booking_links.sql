-- =====================================================================
-- 022_booking_links.sql  —  The hotel sells rooms through booking sites, so the Rooms page gets a "Prefer a booking
-- site?" section with a button for each link in the BookingLinks setting (one "Name | https://address" per line).
-- Seeded with the hotel's Google Hotels listing, which compares MakeMyTrip, Booking.com, Agoda, Goibibo, Cleartrip and
-- others with live prices. Staff can add each site's own listing link in admin Site settings → Booking sites.
-- Only sets the value when no booking links have been entered yet; links staff add are never replaced.
-- =====================================================================
INSERT INTO `SiteSettings` (`SettingKey`, `SettingValue`)
VALUES ('BookingLinks', 'Book online on Google Hotels | https://www.google.com/travel/search?hl=en-IN&gl=in&ssta=1&q=hotel+queens+inn&ts=CAEaRwopEicyJTB4M2E1NTZlZDNiZTM0ZDJkNzoweDc0ZjFlOWJjNWZhNzFkMjkSGhIUCgcI6g8QCxgQEgcI6g8QCxgRGAEyAhAA&qs=CAEyE0Nnb0lxYnFjX2NXMy12aDBFQUU4AkIJCSkdp1-86fF0&ap=ugEGcHJpY2Vz')
ON DUPLICATE KEY UPDATE `SettingValue` = IF(`SettingValue` IS NULL OR `SettingValue` = '', VALUES(`SettingValue`), `SettingValue`);

INSERT INTO `__schema_migrations` (`script_name`)
SELECT '022_booking_links.sql'
WHERE NOT EXISTS (SELECT 1 FROM `__schema_migrations` WHERE `script_name` = '022_booking_links.sql');
