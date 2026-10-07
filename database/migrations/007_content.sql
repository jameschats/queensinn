-- =====================================================================
-- 007_content.sql  —  Pages (one row per public route, carrying SEO),
-- their sections (flexible JSON content), hero slides, attractions,
-- gallery, testimonials and policy pages.
-- =====================================================================
CREATE TABLE IF NOT EXISTS `Pages` (
    `PageId`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `Slug`            VARCHAR(80)  NOT NULL,          -- '' for home, 'kvr-mahal', 'bookroom', ...
    `Title`           VARCHAR(150) NOT NULL,
    `MetaTitle`       VARCHAR(160) NULL,
    `MetaDescription` VARCHAR(320) NULL,
    `OgMediaId`       BIGINT UNSIGNED NULL,
    `UpdatedAt`       DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`PageId`),
    UNIQUE KEY `uq_pages_slug` (`Slug`),
    CONSTRAINT `fk_pages_og` FOREIGN KEY (`OgMediaId`) REFERENCES `MediaAssets` (`MediaId`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `PageSections` (
    `SectionId`    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `PageId`       BIGINT UNSIGNED NOT NULL,
    `SectionKey`   VARCHAR(60) NOT NULL,              -- 'intro', 'dining', 'mahal-feature', ...
    `SectionType`  VARCHAR(40) NOT NULL,              -- 'split', 'ledger', 'feature', 'amenities', ...
    `ContentJson`  JSON NOT NULL,
    `DisplayOrder` INT NOT NULL DEFAULT 0,
    `IsVisible`    TINYINT(1) NOT NULL DEFAULT 1,
    `UpdatedAt`    DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`SectionId`),
    UNIQUE KEY `uq_pagesections_key` (`PageId`, `SectionKey`),
    CONSTRAINT `fk_pagesections_page` FOREIGN KEY (`PageId`) REFERENCES `Pages` (`PageId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `HeroSlides` (
    `SlideId`      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `PageId`       BIGINT UNSIGNED NOT NULL,
    `MediaId`      BIGINT UNSIGNED NULL,
    `VideoUrl`     VARCHAR(500) NULL,
    `Kicker`       VARCHAR(120) NULL,
    `Headline`     VARCHAR(200) NULL,
    `SubHeadline`  VARCHAR(400) NULL,
    `CtaText`      VARCHAR(60)  NULL,
    `CtaUrl`       VARCHAR(300) NULL,
    `DisplayOrder` INT NOT NULL DEFAULT 0,
    PRIMARY KEY (`SlideId`),
    KEY `ix_heroslides_page` (`PageId`),
    CONSTRAINT `fk_heroslides_page`  FOREIGN KEY (`PageId`)  REFERENCES `Pages` (`PageId`) ON DELETE CASCADE,
    CONSTRAINT `fk_heroslides_media` FOREIGN KEY (`MediaId`) REFERENCES `MediaAssets` (`MediaId`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Attractions` (
    `AttractionId` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `Name`         VARCHAR(120) NOT NULL,
    `DistanceKm`   DECIMAL(6,1) NOT NULL,
    `Description`  TEXT NULL,
    `MediaId`      BIGINT UNSIGNED NULL,
    `DisplayOrder` INT NOT NULL DEFAULT 0,
    `IsVisible`    TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (`AttractionId`),
    CONSTRAINT `fk_attractions_media` FOREIGN KEY (`MediaId`) REFERENCES `MediaAssets` (`MediaId`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `GalleryCategories` (
    `CategoryId`   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `Name`         VARCHAR(60) NOT NULL,
    `DisplayOrder` INT NOT NULL DEFAULT 0,
    PRIMARY KEY (`CategoryId`),
    UNIQUE KEY `uq_gallerycategories_name` (`Name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `GalleryItems` (
    `GalleryItemId` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `CategoryId`    BIGINT UNSIGNED NULL,
    `MediaId`       BIGINT UNSIGNED NOT NULL,
    `DisplayOrder`  INT NOT NULL DEFAULT 0,
    `ShowOnHome`    TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (`GalleryItemId`),
    CONSTRAINT `fk_galleryitems_category` FOREIGN KEY (`CategoryId`) REFERENCES `GalleryCategories` (`CategoryId`) ON DELETE SET NULL,
    CONSTRAINT `fk_galleryitems_media`    FOREIGN KEY (`MediaId`)    REFERENCES `MediaAssets` (`MediaId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Testimonials` (
    `TestimonialId` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `Quote`         VARCHAR(600) NOT NULL,
    `GuestName`     VARCHAR(120) NOT NULL,
    `Origin`        VARCHAR(120) NULL,
    `DisplayOrder`  INT NOT NULL DEFAULT 0,
    `IsVisible`     TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (`TestimonialId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `PolicyPages` (
    `Slug`      VARCHAR(80)  NOT NULL,
    `Title`     VARCHAR(150) NOT NULL,
    `BodyHtml`  MEDIUMTEXT   NOT NULL,
    `UpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`Slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Every preserved route plus the new KVR Mahal page.
INSERT IGNORE INTO `Pages` (`Slug`,`Title`,`MetaTitle`,`MetaDescription`) VALUES
 ('',                    'Home',                 'Hotel Queen''s Inn, Velankanni | Luxury Hotel & KVR Mahal', 'A three-acre luxury hotel on ECR Main Road, 500 m from the Velankanni Basilica. 51 AC rooms, multi-cuisine dining and KVR Mahal for weddings.'),
 ('bookroom',            'Rooms & suites',       'Rooms & Tariffs | Hotel Queen''s Inn, Velankanni', 'Deluxe, Executive Triple, Family and Queen''s Suite rooms near the Velankanni Basilica. Send a reservation enquiry or WhatsApp the front desk.'),
 ('kvr-mahal',           'KVR Mahal',            'KVR Mahal | Wedding & Reception Hall in Velankanni', 'Velankanni''s grandest air-conditioned mandapam for 500–1,000 guests, with a 300-seat dining pavilion and 51 hotel rooms on one campus.'),
 ('about-us',            'Our story',            'About Us | Hotel Queen''s Inn, Velankanni', 'Welcoming pilgrims, families and celebrations to Velankanni since 2017, on ECR Main Road near the Shrine Basilica.'),
 ('activities',          'Experiences',          'Things to Do Near Velankanni | Hotel Queen''s Inn', 'Velankanni Basilica, Nagore Dargah, Thirunallar, Point Calimere, Muthupet mangroves and Tranquebar, with distances from the hotel.'),
 ('contact',             'Contact',              'Contact | Hotel Queen''s Inn, Velankanni', 'Call, WhatsApp or email Hotel Queen''s Inn, ECR Main Road, Velankanni 611 111.'),
 ('terms-conditions',    'Terms & conditions',   'Terms & Conditions | Hotel Queen''s Inn', NULL),
 ('cancellation-policy', 'Cancellation & refund','Cancellation & Refund Policy | Hotel Queen''s Inn', NULL),
 ('privacy-policy',      'Privacy policy',       'Privacy Policy | Hotel Queen''s Inn', NULL);

INSERT IGNORE INTO `HeroSlides` (`PageId`,`Headline`,`SubHeadline`,`DisplayOrder`)
SELECT PageId, 'Tranquility meets luxury in the sacred heart of Velankanni',
       'A three-acre sanctuary on ECR Main Road, 500 metres from the Shrine Basilica. Fifty-one rooms, a multi-cuisine restaurant and the grand KVR Mahal.', 1
FROM Pages WHERE Slug = '' AND NOT EXISTS (SELECT 1 FROM HeroSlides h JOIN Pages p ON p.PageId = h.PageId WHERE p.Slug = '');

INSERT INTO `Attractions` (`Name`,`DistanceKm`,`Description`,`DisplayOrder`)
SELECT * FROM (SELECT
 'Velankanni Basilica' n, 0.5 d, 'The Shrine Basilica of Our Lady of Good Health and the Morning Star Church, with the holy tank. A ten-minute walk from the hotel.' t, 1 o UNION ALL SELECT
 'Nagore Dargah', 14, 'The centuries-old shrine with five white minarets, a symbol of the coast''s interfaith harmony.', 2 UNION ALL SELECT
 'Thirunallar Saniswaran', 35, 'The Dharbaranyeswarar temple, revered for its shrine to Lord Shani, with the Nala Theertham tank.', 3 UNION ALL SELECT
 'Point Calimere Sanctuary', 45, 'A protected coastal reserve where flamingos arrive between November and February, and blackbuck graze the grasslands.', 4 UNION ALL SELECT
 'Muthupet Mangroves', 50, 'Wooden boat rides through quiet lagoons and mangrove canopy to the sea.', 5 UNION ALL SELECT
 'Tranquebar (Dansborg)', 55, 'The 17th-century Danish fort facing the Bay of Bengal, with colonial streets and seaside walks.', 6) x
WHERE NOT EXISTS (SELECT 1 FROM Attractions);

INSERT IGNORE INTO `GalleryCategories` (`Name`,`DisplayOrder`) VALUES
 ('Rooms',1), ('Dining',2), ('KVR Mahal',3), ('Campus',4), ('Events',5);

INSERT IGNORE INTO `PolicyPages` (`Slug`,`Title`,`BodyHtml`) VALUES
 ('terms-conditions','Terms & conditions','<h2>Check-in and check-out</h2><p>Check-in is from 12:00 PM and check-out by 11:00 AM.</p><h2>Identification</h2><p>Every adult guest must present a valid government-issued photo ID at check-in.</p>'),
 ('cancellation-policy','Cancellation & refund','<h2>Standard cancellations</h2><p>Free cancellation up to 48 hours before arrival.</p><h2>Annual Feast (29 August – 8 September)</h2><p>Special conditions apply during the Feast.</p>'),
 ('privacy-policy','Privacy policy','<h2>What we collect</h2><p>Your name, phone, email and travel details when you send an enquiry.</p>');

INSERT INTO `__schema_migrations` (`script_name`)
SELECT '007_content.sql'
WHERE NOT EXISTS (SELECT 1 FROM `__schema_migrations` WHERE `script_name` = '007_content.sql');
