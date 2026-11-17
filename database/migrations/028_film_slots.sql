-- =====================================================================
-- 028_film_slots.sql  —  Positions for the click-to-play "Watch the film" sections on Home and KVR Mahal:
-- the film itself and its cover photo. They stay empty (the section is hidden) until the films are imported.
-- =====================================================================
INSERT IGNORE INTO `ImageSlots` (`SlotKey`) VALUES ('film-home'), ('film-home-poster'), ('film-kvr'), ('film-kvr-poster');

INSERT INTO `__schema_migrations` (`script_name`)
SELECT '028_film_slots.sql'
WHERE NOT EXISTS (SELECT 1 FROM `__schema_migrations` WHERE `script_name` = '028_film_slots.sql');
