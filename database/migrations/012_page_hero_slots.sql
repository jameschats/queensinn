-- =====================================================================
-- 012_page_hero_slots.sql  —  Hero photo slots for the inner pages.
-- A page whose slot has no photo shows themed artwork instead. Stay and Our story get a
-- seeded photo; KVR Mahal and Experiences stay on artwork until real photos exist.
-- Fills empty slots only, so it never overrides an admin's choice.
-- =====================================================================
INSERT IGNORE INTO `ImageSlots` (`SlotKey`) VALUES
 ('hero-bookroom'), ('hero-kvr-mahal'), ('hero-about'), ('hero-activities');

UPDATE `ImageSlots` s JOIN `MediaAssets` m ON m.`FileName` = 'room-suite' SET s.`MediaId` = m.`MediaId` WHERE s.`SlotKey` = 'hero-bookroom' AND s.`MediaId` IS NULL;
UPDATE `ImageSlots` s JOIN `MediaAssets` m ON m.`FileName` = 'hero-dusk'  SET s.`MediaId` = m.`MediaId` WHERE s.`SlotKey` = 'hero-about'    AND s.`MediaId` IS NULL;

INSERT INTO `__schema_migrations` (`script_name`)
SELECT '012_page_hero_slots.sql'
WHERE NOT EXISTS (SELECT 1 FROM `__schema_migrations` WHERE `script_name` = '012_page_hero_slots.sql');
