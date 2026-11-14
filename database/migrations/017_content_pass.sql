-- =====================================================================
-- 017_content_pass.sql  —  The written content for launch: room descriptions and the three policy pages.
-- Wording follows the website architecture blueprint (sizes, bed types, views, check-in/out times, the
-- 48-hour free cancellation and the annual Feast dates). Nothing here states a fee, percentage or refund
-- period the hotel has not confirmed; those stay out until the client supplies them.
-- One-off: it replaces the starter text from 006/007. Staff can edit everything afterwards in the admin
-- (Rooms, Pages & content > Policies). Tariffs, sizes and amenities are not touched.
-- =====================================================================

UPDATE `Rooms` SET
  `Tagline` = 'Garden views for two',
  `Description` = 'A calm retreat for couples and solo pilgrims: a king bed, a proper work desk and a view over the manicured lawns. Split air conditioning, a smart TV and a tea and coffee kettle are in the room, and heavy curtains keep the morning out after an early mass.'
WHERE `Slug` = 'deluxe-double';

UPDATE `Rooms` SET
  `Tagline` = 'Room for three, without compromise',
  `Description` = 'A double bed and a single bed in a layout that suits small families and pilgrimage companions travelling together. High-speed Wi-Fi, a full wardrobe and hot water around the clock, with city-facing windows and space to settle in for several nights.'
WHERE `Slug` = 'executive-triple';

UPDATE `Rooms` SET
  `Tagline` = 'Four guests and a private balcony',
  `Description` = 'A bright corner room that keeps the whole family together: two double beds for four adults and a private sit-out balcony over the gardens, so everyone has space without needing a second room.'
WHERE `Slug` = 'family-room';

UPDATE `Rooms` SET
  `Tagline` = 'A separate lounge for bridal parties and dignitaries',
  `Description` = 'Our signature accommodation: a separate living lounge, a master bedroom with a king bed, and premium bath fixtures. Chosen by bridal parties at KVR Mahal, visiting dignitaries and guests staying longer.'
WHERE `Slug` = 'queens-suite';

UPDATE `PolicyPages` SET `Title` = 'Terms & conditions', `BodyHtml` = CONCAT(
'<h2>Check-in and check-out</h2>',
'<p>Check-in is from 12:00 PM and check-out is by 11:00 AM. Early check-in and late check-out depend on availability; please ask the front desk and we will do our best.</p>',
'<h2>Identification</h2>',
'<p>Every adult guest must show a valid government-issued photo ID at check-in. Please carry the original document; a photograph on a phone is not accepted.</p>',
'<h2>Reservations</h2>',
'<p>This website does not take bookings or payments. An enquiry becomes a reservation only when our reservations desk confirms it to you by phone, WhatsApp or email.</p>',
'<h2>Tariffs</h2>',
'<p>Tariffs shown on the website are starting rates per night and are subject to GST. The rate for your dates is confirmed when your reservation is confirmed.</p>',
'<h2>Campus conduct</h2>',
'<p>Please keep the campus peaceful: be considerate of other guests, especially at night and in the early morning, and take care of the rooms, furniture and gardens. Guests are responsible for loss or damage to hotel property during their stay.</p>',
'<h2>KVR Mahal events</h2>',
'<p>Dates, charges and room blocks for weddings and other events are confirmed in writing by our events team after your enquiry.</p>',
'<h2>Questions</h2>',
'<p>Write to <a href="mailto:reservations@queensinn.co.in">reservations@queensinn.co.in</a> or call +91 91593 99988 or +91 91594 99988.</p>')
WHERE `Slug` = 'terms-conditions';

UPDATE `PolicyPages` SET `Title` = 'Cancellation & refund', `BodyHtml` = CONCAT(
'<h2>Standard cancellations</h2>',
'<p>You can cancel free of charge up to 48 hours before your arrival.</p>',
'<h2>Annual Feast (29 August to 8 September)</h2>',
'<p>Stays during the annual Feast carry special cancellation conditions because rooms are in very high demand. Ask our reservations desk for the conditions when you enquire; they are confirmed to you in writing with your reservation.</p>',
'<h2>How to cancel</h2>',
'<p>Call or WhatsApp +91 91593 99988, or write to <a href="mailto:reservations@queensinn.co.in">reservations@queensinn.co.in</a>, with the name on the reservation and your arrival date. We acknowledge every cancellation.</p>',
'<h2>Refunds</h2>',
'<p>Where a refund is due, it is returned to the payment method you used, and we tell you the timeline when we acknowledge your cancellation.</p>',
'<h2>KVR Mahal events</h2>',
'<p>Cancellation terms for weddings and other events are agreed in writing when the date is booked.</p>')
WHERE `Slug` = 'cancellation-policy';

UPDATE `PolicyPages` SET `Title` = 'Privacy policy', `BodyHtml` = CONCAT(
'<h2>What we collect</h2>',
'<p>When you send an enquiry we collect your name, phone number, email (if you give one), your dates, number of guests, room or event type, and any message you write. We also keep the internet address the enquiry came from, to guard against spam.</p>',
'<p>When you stay with us, we record guest identification at check-in as required for guest registration.</p>',
'<h2>How we use it</h2>',
'<p>We use your details to reply to you, confirm availability and plan your stay or event. We do not sell your information, and we share it only when the law requires.</p>',
'<h2>Payments</h2>',
'<p>This website does not take payments and does not collect card or bank details.</p>',
'<h2>How long we keep it</h2>',
'<p>We keep enquiries for as long as we need them to deal with your request and to meet our legal duties.</p>',
'<h2>Your choices</h2>',
'<p>To see, correct or delete the details you sent us, write to <a href="mailto:reservations@queensinn.co.in">reservations@queensinn.co.in</a>.</p>')
WHERE `Slug` = 'privacy-policy';

INSERT INTO `__schema_migrations` (`script_name`)
SELECT '017_content_pass.sql'
WHERE NOT EXISTS (SELECT 1 FROM `__schema_migrations` WHERE `script_name` = '017_content_pass.sql');
