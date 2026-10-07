-- =====================================================================
-- 016_travel_desk_slot.sql  —  A photo position for the "Travel desk" section on the Experiences page.
-- Left empty (themed artwork shows) until staff choose a photo under Pages & content > Experiences > Photos.
-- =====================================================================
INSERT IGNORE INTO `ImageSlots` (`SlotKey`) VALUES ('travel-desk');

INSERT INTO `__schema_migrations` (`script_name`)
SELECT '016_travel_desk_slot.sql'
WHERE NOT EXISTS (SELECT 1 FROM `__schema_migrations` WHERE `script_name` = '016_travel_desk_slot.sql');
