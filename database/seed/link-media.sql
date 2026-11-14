-- =====================================================================
-- link-media.sql  —  Attaches the seed photos and videos (deploy/seed/media-manifest.json) to the site's content.
--
-- NOT a migration: deploy.sh runs it only right after `import-media` brought in NEW media (first
-- install, or media re-processed with REPLACE_KEYS). Each statement only fills a gap (IS NULL / NOT EXISTS),
-- so even when it does run it never overwrites a choice an admin made.
-- Photo keys are the file names in deploy/seed/media/ (without extension).
-- =====================================================================

-- Rooms: featured photo
UPDATE `Rooms` r JOIN `MediaAssets` m ON m.`FileName` = 'room-deluxe'    SET r.`FeaturedMediaId` = m.`MediaId` WHERE r.`Slug` = 'deluxe-double'    AND r.`FeaturedMediaId` IS NULL;
UPDATE `Rooms` r JOIN `MediaAssets` m ON m.`FileName` = 'room-executive' SET r.`FeaturedMediaId` = m.`MediaId` WHERE r.`Slug` = 'executive-triple' AND r.`FeaturedMediaId` IS NULL;
UPDATE `Rooms` r JOIN `MediaAssets` m ON m.`FileName` = 'room-family'    SET r.`FeaturedMediaId` = m.`MediaId` WHERE r.`Slug` = 'family-room'      AND r.`FeaturedMediaId` IS NULL;
UPDATE `Rooms` r JOIN `MediaAssets` m ON m.`FileName` = 'room-suite'     SET r.`FeaturedMediaId` = m.`MediaId` WHERE r.`Slug` = 'queens-suite'     AND r.`FeaturedMediaId` IS NULL;

-- Hero photos: only for pages that have none yet.
-- First clear empty hero rows left behind when a replaced photo was deleted (they show nothing anywhere).
DELETE FROM `HeroSlides` WHERE `MediaId` IS NULL AND `VideoUrl` IS NULL AND `Headline` IS NULL AND `SubHeadline` IS NULL;
INSERT INTO `HeroSlides` (`PageId`, `MediaId`, `DisplayOrder`)
SELECT p.`PageId`, m.`MediaId`, o.`ord`
FROM (SELECT '' slug, 'campus-aerial' k, 1 ord UNION ALL SELECT '', 'hero-dusk', 2 UNION ALL SELECT '', 'exterior-night', 3
      UNION ALL SELECT 'bookroom', 'room-suite', 1 UNION ALL SELECT 'bookroom', 'room-deluxe', 2
      UNION ALL SELECT 'kvr-mahal', 'mahal-exterior', 1 UNION ALL SELECT 'kvr-mahal', 'mahal-stage', 2 UNION ALL SELECT 'kvr-mahal', 'mahal-hall', 3
      UNION ALL SELECT 'about-us', 'gallery-06', 1
      UNION ALL SELECT 'activities', 'attraction-basilica', 1
      UNION ALL SELECT 'contact', 'hero-lobby', 1) o
JOIN `Pages` p ON p.`Slug` = o.`slug`
JOIN `MediaAssets` m ON m.`FileName` = o.`k`
WHERE NOT EXISTS (SELECT 1 FROM `HeroSlides` h WHERE h.`PageId` = p.`PageId` AND h.`MediaId` IS NOT NULL);

-- Hero videos (Home and KVR Mahal). A page's video is the "videoMediaId" field of its hero section.
-- Set when the page has none, or the one it points at no longer exists.
INSERT IGNORE INTO `PageSections` (`PageId`, `SectionKey`, `SectionType`, `ContentJson`, `DisplayOrder`)
SELECT p.`PageId`, 'hero', 'text', JSON_OBJECT(), 1 FROM `Pages` p WHERE p.`Slug` IN ('', 'kvr-mahal');

