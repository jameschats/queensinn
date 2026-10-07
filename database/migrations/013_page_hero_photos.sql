-- =====================================================================
-- 013_page_hero_photos.sql  —  Hero photos are now a per-page list (HeroSlides) edited in
-- Admin > Pages & content, replacing the hero-* image slots from migration 012.
-- Copies any photo already set in those slots across, once per page, only if the page
-- has no hero photo yet. The old slot rows are left in place (unused, harmless).
-- =====================================================================
INSERT INTO `HeroSlides` (`PageId`, `MediaId`, `DisplayOrder`)
SELECT p.`PageId`, s.`MediaId`, 1
FROM `ImageSlots` s JOIN `Pages` p ON p.`Slug` = 'bookroom'
WHERE s.`SlotKey` = 'hero-bookroom' AND s.`MediaId` IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM `HeroSlides` h WHERE h.`PageId` = p.`PageId` AND h.`MediaId` IS NOT NULL);

INSERT INTO `HeroSlides` (`PageId`, `MediaId`, `DisplayOrder`)
SELECT p.`PageId`, s.`MediaId`, 1
FROM `ImageSlots` s JOIN `Pages` p ON p.`Slug` = 'about-us'
WHERE s.`SlotKey` = 'hero-about' AND s.`MediaId` IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM `HeroSlides` h WHERE h.`PageId` = p.`PageId` AND h.`MediaId` IS NOT NULL);

INSERT INTO `__schema_migrations` (`script_name`)
SELECT '013_page_hero_photos.sql'
WHERE NOT EXISTS (SELECT 1 FROM `__schema_migrations` WHERE `script_name` = '013_page_hero_photos.sql');
