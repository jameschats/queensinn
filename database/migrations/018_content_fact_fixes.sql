-- =====================================================================
-- 018_content_fact_fixes.sql  —  Removes claims that nobody has verified.
--  1. "A ten-minute walk from the hotel" on the Velankanni Basilica experience (migration 007 seed text).
--     The walking time does not match the map; the distance figure is left for the client to confirm.
--  2. "a photograph on a phone is not accepted" in the Terms (migration 017): the hotel never stated that rule.
-- Both only change text that still has the original wording, so an admin's edits are never overwritten.
-- =====================================================================
UPDATE `Attractions`
SET `Description` = TRIM(REPLACE(`Description`, ' A ten-minute walk from the hotel.', ''))
WHERE `Name` = 'Velankanni Basilica' AND `Description` LIKE '%ten-minute walk%';

UPDATE `PolicyPages`
SET `BodyHtml` = REPLACE(`BodyHtml`, ' Please carry the original document; a photograph on a phone is not accepted.', '')
WHERE `Slug` = 'terms-conditions' AND `BodyHtml` LIKE '%photograph on a phone%';

-- 3. The distance to the Basilica is stated by road ("10 minutes by road"), never as "500 m" or a walking time.
--    Fixes the stored home-page search description and the old hero text row from migration 007.
UPDATE `Pages`
SET `MetaDescription` = REPLACE(`MetaDescription`, '500 m from the Velankanni Basilica', '10 minutes by road from the Velankanni Basilica')
WHERE `Slug` = '' AND `MetaDescription` LIKE '%500 m from%';

UPDATE `HeroSlides`
SET `SubHeadline` = REPLACE(`SubHeadline`, '500 metres from the Shrine Basilica', 'ten minutes by road from the Shrine Basilica')
WHERE `SubHeadline` LIKE '%500 metres from%';

INSERT INTO `__schema_migrations` (`script_name`)
SELECT '018_content_fact_fixes.sql'
WHERE NOT EXISTS (SELECT 1 FROM `__schema_migrations` WHERE `script_name` = '018_content_fact_fixes.sql');
