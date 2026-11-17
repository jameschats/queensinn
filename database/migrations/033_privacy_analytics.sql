-- =====================================================================
-- 033_privacy_analytics.sql  —  Privacy policy: say that the site counts visits (own counter + Google Analytics). Safe to re-run.
-- =====================================================================
UPDATE `PolicyPages`
SET `BodyHtml` = REPLACE(`BodyHtml`, '<h2>Payments</h2>',
  CONCAT('<h2>Website visits and cookies</h2>',
  '<p>We count visits to this website to see which pages are useful. Our own counter uses no cookies and keeps nothing that identifies you. We also use Google Analytics, which sets cookies in your browser and sends anonymous usage details (pages viewed, device type, approximate location) to Google. We use this only to improve the website. You can block these cookies in your browser settings, or use Google''s opt-out add-on at <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener">tools.google.com/dlpage/gaoptout</a>.</p>',
  '<h2>Payments</h2>'))
WHERE `Slug` = 'privacy-policy' AND `BodyHtml` NOT LIKE '%Website visits and cookies%';

INSERT INTO `__schema_migrations` (`script_name`)
SELECT '033_privacy_analytics.sql'
WHERE NOT EXISTS (SELECT 1 FROM `__schema_migrations` WHERE `script_name` = '033_privacy_analytics.sql');
