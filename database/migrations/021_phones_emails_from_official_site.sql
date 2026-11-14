-- =====================================================================
-- 021_phones_emails_from_official_site.sql  —  Contact details now match the current official website
-- (www.queensinn.co.in): three phone numbers, and the real second email address.
--  * Phone3 = +91 93639 70177 (new setting; shown wherever the other phones are).
--  * SalesEmail: sales@queensinn.co.in was never on the official site. KVR Mahal enquiries are emailed to this
--    address, so it is replaced with hotelqueensinn@gmail.com, the second address the official site lists.
-- Each change only applies while the old value is still in place, so anything staff set in the admin is kept.
-- =====================================================================
INSERT IGNORE INTO `SiteSettings` (`SettingKey`, `SettingValue`) VALUES ('Phone3', '+91 93639 70177');

UPDATE `SiteSettings` SET `SettingValue` = 'hotelqueensinn@gmail.com'
WHERE `SettingKey` = 'SalesEmail' AND `SettingValue` = 'sales@queensinn.co.in';

INSERT INTO `__schema_migrations` (`script_name`)
SELECT '021_phones_emails_from_official_site.sql'
WHERE NOT EXISTS (SELECT 1 FROM `__schema_migrations` WHERE `script_name` = '021_phones_emails_from_official_site.sql');
