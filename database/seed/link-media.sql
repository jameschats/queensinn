-- =====================================================================
-- link-media.sql  —  Attaches the seed photos (deploy/seed/media-manifest.json) to the site's content.
--
-- NOT a migration: deploy.sh runs it only right after `import-media` brought in NEW photos (first
-- install, or a photo re-processed with REPLACE_KEYS). Migrations 010-013 once did this on every deploy,
-- which could quietly undo an admin's edits; they now run once like any other migration.
-- Each statement only fills a gap (IS NULL / NOT EXISTS), so even when it does run it never overwrites a choice.
-- =====================================================================

-- Rooms: featured photo
UPDATE `Rooms` r JOIN `MediaAssets` m ON m.`FileName` = 'room-deluxe'    SET r.`FeaturedMediaId` = m.`MediaId` WHERE r.`Slug` = 'deluxe-double'    AND r.`FeaturedMediaId` IS NULL;
UPDATE `Rooms` r JOIN `MediaAssets` m ON m.`FileName` = 'room-executive' SET r.`FeaturedMediaId` = m.`MediaId` WHERE r.`Slug` = 'executive-triple' AND r.`FeaturedMediaId` IS NULL;
UPDATE `Rooms` r JOIN `MediaAssets` m ON m.`FileName` = 'room-family'    SET r.`FeaturedMediaId` = m.`MediaId` WHERE r.`Slug` = 'family-room'      AND r.`FeaturedMediaId` IS NULL;
UPDATE `Rooms` r JOIN `MediaAssets` m ON m.`FileName` = 'room-suite'     SET r.`FeaturedMediaId` = m.`MediaId` WHERE r.`Slug` = 'queens-suite'     AND r.`FeaturedMediaId` IS NULL;

-- Hero photos: only for pages that have none yet
INSERT INTO `HeroSlides` (`PageId`, `MediaId`, `DisplayOrder`)
SELECT p.`PageId`, m.`MediaId`, o.`ord`
FROM (SELECT '' slug, 'hero-dusk' k, 1 ord UNION ALL SELECT '', 'hero-garden', 2 UNION ALL SELECT '', 'hero-lobby', 3
      UNION ALL SELECT 'bookroom', 'room-suite', 1 UNION ALL SELECT 'about-us', 'hero-dusk', 1 UNION ALL SELECT 'contact', 'hero-lobby', 1) o
JOIN `Pages` p ON p.`Slug` = o.`slug`
JOIN `MediaAssets` m ON m.`FileName` = o.`k`
WHERE NOT EXISTS (SELECT 1 FROM `HeroSlides` h WHERE h.`PageId` = p.`PageId` AND h.`MediaId` IS NOT NULL);

-- Collage gallery (the prototype's twelve, in its order) — only when it is empty
INSERT INTO `GalleryItems` (`Placement`, `MediaId`, `DisplayOrder`, `ShowOnHome`)
SELECT 'collage', m.`MediaId`, o.`ord`, 1
FROM (SELECT 'room-suite' k, 1 ord UNION ALL SELECT 'room-twin', 2 UNION ALL SELECT 'gallery-01', 3 UNION ALL SELECT 'gallery-02', 4
      UNION ALL SELECT 'gallery-03', 5 UNION ALL SELECT 'gallery-04', 6 UNION ALL SELECT 'gallery-05', 7 UNION ALL SELECT 'gallery-06', 8
      UNION ALL SELECT 'room-executive', 9 UNION ALL SELECT 'gallery-07', 10 UNION ALL SELECT 'gallery-08', 11 UNION ALL SELECT 'gallery-09', 12) o
JOIN `MediaAssets` m ON m.`FileName` = o.`k`
WHERE NOT EXISTS (SELECT 1 FROM `GalleryItems` WHERE `Placement` = 'collage');

-- Sliding strip — only when it is empty
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

-- Named photo positions
UPDATE `ImageSlots` s JOIN `MediaAssets` m ON m.`FileName` = 'hero-dusk'      SET s.`MediaId` = m.`MediaId` WHERE s.`SlotKey` = 'intro-main'    AND s.`MediaId` IS NULL;
UPDATE `ImageSlots` s JOIN `MediaAssets` m ON m.`FileName` = 'hero-lobby'     SET s.`MediaId` = m.`MediaId` WHERE s.`SlotKey` = 'intro-accent'  AND s.`MediaId` IS NULL;
UPDATE `ImageSlots` s JOIN `MediaAssets` m ON m.`FileName` = 'dish-breakfast' SET s.`MediaId` = m.`MediaId` WHERE s.`SlotKey` = 'restaurant'    AND s.`MediaId` IS NULL;
UPDATE `ImageSlots` s JOIN `MediaAssets` m ON m.`FileName` = 'dish-thali'     SET s.`MediaId` = m.`MediaId` WHERE s.`SlotKey` = 'dish-1'        AND s.`MediaId` IS NULL;
UPDATE `ImageSlots` s JOIN `MediaAssets` m ON m.`FileName` = 'dish-seafood'   SET s.`MediaId` = m.`MediaId` WHERE s.`SlotKey` = 'dish-2'        AND s.`MediaId` IS NULL;
UPDATE `ImageSlots` s JOIN `MediaAssets` m ON m.`FileName` = 'meeting-hall'   SET s.`MediaId` = m.`MediaId` WHERE s.`SlotKey` = 'dish-3'        AND s.`MediaId` IS NULL;
UPDATE `ImageSlots` s JOIN `MediaAssets` m ON m.`FileName` = 'meeting-hall'   SET s.`MediaId` = m.`MediaId` WHERE s.`SlotKey` = 'meeting-hall'  AND s.`MediaId` IS NULL;
UPDATE `ImageSlots` s JOIN `MediaAssets` m ON m.`FileName` = 'hero-garden'    SET s.`MediaId` = m.`MediaId` WHERE s.`SlotKey` = 'lawn'          AND s.`MediaId` IS NULL;

-- Starter guest quotes — only while there are none
INSERT INTO `Testimonials` (`Quote`, `GuestName`, `Origin`, `DisplayOrder`)
SELECT * FROM (SELECT
  'We came for the Basilica and stayed an extra night for the quiet. The gardens at dawn are something else.' q, 'Guest' g, 'Bengaluru' o, 1 d UNION ALL SELECT
  'Eight hundred guests, thirty rooms, one campus. Our families never had to step onto the main road.', 'Wedding host', 'Thanjavur', 2 UNION ALL SELECT
  'Spotless rooms, a breakfast worth waking for, and a front desk that remembered our names.', 'Guest', 'Chennai', 3) x
WHERE NOT EXISTS (SELECT 1 FROM `Testimonials`);
