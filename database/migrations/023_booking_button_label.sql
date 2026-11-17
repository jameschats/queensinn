-- =====================================================================
-- 023_booking_button_label.sql  —  The Google Hotels button is now the main room action on the Rooms page, so its label
-- reads "Check availability and prices" (it was "Book online on Google Hotels"). Only renames the seeded line; a label
-- or link list that staff have edited is left alone.
-- =====================================================================
UPDATE `SiteSettings`
SET `SettingValue` = REPLACE(`SettingValue`, 'Book online on Google Hotels |', 'Check availability and prices |')
WHERE `SettingKey` = 'BookingLinks' AND `SettingValue` LIKE 'Book online on Google Hotels |%';

INSERT INTO `__schema_migrations` (`script_name`)
SELECT '023_booking_button_label.sql'
WHERE NOT EXISTS (SELECT 1 FROM `__schema_migrations` WHERE `script_name` = '023_booking_button_label.sql');
