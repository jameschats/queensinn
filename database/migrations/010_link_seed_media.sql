-- =====================================================================
-- 010_link_seed_media.sql  —  Wires the photos brought in by
--   `queensin.api import-media deploy/seed/media-manifest.json`
-- (MediaAssets.FileName = the manifest key) to the seeded hero slides, rooms and gallery,
-- and adds the three starter guest quotes.
--
-- Safe to run on every deploy: each statement only fills a gap (IS NULL / NOT EXISTS), so
-- it never overrides a choice an admin has since made, and it does nothing until the photos
-- have been imported.
-- =====================================================================

-- Rooms: featured photo
UPDATE `Rooms` r JOIN `MediaAssets` m ON m.`FileName` = 'room-deluxe'    SET r.`FeaturedMediaId` = m.`MediaId` WHERE r.`Slug` = 'deluxe-double'    AND r.`FeaturedMediaId` IS NULL;
UPDATE `Rooms` r JOIN `MediaAssets` m ON m.`FileName` = 'room-executive' SET r.`FeaturedMediaId` = m.`MediaId` WHERE r.`Slug` = 'executive-triple' AND r.`FeaturedMediaId` IS NULL;
UPDATE `Rooms` r JOIN `MediaAssets` m ON m.`FileName` = 'room-family'    SET r.`FeaturedMediaId` = m.`MediaId` WHERE r.`Slug` = 'family-room'      AND r.`FeaturedMediaId` IS NULL;
UPDATE `Rooms` r JOIN `MediaAssets` m ON m.`FileName` = 'room-suite'     SET r.`FeaturedMediaId` = m.`MediaId` WHERE r.`Slug` = 'queens-suite'     AND r.`FeaturedMediaId` IS NULL;

-- Home hero: slide 1 already exists (text only); give it a photo, then add two photo-only slides.
UPDATE `HeroSlides` h JOIN `Pages` p ON p.`PageId` = h.`PageId` AND p.`Slug` = ''
  JOIN `MediaAssets` m ON m.`FileName` = 'hero-dusk'
  SET h.`MediaId` = m.`MediaId` WHERE h.`DisplayOrder` = 1 AND h.`MediaId` IS NULL;

INSERT INTO `HeroSlides` (`PageId`, `MediaId`, `DisplayOrder`)
SELECT p.`PageId`, m.`MediaId`, 2 FROM `Pages` p JOIN `MediaAssets` m ON m.`FileName` = 'hero-garden'
WHERE p.`Slug` = '' AND NOT EXISTS (SELECT 1 FROM `HeroSlides` h WHERE h.`PageId` = p.`PageId` AND h.`DisplayOrder` = 2);

INSERT INTO `HeroSlides` (`PageId`, `MediaId`, `DisplayOrder`)
SELECT p.`PageId`, m.`MediaId`, 3 FROM `Pages` p JOIN `MediaAssets` m ON m.`FileName` = 'hero-lobby'
WHERE p.`Slug` = '' AND NOT EXISTS (SELECT 1 FROM `HeroSlides` h WHERE h.`PageId` = p.`PageId` AND h.`DisplayOrder` = 3);

-- Gallery: the prototype's twelve, in its order (only when the gallery is still empty).
INSERT INTO `GalleryItems` (`MediaId`, `DisplayOrder`, `ShowOnHome`)
SELECT m.`MediaId`, o.`ord`, 1
FROM (SELECT 'room-suite' k, 1 ord UNION ALL SELECT 'room-twin', 2 UNION ALL SELECT 'gallery-01', 3 UNION ALL SELECT 'gallery-02', 4
      UNION ALL SELECT 'gallery-03', 5 UNION ALL SELECT 'gallery-04', 6 UNION ALL SELECT 'gallery-05', 7 UNION ALL SELECT 'gallery-06', 8
      UNION ALL SELECT 'room-executive', 9 UNION ALL SELECT 'gallery-07', 10 UNION ALL SELECT 'gallery-08', 11 UNION ALL SELECT 'gallery-09', 12) o
JOIN `MediaAssets` m ON m.`FileName` = o.`k`
WHERE NOT EXISTS (SELECT 1 FROM `GalleryItems`);

-- Starter guest quotes (from the design prototype), only while there are none.
INSERT INTO `Testimonials` (`Quote`, `GuestName`, `Origin`, `DisplayOrder`)
SELECT * FROM (SELECT
  'We came for the Basilica and stayed an extra night for the quiet. The gardens at dawn are something else.' q, 'Guest' g, 'Bengaluru' o, 1 d UNION ALL SELECT
  'Eight hundred guests, thirty rooms, one campus. Our families never had to step onto the main road.', 'Wedding host', 'Thanjavur', 2 UNION ALL SELECT
  'Spotless rooms, a breakfast worth waking for, and a front desk that remembered our names.', 'Guest', 'Chennai', 3) x
WHERE NOT EXISTS (SELECT 1 FROM `Testimonials`);

INSERT INTO `__schema_migrations` (`script_name`)
SELECT '010_link_seed_media.sql'
WHERE NOT EXISTS (SELECT 1 FROM `__schema_migrations` WHERE `script_name` = '010_link_seed_media.sql');
