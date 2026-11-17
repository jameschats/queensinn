-- =====================================================================
-- 027_qbar_photo_slots.sql  —  Photo positions for the new Q Bar section on the Home page. They stay empty (themed artwork
-- shows) until staff choose photos under Pages & content → Home → Photos.
-- =====================================================================
INSERT IGNORE INTO `ImageSlots` (`SlotKey`) VALUES ('qbar-1'), ('qbar-2'), ('qbar-3');

INSERT INTO `__schema_migrations` (`script_name`)
SELECT '027_qbar_photo_slots.sql'
WHERE NOT EXISTS (SELECT 1 FROM `__schema_migrations` WHERE `script_name` = '027_qbar_photo_slots.sql');
