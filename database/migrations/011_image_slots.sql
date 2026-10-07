-- =====================================================================
-- 011_image_slots.sql  —  Named photo positions on the public pages
-- (e.g. 'restaurant', 'intro-main'). The site asks for a slot by name; the admin can
-- point a slot at any photo in the media library without a code change.
-- A slot with no photo shows themed artwork instead, so a page is never left empty.
-- =====================================================================
CREATE TABLE IF NOT EXISTS `ImageSlots` (
    `SlotKey`   VARCHAR(60)     NOT NULL,
    `MediaId`   BIGINT UNSIGNED NULL,
    `UpdatedAt` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`SlotKey`),
    CONSTRAINT `fk_imageslots_media` FOREIGN KEY (`MediaId`) REFERENCES `MediaAssets` (`MediaId`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Every slot the site uses (photo left empty where none exists yet, e.g. KVR Mahal).
INSERT IGNORE INTO `ImageSlots` (`SlotKey`) VALUES
 ('intro-main'), ('intro-accent'), ('restaurant'), ('dish-1'), ('dish-2'), ('dish-3'),
 ('mahal-feature'), ('mahal-hall'), ('mahal-dining'), ('mahal-night'), ('meeting-hall'), ('lawn');

-- Fill from the imported photos (only into empty slots, so admin choices are never overridden;
-- does nothing until `import-media` has run).
UPDATE `ImageSlots` s JOIN `MediaAssets` m ON m.`FileName` = 'hero-dusk' SET s.`MediaId` = m.`MediaId` WHERE s.`SlotKey` = 'intro-main' AND s.`MediaId` IS NULL;
UPDATE `ImageSlots` s JOIN `MediaAssets` m ON m.`FileName` = 'hero-lobby' SET s.`MediaId` = m.`MediaId` WHERE s.`SlotKey` = 'intro-accent' AND s.`MediaId` IS NULL;
UPDATE `ImageSlots` s JOIN `MediaAssets` m ON m.`FileName` = 'dish-breakfast' SET s.`MediaId` = m.`MediaId` WHERE s.`SlotKey` = 'restaurant' AND s.`MediaId` IS NULL;
UPDATE `ImageSlots` s JOIN `MediaAssets` m ON m.`FileName` = 'dish-thali' SET s.`MediaId` = m.`MediaId` WHERE s.`SlotKey` = 'dish-1' AND s.`MediaId` IS NULL;
UPDATE `ImageSlots` s JOIN `MediaAssets` m ON m.`FileName` = 'dish-seafood' SET s.`MediaId` = m.`MediaId` WHERE s.`SlotKey` = 'dish-2' AND s.`MediaId` IS NULL;
UPDATE `ImageSlots` s JOIN `MediaAssets` m ON m.`FileName` = 'meeting-hall' SET s.`MediaId` = m.`MediaId` WHERE s.`SlotKey` = 'dish-3' AND s.`MediaId` IS NULL;
UPDATE `ImageSlots` s JOIN `MediaAssets` m ON m.`FileName` = 'meeting-hall' SET s.`MediaId` = m.`MediaId` WHERE s.`SlotKey` = 'meeting-hall' AND s.`MediaId` IS NULL;
UPDATE `ImageSlots` s JOIN `MediaAssets` m ON m.`FileName` = 'hero-garden' SET s.`MediaId` = m.`MediaId` WHERE s.`SlotKey` = 'lawn' AND s.`MediaId` IS NULL;

INSERT INTO `__schema_migrations` (`script_name`)
SELECT '011_image_slots.sql'
WHERE NOT EXISTS (SELECT 1 FROM `__schema_migrations` WHERE `script_name` = '011_image_slots.sql');
