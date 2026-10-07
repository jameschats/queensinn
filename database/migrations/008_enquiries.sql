-- =====================================================================
-- 008_enquiries.sql  —  One inbox for room, KVR Mahal and contact
-- enquiries, plus staff notes. No bookings or payments are stored.
-- =====================================================================
CREATE TABLE IF NOT EXISTS `Enquiries` (
    `EnquiryId`  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `Type`       VARCHAR(10)  NOT NULL,                  -- Room | Mahal | Contact
    `Status`     VARCHAR(12)  NOT NULL DEFAULT 'New',    -- New | Contacted | Confirmed | Lost
    `Name`       VARCHAR(150) NOT NULL,
    `Phone`      VARCHAR(30)  NOT NULL,
    `Email`      VARCHAR(256) NULL,
    `CheckIn`    DATE NULL,
    `CheckOut`   DATE NULL,
    `RoomId`     BIGINT UNSIGNED NULL,
    `Guests`     VARCHAR(40)  NULL,
    `EventType`  VARCHAR(40)  NULL,
    `EventDate`  DATE NULL,
    `AltDate`    DATE NULL,
    `GuestCount` VARCHAR(40)  NULL,
    `RoomsNeeded` VARCHAR(40) NULL,
    `Subject`    VARCHAR(120) NULL,
    `Message`    TEXT NULL,
    `SourcePage` VARCHAR(120) NULL,
    `ClientIp`   VARCHAR(45)  NULL,
    `CreatedAt`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt`  DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`EnquiryId`),
    KEY `ix_enquiries_type_status` (`Type`, `Status`),
    KEY `ix_enquiries_created` (`CreatedAt`),
    CONSTRAINT `fk_enquiries_room` FOREIGN KEY (`RoomId`) REFERENCES `Rooms` (`RoomId`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `EnquiryNotes` (
    `EnquiryNoteId` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `EnquiryId`     BIGINT UNSIGNED NOT NULL,
    `UserId`        BIGINT UNSIGNED NULL,
    `Note`          VARCHAR(2000) NOT NULL,
    `CreatedAt`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`EnquiryNoteId`),
    KEY `ix_enquirynotes_enquiry` (`EnquiryId`),
    CONSTRAINT `fk_enquirynotes_enquiry` FOREIGN KEY (`EnquiryId`) REFERENCES `Enquiries` (`EnquiryId`) ON DELETE CASCADE,
    CONSTRAINT `fk_enquirynotes_user`    FOREIGN KEY (`UserId`)    REFERENCES `Users` (`UserId`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `__schema_migrations` (`script_name`)
SELECT '008_enquiries.sql'
WHERE NOT EXISTS (SELECT 1 FROM `__schema_migrations` WHERE `script_name` = '008_enquiries.sql');
