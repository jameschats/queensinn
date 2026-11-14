-- =====================================================================
-- 026_deluxe_double_bed.sql  —  The Deluxe Double Room has a double bed, as the current official website says
-- ("Double Bed"). The blueprint said "king". The Queen's Suite stays "king" (the official site says so too).
-- Only changes the seeded wording, so text staff have edited in the admin is kept.
-- =====================================================================
UPDATE `Rooms` SET `BedType` = 'Double bed' WHERE `Slug` = 'deluxe-double' AND `BedType` = 'King bed';

UPDATE `Rooms`
SET `Description` = REPLACE(`Description`, 'a king bed, a proper work desk', 'a double bed, a proper work desk')
WHERE `Slug` = 'deluxe-double' AND `Description` LIKE '%a king bed, a proper work desk%';

INSERT INTO `__schema_migrations` (`script_name`)
SELECT '026_deluxe_double_bed.sql'
WHERE NOT EXISTS (SELECT 1 FROM `__schema_migrations` WHERE `script_name` = '026_deluxe_double_bed.sql');
