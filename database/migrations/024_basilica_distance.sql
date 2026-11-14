-- =====================================================================
-- 024_basilica_distance.sql  —  The Velankanni Basilica is 2.1 km from the hotel by road (Google Maps, fastest route via
-- Main Road, about 8 minutes in usual traffic; 29 minutes on foot). The blueprint's "0.5 km" was wrong.
-- Only changes the figure while it still holds the old value, so a distance staff have set in the admin is kept.
-- =====================================================================
UPDATE `Attractions` SET `DistanceKm` = 2.1 WHERE `Name` = 'Velankanni Basilica' AND `DistanceKm` = 0.5;

INSERT INTO `__schema_migrations` (`script_name`)
SELECT '024_basilica_distance.sql'
WHERE NOT EXISTS (SELECT 1 FROM `__schema_migrations` WHERE `script_name` = '024_basilica_distance.sql');
