-- =====================================================================
-- 019_gallery_leftover_photos.sql  —  Puts the seed photos that were in the library but on no page to use.
--  * Home collage: adds the entrance gate, the lawn reception and the extra room photo.
--  * KVR Mahal page: a new photo strip ('mahal' placement) of ten hall, stage and dining photos.
--  * Executive Triple Room: the extra room photo joins its gallery.
-- Everything is matched by the photo's key (FileName) and only fills gaps, so it does nothing on a database
-- that has no photos yet (link-media.sql does the same job there) and never duplicates or overrides admin choices.
-- =====================================================================

-- Home collage: append the photos that are not in it yet.
INSERT INTO `GalleryItems` (`Placement`, `MediaId`, `DisplayOrder`, `ShowOnHome`)
SELECT 'collage', m.`MediaId`, 100 + o.`ord`, 1
FROM (SELECT 'gallery-07' k, 1 ord UNION ALL SELECT 'gallery-08', 2 UNION ALL SELECT 'room-twin', 3) o
JOIN `MediaAssets` m ON m.`FileName` = o.`k`
WHERE NOT EXISTS (SELECT 1 FROM `GalleryItems` g WHERE g.`Placement` = 'collage' AND g.`MediaId` = m.`MediaId`)
  AND EXISTS (SELECT 1 FROM `GalleryItems` WHERE `Placement` = 'collage');

-- KVR Mahal strip: only when it is empty. Titles and captions describe what the photo shows.
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

-- Executive Triple Room: the extra room photo joins its gallery.
INSERT IGNORE INTO `RoomImages` (`RoomId`, `MediaId`, `DisplayOrder`)
SELECT r.`RoomId`, m.`MediaId`, 1
FROM `Rooms` r JOIN `MediaAssets` m ON m.`FileName` = 'room-twin'
WHERE r.`Slug` = 'executive-triple';

INSERT INTO `__schema_migrations` (`script_name`)
SELECT '019_gallery_leftover_photos.sql'
WHERE NOT EXISTS (SELECT 1 FROM `__schema_migrations` WHERE `script_name` = '019_gallery_leftover_photos.sql');
