-- =====================================================================
-- 014_gallery_strip.sql  —  A second gallery: the sliding strip on the home page.
-- GalleryItems gains Placement ('collage' = the masonry gallery, 'strip' = the sliding strip) and,
-- for strip cards, an optional Title, Caption and LinkUrl. Existing rows stay 'collage'.
-- Also seeds the strip once with photos already in the library (nothing happens if there are none yet).
-- =====================================================================
SET @has := (SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'GalleryItems' AND COLUMN_NAME = 'Placement');
SET @ddl := IF(@has = 0,
  'ALTER TABLE `GalleryItems`
     ADD COLUMN `Placement` VARCHAR(20)  NOT NULL DEFAULT ''collage'' AFTER `MediaId`,
     ADD COLUMN `Title`     VARCHAR(120) NULL,
     ADD COLUMN `Caption`   VARCHAR(300) NULL,
     ADD COLUMN `LinkUrl`   VARCHAR(300) NULL',
  'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

INSERT INTO `GalleryItems` (`Placement`, `MediaId`, `Title`, `Caption`, `LinkUrl`, `DisplayOrder`, `ShowOnHome`)
SELECT 'strip', m.`MediaId`, o.`title`, o.`cap`, o.`link`, o.`ord`, 1
FROM (SELECT 'room-suite' k, 'The Queen''s Suite' title, 'A separate lounge for bridal parties' cap, '/bookroom' link, 1 ord
      UNION ALL SELECT 'room-deluxe', 'Deluxe Double Room', 'Garden views for two', '/bookroom', 2
      UNION ALL SELECT 'room-family', 'Family Room', 'Four guests and a private balcony', '/bookroom', 3
      UNION ALL SELECT 'dish-breakfast', 'Q Multi-Cuisine Restaurant', 'South Indian, Chettinad and coastal plates', '/#restaurant', 4
      UNION ALL SELECT 'room-executive', 'Executive Triple Room', 'Room for three, without compromise', '/bookroom', 5
      UNION ALL SELECT 'hero-lobby', 'Reception & lobby', 'Open round the clock', NULL, 6
      UNION ALL SELECT 'hero-garden', 'The garden lawn', 'Set for celebrations', NULL, 7
      UNION ALL SELECT 'meeting-hall', 'Banquet hall', 'For families and groups', NULL, 8) o
JOIN `MediaAssets` m ON m.`FileName` = o.`k`
WHERE NOT EXISTS (SELECT 1 FROM `GalleryItems` WHERE `Placement` = 'strip');

INSERT INTO `__schema_migrations` (`script_name`)
SELECT '014_gallery_strip.sql'
WHERE NOT EXISTS (SELECT 1 FROM `__schema_migrations` WHERE `script_name` = '014_gallery_strip.sql');