UPDATE `PageSections` s JOIN `Pages` p ON p.`PageId` = s.`PageId`
JOIN `MediaAssets` m ON m.`FileName` = IF(p.`Slug` = '', 'video-queens-inn', 'video-kvr-mahal')
SET s.`ContentJson` = JSON_SET(s.`ContentJson`, '$.videoMediaId', CAST(m.`MediaId` AS CHAR))
WHERE s.`SectionKey` = 'hero' AND p.`Slug` IN ('', 'kvr-mahal')
  AND (JSON_UNQUOTE(JSON_EXTRACT(s.`ContentJson`, '$.videoMediaId')) IS NULL
       OR JSON_UNQUOTE(JSON_EXTRACT(s.`ContentJson`, '$.videoMediaId')) NOT IN (SELECT CAST(`MediaId` AS CHAR) FROM `MediaAssets`));

-- Collage gallery (fifteen photos) — only when it is empty
INSERT INTO `GalleryItems` (`Placement`, `MediaId`, `DisplayOrder`, `ShowOnHome`)
SELECT 'collage', m.`MediaId`, o.`ord`, 1
FROM (SELECT 'mahal-stage' k, 1 ord UNION ALL SELECT 'gallery-01', 2 UNION ALL SELECT 'room-suite', 3 UNION ALL SELECT 'pool-aerial-wide', 4
      UNION ALL SELECT 'gallery-03', 5 UNION ALL SELECT 'mahal-backdrop', 6 UNION ALL SELECT 'gallery-02', 7 UNION ALL SELECT 'room-deluxe', 8
      UNION ALL SELECT 'mahal-aisle', 9 UNION ALL SELECT 'gallery-04', 10 UNION ALL SELECT 'dish-breakfast', 11 UNION ALL SELECT 'gallery-06', 12
      UNION ALL SELECT 'gallery-07', 13 UNION ALL SELECT 'gallery-08', 14 UNION ALL SELECT 'room-twin', 15) o
JOIN `MediaAssets` m ON m.`FileName` = o.`k`
WHERE NOT EXISTS (SELECT 1 FROM `GalleryItems` WHERE `Placement` = 'collage');

-- KVR Mahal page strip — only when it is empty
INSERT INTO `GalleryItems` (`Placement`, `MediaId`, `Title`, `Caption`, `LinkUrl`, `DisplayOrder`, `ShowOnHome`)
SELECT 'mahal', m.`MediaId`, o.`title`, o.`cap`, NULL, o.`ord`, 1
FROM (SELECT 'mahal-exterior' k, 'KVR Mahal' title, 'The building and its entrance porch' cap, 1 ord
      UNION ALL SELECT 'mahal-hall-stage', 'The ceremonial hall', 'Seating facing the main stage', 2
      UNION ALL SELECT 'mahal-hall', 'Hall and balcony', 'Chandelier, balcony level and front seating', 3
      UNION ALL SELECT 'mahal-hall-balcony', 'From the stage', 'The hall seen from the front', 4
      UNION ALL SELECT 'mahal-stage', 'Stage decoration', 'Floral arches and a seat for the couple', 5
      UNION ALL SELECT 'mahal-backdrop', 'Backdrop styling', 'A draped backdrop with fresh flowers', 6
      UNION ALL SELECT 'mahal-aisle', 'The aisle', 'Golden arches over the walkway', 7
      UNION ALL SELECT 'mahal-aisle-day', 'The aisle by day', 'Rows of chairs on either side', 8
      UNION ALL SELECT 'mahal-doorway', 'The entrance', 'A carved wooden doorway dressed for a ceremony', 9
      UNION ALL SELECT 'mahal-dining', 'Dining pavilion', 'Long tables for banquet service', 10) o
JOIN `MediaAssets` m ON m.`FileName` = o.`k`
WHERE NOT EXISTS (SELECT 1 FROM `GalleryItems` WHERE `Placement` = 'mahal');

-- Executive Triple Room: the extra room photo joins its gallery
INSERT IGNORE INTO `RoomImages` (`RoomId`, `MediaId`, `DisplayOrder`)
SELECT r.`RoomId`, m.`MediaId`, 1 FROM `Rooms` r JOIN `MediaAssets` m ON m.`FileName` = 'room-twin' WHERE r.`Slug` = 'executive-triple';

