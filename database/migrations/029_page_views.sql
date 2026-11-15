-- =====================================================================
-- 029_page_views.sql  —  First-party, cookie-free traffic counts for the admin dashboard.
-- One row per page view. No IP address or user agent is stored: VisitorHash is a one-way hash that changes every day,
-- so it can count distinct visitors within a day but cannot follow anyone across days or identify them.
-- Day is the calendar day in India (IST), which is what the hotel reads reports in.
-- =====================================================================
CREATE TABLE IF NOT EXISTS `PageViews` (
    `PageViewId`  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `ViewedAt`    DATETIME NOT NULL,
    `Day`         DATE NOT NULL,
    `Path`        VARCHAR(150) NOT NULL,
    `Referrer`    VARCHAR(120) NULL,                -- host only, e.g. google.com; NULL = direct
    `Device`      VARCHAR(10)  NOT NULL,            -- Mobile | Tablet | Desktop
    `VisitorHash` CHAR(16)     NOT NULL,
    PRIMARY KEY (`PageViewId`),
    KEY `ix_pageviews_day` (`Day`, `VisitorHash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `__schema_migrations` (`script_name`)
SELECT '029_page_views.sql'
WHERE NOT EXISTS (SELECT 1 FROM `__schema_migrations` WHERE `script_name` = '029_page_views.sql');
