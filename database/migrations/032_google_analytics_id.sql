-- =====================================================================
-- 032_google_analytics_id.sql  —  Google Analytics 4 Measurement ID (editable in Site settings → Analytics). Empty turns it off.
-- =====================================================================
INSERT IGNORE INTO `SiteSettings` (`SettingKey`, `SettingValue`) VALUES ('GoogleAnalyticsId', 'G-LLBNQEFZ8Q');

INSERT INTO `__schema_migrations` (`script_name`)
SELECT '032_google_analytics_id.sql'
WHERE NOT EXISTS (SELECT 1 FROM `__schema_migrations` WHERE `script_name` = '032_google_analytics_id.sql');
