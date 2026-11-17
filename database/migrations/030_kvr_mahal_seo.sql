-- =====================================================================
-- 030_kvr_mahal_seo.sql  —  Another hall named "KVR Mahal" exists in Coimbatore district, so the Velankanni hall always carries its place name.
-- Updates the KVR Mahal page's search title and description, and makes the address match the hotel's Google Business Profile
-- ("ECR Road"). Each change applies only while the old wording is still in place, so anything staff edited since is left alone.
-- =====================================================================
UPDATE `Pages`
SET `MetaTitle` = 'KVR Mahal Velankanni | Wedding Hall at Hotel Queen''s Inn',
    `MetaDescription` = 'KVR Mahal in Velankanni, Nagapattinam: a fully air-conditioned wedding and reception hall for 500–1,000 guests with a 300-seat dining pavilion, beside Hotel Queen''s Inn on ECR Road.'
WHERE `Slug` = 'kvr-mahal' AND `MetaTitle` = 'KVR Mahal | Wedding & Reception Hall in Velankanni';

UPDATE `SiteSettings`
SET `SettingValue` = '41/A, ECR Road, Arch West Street, Velankanni 611 111, Tamil Nadu'
WHERE `SettingKey` = 'Address' AND `SettingValue` = '# 41/A, ECR Main Road, Arch West Street, Velankanni 611 111, Tamil Nadu';

INSERT INTO `__schema_migrations` (`script_name`)
SELECT '030_kvr_mahal_seo.sql'
WHERE NOT EXISTS (SELECT 1 FROM `__schema_migrations` WHERE `script_name` = '030_kvr_mahal_seo.sql');
