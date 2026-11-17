-- =====================================================================
-- 020_tariffs_from_official_site.sql  —  Room starting rates now match the current official website
-- (www.queensinn.co.in, "Starting Rate/Night ... + GST"): Deluxe Double 3,500 · Executive Triple 4,500 ·
-- Family Room 5,500 · Queen's Suite 7,000. The seeded rates (2,500 / 3,500 / 4,500 / 6,000) were out of date.
-- Each rate changes only while it still holds the old seeded value, so a figure staff have set in the admin is never touched.
-- =====================================================================
UPDATE `Rooms` SET `StartingTariff` = 3500 WHERE `Slug` = 'deluxe-double'    AND `StartingTariff` = 2500;
UPDATE `Rooms` SET `StartingTariff` = 4500 WHERE `Slug` = 'executive-triple' AND `StartingTariff` = 3500;
UPDATE `Rooms` SET `StartingTariff` = 5500 WHERE `Slug` = 'family-room'      AND `StartingTariff` = 4500;
UPDATE `Rooms` SET `StartingTariff` = 7000 WHERE `Slug` = 'queens-suite'     AND `StartingTariff` = 6000;

INSERT INTO `__schema_migrations` (`script_name`)
SELECT '020_tariffs_from_official_site.sql'
WHERE NOT EXISTS (SELECT 1 FROM `__schema_migrations` WHERE `script_name` = '020_tariffs_from_official_site.sql');
