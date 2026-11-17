-- =====================================================================
-- 031_google_profile_url.sql  —  The hotel's Google Business Profile link, shown in the footer as "Google reviews" (editable in Site settings → Social).
-- =====================================================================
INSERT IGNORE INTO `SiteSettings` (`SettingKey`, `SettingValue`) VALUES ('GoogleProfileUrl', 'https://share.google/tA76nEuLXOr0SG9a7');

INSERT INTO `__schema_migrations` (`script_name`)
SELECT '031_google_profile_url.sql'
WHERE NOT EXISTS (SELECT 1 FROM `__schema_migrations` WHERE `script_name` = '031_google_profile_url.sql');
