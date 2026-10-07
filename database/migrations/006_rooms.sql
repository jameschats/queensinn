-- =====================================================================
-- 006_rooms.sql  —  Room categories shown on Home and /bookroom.
-- Seeded with the four categories from the live site (tariffs + GST).
-- =====================================================================
CREATE TABLE IF NOT EXISTS `Rooms` (
    `RoomId`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `Slug`            VARCHAR(120) NOT NULL,
    `Name`            VARCHAR(120) NOT NULL,
    `Tagline`         VARCHAR(200) NULL,
    `Description`     TEXT NULL,
    `SizeSqFt`        INT NULL,
    `BedType`         VARCHAR(80) NULL,
    `ViewType`        VARCHAR(80) NULL,
    `MaxGuests`       INT NOT NULL DEFAULT 2,
    `StartingTariff`  DECIMAL(10,2) NULL,
    `TaxNote`         VARCHAR(60) NULL DEFAULT '+ GST',
    `FeaturedMediaId` BIGINT UNSIGNED NULL,
    `DisplayOrder`    INT NOT NULL DEFAULT 0,
    `IsActive`        TINYINT(1) NOT NULL DEFAULT 1,
    `CreatedAt`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt`       DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`RoomId`),
    UNIQUE KEY `uq_rooms_slug` (`Slug`),
    CONSTRAINT `fk_rooms_media` FOREIGN KEY (`FeaturedMediaId`) REFERENCES `MediaAssets` (`MediaId`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `RoomImages` (
    `RoomId`       BIGINT UNSIGNED NOT NULL,
    `MediaId`      BIGINT UNSIGNED NOT NULL,
    `DisplayOrder` INT NOT NULL DEFAULT 0,
    PRIMARY KEY (`RoomId`, `MediaId`),
    CONSTRAINT `fk_roomimages_room`  FOREIGN KEY (`RoomId`)  REFERENCES `Rooms` (`RoomId`) ON DELETE CASCADE,
    CONSTRAINT `fk_roomimages_media` FOREIGN KEY (`MediaId`) REFERENCES `MediaAssets` (`MediaId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Amenities` (
    `AmenityId`    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `Name`         VARCHAR(80) NOT NULL,
    `Icon`         VARCHAR(40) NULL,
    `DisplayOrder` INT NOT NULL DEFAULT 0,
    PRIMARY KEY (`AmenityId`),
    UNIQUE KEY `uq_amenities_name` (`Name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `RoomAmenities` (
    `RoomId`    BIGINT UNSIGNED NOT NULL,
    `AmenityId` BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (`RoomId`, `AmenityId`),
    CONSTRAINT `fk_roomamenities_room`    FOREIGN KEY (`RoomId`)    REFERENCES `Rooms` (`RoomId`) ON DELETE CASCADE,
    CONSTRAINT `fk_roomamenities_amenity` FOREIGN KEY (`AmenityId`) REFERENCES `Amenities` (`AmenityId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `Amenities` (`Name`, `Icon`, `DisplayOrder`) VALUES
 ('Free Wi-Fi','wifi',1), ('Air conditioning','snow',2), ('Smart TV','tv',3), ('Tea & coffee kettle','cup',4),
 ('Electronic safe','safe',5), ('Minibar','minibar',6), ('24h hot water','drop',7), ('Wardrobe','wardrobe',8),
 ('Private balcony','balcony',9), ('Living lounge','sofa',10), ('Premium bath','bath',11), ('In-room dining','tray',12);

INSERT IGNORE INTO `Rooms` (`Slug`,`Name`,`Tagline`,`Description`,`SizeSqFt`,`BedType`,`ViewType`,`MaxGuests`,`StartingTariff`,`DisplayOrder`) VALUES
 ('deluxe-double','Deluxe Double Room','Garden views for two',
  'A calm retreat for couples and solo pilgrims, looking out over the manicured lawns. Split air conditioning, plush bedding, a work desk and blackout curtains for an unhurried rest after early mass.',
  325,'King bed','Garden view',2,2500,1),
 ('executive-triple','Executive Triple Room','Room for three, without compromise',
  'A flexible layout for small families and pilgrimage companions travelling together, with a double and a single bed, a full wardrobe and space to settle in for several nights.',
  350,'Double + single bed','City view',3,3500,2),
 ('family-room','Family Room','Four guests and a private balcony',
  'A bright corner room that keeps the whole family together, with two double beds and a private sit-out balcony above the garden and children''s play lawn.',
  405,'Two double beds','Balcony',4,4500,3),
 ('queens-suite','The Queen''s Suite','A separate lounge for bridal parties and dignitaries',
  'Our signature accommodation: a royal living lounge, a master bedroom with king bed and premium bath fixtures. Chosen by bridal parties at KVR Mahal and guests staying longer.',
  576,'King bed + living lounge','Balcony view',3,6000,4);

INSERT IGNORE INTO `RoomAmenities` (`RoomId`,`AmenityId`)
SELECT r.RoomId, a.AmenityId FROM Rooms r JOIN Amenities a
WHERE (r.Slug='deluxe-double'    AND a.Name IN ('Free Wi-Fi','Air conditioning','Smart TV','Tea & coffee kettle','Electronic safe','Minibar','24h hot water'))
   OR (r.Slug='executive-triple' AND a.Name IN ('Free Wi-Fi','Air conditioning','Wardrobe','Tea & coffee kettle','Electronic safe','24h hot water'))
   OR (r.Slug='family-room'      AND a.Name IN ('Free Wi-Fi','Air conditioning','Private balcony','Minibar','Electronic safe','24h hot water'))
   OR (r.Slug='queens-suite'     AND a.Name IN ('Living lounge','Premium bath','Private balcony','Minibar','Smart TV','In-room dining'));

INSERT INTO `__schema_migrations` (`script_name`)
SELECT '006_rooms.sql'
WHERE NOT EXISTS (SELECT 1 FROM `__schema_migrations` WHERE `script_name` = '006_rooms.sql');
