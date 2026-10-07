-- =====================================================================
-- 015_contact_hero_photo.sql  —  The Contact page now has a photo hero like the other pages.
-- Gives it the reception photo once, if it has no hero photo yet (nothing happens if that photo isn't in the
-- library). Staff can change it under Pages & content > Contact.
-- =====================================================================
INSERT INTO `HeroSlides` (`PageId`, `MediaId`, `DisplayOrder`)
SELECT p.`PageId`, m.`MediaId`, 1
FROM `Pages` p JOIN `MediaAssets` m ON m.`FileName` = 'hero-lobby'
WHERE p.`Slug` = 'contact'
  AND NOT EXISTS (SELECT 1 FROM `HeroSlides` h WHERE h.`PageId` = p.`PageId` AND h.`MediaId` IS NOT NULL);

INSERT INTO `__schema_migrations` (`script_name`)
SELECT '015_contact_hero_photo.sql'
WHERE NOT EXISTS (SELECT 1 FROM `__schema_migrations` WHERE `script_name` = '015_contact_hero_photo.sql');
