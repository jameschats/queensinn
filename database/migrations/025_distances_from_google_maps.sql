-- =====================================================================
-- 025_distances_from_google_maps.sql  —  Distances on the Experiences page now come from Google Maps (driving, fastest
-- route from the hotel, 14 Nov 2026) instead of the blueprint's rough figures:
--   Nagore Dargah 17.9 km (was 14) · Thirunallar 33.2 (was 35) · Tranquebar 41.9 (was 55)
--   · Point Calimere 47.1 (was 45) · Muthupet Mangrove Forest 57.4 (was 50). (The Basilica, 2.1 km, was set in 024.)
-- The list stays ordered nearest first, so Tranquebar moves ahead of Point Calimere and Muthupet.
-- The hotel's map coordinates (used in the search-engine "Hotel" data) are Google's own pin for the hotel:
--   10.686307, 79.832944 (the saved 10.6806, 79.8474 was about 1.5 km off).
-- Every change applies only while the old seeded value is still in place, so figures staff have edited are kept.
-- =====================================================================
UPDATE `Attractions` SET `DistanceKm` = 17.9 WHERE `Name` = 'Nagore Dargah'             AND `DistanceKm` = 14;
UPDATE `Attractions` SET `DistanceKm` = 33.2 WHERE `Name` = 'Thirunallar Saniswaran'    AND `DistanceKm` = 35;
UPDATE `Attractions` SET `DistanceKm` = 47.1 WHERE `Name` = 'Point Calimere Sanctuary'  AND `DistanceKm` = 45;
UPDATE `Attractions` SET `DistanceKm` = 57.4 WHERE `Name` = 'Muthupet Mangroves'        AND `DistanceKm` = 50;
UPDATE `Attractions` SET `DistanceKm` = 41.9 WHERE `Name` = 'Tranquebar (Dansborg)'     AND `DistanceKm` = 55;

-- Nearest first: Tranquebar 4th, Point Calimere 5th, Muthupet 6th (only while still in the seeded order).
UPDATE `Attractions` SET `DisplayOrder` = CASE `Name`
    WHEN 'Tranquebar (Dansborg)' THEN 4 WHEN 'Point Calimere Sanctuary' THEN 5 WHEN 'Muthupet Mangroves' THEN 6 ELSE `DisplayOrder` END
WHERE (SELECT COUNT(*) FROM (SELECT 1 FROM `Attractions` WHERE (`Name` = 'Point Calimere Sanctuary' AND `DisplayOrder` = 4)
                                 OR (`Name` = 'Muthupet Mangroves' AND `DisplayOrder` = 5) OR (`Name` = 'Tranquebar (Dansborg)' AND `DisplayOrder` = 6)) x) = 3
  AND `Name` IN ('Tranquebar (Dansborg)', 'Point Calimere Sanctuary', 'Muthupet Mangroves');

UPDATE `SiteSettings` SET `SettingValue` = '10.686307' WHERE `SettingKey` = 'Latitude'  AND `SettingValue` = '10.6806';
UPDATE `SiteSettings` SET `SettingValue` = '79.832944' WHERE `SettingKey` = 'Longitude' AND `SettingValue` = '79.8474';

INSERT INTO `__schema_migrations` (`script_name`)
SELECT '025_distances_from_google_maps.sql'
WHERE NOT EXISTS (SELECT 1 FROM `__schema_migrations` WHERE `script_name` = '025_distances_from_google_maps.sql');