-- Sliding strip — only when it is empty
INSERT INTO `GalleryItems` (`Placement`, `MediaId`, `Title`, `Caption`, `LinkUrl`, `DisplayOrder`, `ShowOnHome`)
SELECT 'strip', m.`MediaId`, o.`title`, o.`cap`, o.`link`, o.`ord`, 1
FROM (SELECT 'room-suite' k, 'The Queen''s Suite' title, 'A separate lounge for bridal parties' cap, '/bookroom' link, 1 ord
      UNION ALL SELECT 'room-deluxe', 'Deluxe Double Room', 'Garden views for two', '/bookroom', 2
      UNION ALL SELECT 'room-family', 'Family Room', 'Four guests and a private balcony', '/bookroom', 3
      UNION ALL SELECT 'dish-breakfast', 'Q Multi-Cuisine Restaurant', 'South Indian, Chettinad and coastal plates', '/#restaurant', 4
      UNION ALL SELECT 'room-executive', 'Executive Triple Room', 'Room for three, without compromise', '/bookroom', 5
      UNION ALL SELECT 'gallery-02', 'Swimming pool', 'Set in the garden lawns', NULL, 6
      UNION ALL SELECT 'hero-lobby', 'Reception & lobby', 'Open round the clock', NULL, 7
      UNION ALL SELECT 'mahal-stage', 'KVR Mahal', 'Weddings and receptions, 500 to 1,000 guests', '/kvr-mahal', 8) o
JOIN `MediaAssets` m ON m.`FileName` = o.`k`
WHERE NOT EXISTS (SELECT 1 FROM `GalleryItems` WHERE `Placement` = 'strip');

