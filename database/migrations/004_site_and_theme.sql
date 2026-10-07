-- =====================================================================
-- 004_site_and_theme.sql  —  Key/value site settings and the three
-- theme colours (Primary, Accent, Surface) the whole site is built on.
-- =====================================================================
CREATE TABLE IF NOT EXISTS `SiteSettings` (
    `SettingKey`   VARCHAR(60)   NOT NULL,
    `SettingValue` VARCHAR(2000) NULL,
    `UpdatedAt`    DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`SettingKey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ThemeSettings` (
    `SettingKey`   VARCHAR(60)  NOT NULL,
    `SettingValue` VARCHAR(200) NULL,
    `UpdatedAt`    DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`SettingKey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `ThemeSettings` (`SettingKey`, `SettingValue`) VALUES
 ('PrimaryColor', '#0F243E'),
 ('AccentColor',  '#C5A880'),
 ('SurfaceColor', '#FBFBF9');

INSERT IGNORE INTO `SiteSettings` (`SettingKey`, `SettingValue`) VALUES
 ('HotelName',       'Queen''s Inn'),
 ('LocationLine',    'Velankanni'),
 ('Phone1',          '+91 91593 99988'),
 ('Phone2',          '+91 91594 99988'),
 ('WhatsAppNumber',  '919159399988'),
 ('WhatsAppMessage', 'Hello Queen''s Inn, I''d like to enquire about a stay.'),
 ('ReservationsEmail','reservations@queensinn.co.in'),
 ('SalesEmail',      'sales@queensinn.co.in'),
 ('Address',         '# 41/A, ECR Main Road, Arch West Street, Velankanni 611 111, Tamil Nadu'),
 ('MapUrl',          'https://maps.google.com/?q=Hotel+Queens+Inn+Velankanni'),
 ('Latitude',        '10.6806'),
 ('Longitude',       '79.8474'),
 ('CheckInTime',     '12:00 PM'),
 ('CheckOutTime',    '11:00 AM'),
 ('LogoLightUrl',    NULL),
 ('LogoDarkUrl',     NULL),
 ('FaviconUrl',      NULL),
 ('FacebookUrl',     NULL),
 ('InstagramUrl',    NULL),
 ('YouTubeUrl',      NULL),
 ('GoogleClientId',  NULL);

INSERT INTO `__schema_migrations` (`script_name`)
SELECT '004_site_and_theme.sql'
WHERE NOT EXISTS (SELECT 1 FROM `__schema_migrations` WHERE `script_name` = '004_site_and_theme.sql');