-- Experiences: a photo for each place (gap-fill, matched by the place's name)
UPDATE `Attractions` a JOIN `MediaAssets` m ON m.`FileName` = 'attraction-basilica'   SET a.`MediaId` = m.`MediaId` WHERE a.`Name` = 'Velankanni Basilica'       AND a.`MediaId` IS NULL;
UPDATE `Attractions` a JOIN `MediaAssets` m ON m.`FileName` = 'attraction-nagore'     SET a.`MediaId` = m.`MediaId` WHERE a.`Name` = 'Nagore Dargah'             AND a.`MediaId` IS NULL;
UPDATE `Attractions` a JOIN `MediaAssets` m ON m.`FileName` = 'attraction-thirunallar' SET a.`MediaId` = m.`MediaId` WHERE a.`Name` = 'Thirunallar Saniswaran'   AND a.`MediaId` IS NULL;
UPDATE `Attractions` a JOIN `MediaAssets` m ON m.`FileName` = 'attraction-calimere'   SET a.`MediaId` = m.`MediaId` WHERE a.`Name` = 'Point Calimere Sanctuary'  AND a.`MediaId` IS NULL;
UPDATE `Attractions` a JOIN `MediaAssets` m ON m.`FileName` = 'attraction-muthupet'   SET a.`MediaId` = m.`MediaId` WHERE a.`Name` = 'Muthupet Mangroves'       AND a.`MediaId` IS NULL;
UPDATE `Attractions` a JOIN `MediaAssets` m ON m.`FileName` = 'attraction-tranquebar' SET a.`MediaId` = m.`MediaId` WHERE a.`Name` = 'Tranquebar (Dansborg)'    AND a.`MediaId` IS NULL;

-- Logo: shown in place of the text lockup. Set when empty, or when the stored address no longer matches a library photo.
UPDATE `SiteSettings` s JOIN `MediaAssets` m ON m.`FileName` = 'brand-logo'
SET s.`SettingValue` = m.`OriginalUrl`
WHERE s.`SettingKey` = 'LogoLightUrl'
  AND (s.`SettingValue` IS NULL OR s.`SettingValue` = '' OR s.`SettingValue` NOT IN (SELECT `OriginalUrl` FROM `MediaAssets`));

-- Named photo positions
UPDATE `ImageSlots` s JOIN `MediaAssets` m ON m.`FileName` = 'hero-lobby'     SET s.`MediaId` = m.`MediaId` WHERE s.`SlotKey` = 'intro-main'    AND s.`MediaId` IS NULL;
UPDATE `ImageSlots` s JOIN `MediaAssets` m ON m.`FileName` = 'gallery-09'     SET s.`MediaId` = m.`MediaId` WHERE s.`SlotKey` = 'intro-accent'  AND s.`MediaId` IS NULL;
UPDATE `ImageSlots` s JOIN `MediaAssets` m ON m.`FileName` = 'dish-breakfast' SET s.`MediaId` = m.`MediaId` WHERE s.`SlotKey` = 'restaurant'    AND s.`MediaId` IS NULL;
UPDATE `ImageSlots` s JOIN `MediaAssets` m ON m.`FileName` = 'dish-thali'     SET s.`MediaId` = m.`MediaId` WHERE s.`SlotKey` = 'dish-1'        AND s.`MediaId` IS NULL;
UPDATE `ImageSlots` s JOIN `MediaAssets` m ON m.`FileName` = 'gallery-05'     SET s.`MediaId` = m.`MediaId` WHERE s.`SlotKey` = 'dish-2'        AND s.`MediaId` IS NULL;
UPDATE `ImageSlots` s JOIN `MediaAssets` m ON m.`FileName` = 'dish-seafood'   SET s.`MediaId` = m.`MediaId` WHERE s.`SlotKey` = 'dish-3'        AND s.`MediaId` IS NULL;
UPDATE `ImageSlots` s JOIN `MediaAssets` m ON m.`FileName` = 'meeting-hall'   SET s.`MediaId` = m.`MediaId` WHERE s.`SlotKey` = 'meeting-hall'  AND s.`MediaId` IS NULL;
UPDATE `ImageSlots` s JOIN `MediaAssets` m ON m.`FileName` = 'hero-garden'    SET s.`MediaId` = m.`MediaId` WHERE s.`SlotKey` = 'lawn'          AND s.`MediaId` IS NULL;
UPDATE `ImageSlots` s JOIN `MediaAssets` m ON m.`FileName` = 'mahal-stage'    SET s.`MediaId` = m.`MediaId` WHERE s.`SlotKey` = 'mahal-feature' AND s.`MediaId` IS NULL;
UPDATE `ImageSlots` s JOIN `MediaAssets` m ON m.`FileName` = 'mahal-hall'     SET s.`MediaId` = m.`MediaId` WHERE s.`SlotKey` = 'mahal-hall'    AND s.`MediaId` IS NULL;
UPDATE `ImageSlots` s JOIN `MediaAssets` m ON m.`FileName` = 'mahal-dining'   SET s.`MediaId` = m.`MediaId` WHERE s.`SlotKey` = 'mahal-dining'  AND s.`MediaId` IS NULL;
UPDATE `ImageSlots` s JOIN `MediaAssets` m ON m.`FileName` = 'mahal-exterior' SET s.`MediaId` = m.`MediaId` WHERE s.`SlotKey` = 'mahal-night'   AND s.`MediaId` IS NULL;
UPDATE `ImageSlots` s JOIN `MediaAssets` m ON m.`FileName` = 'attraction-muthupet' SET s.`MediaId` = m.`MediaId` WHERE s.`SlotKey` = 'travel-desk' AND s.`MediaId` IS NULL;

-- Watch-the-film sections: the full film (with sound) and a cover photo on Home and KVR Mahal. Only fills empty positions.
UPDATE `ImageSlots` s JOIN `MediaAssets` m ON m.`FileName` = 'film-queens-inn' SET s.`MediaId` = m.`MediaId` WHERE s.`SlotKey` = 'film-home'        AND s.`MediaId` IS NULL;
UPDATE `ImageSlots` s JOIN `MediaAssets` m ON m.`FileName` = 'hero-lobby'     SET s.`MediaId` = m.`MediaId` WHERE s.`SlotKey` = 'film-home-poster' AND s.`MediaId` IS NULL;
UPDATE `ImageSlots` s JOIN `MediaAssets` m ON m.`FileName` = 'film-kvr-mahal' SET s.`MediaId` = m.`MediaId` WHERE s.`SlotKey` = 'film-kvr'         AND s.`MediaId` IS NULL;
UPDATE `ImageSlots` s JOIN `MediaAssets` m ON m.`FileName` = 'mahal-stage'    SET s.`MediaId` = m.`MediaId` WHERE s.`SlotKey` = 'film-kvr-poster'  AND s.`MediaId` IS NULL;
