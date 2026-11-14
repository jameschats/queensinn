/**
 * Everything an admin can edit on each page: text fields (with the current wording as the default),
 * photo positions, and whether the page has a hero. The page editor builds its forms from this, and
 * the public pages fall back to these defaults, so an empty field always shows sensible text.
 * Adding a field here makes it editable; nothing else needs changing on the server.
 */
export type FieldType = 'text' | 'textarea' | 'url' | 'select';

export interface FieldDef {
  key: string;
  label: string;
  type?: FieldType;
  default: string;
  hint?: string;
  rows?: number;
  /** For type 'select': the choices; `default` is one of the values. */
  options?: { value: string; label: string }[];
}

export interface SectionDef {
  key: string;
  title: string;
  hint?: string;
  fields: FieldDef[];
}

export interface SlotDef {
  key: string;
  label: string;
  hint?: string;
}

export interface PageDef {
  /** API slug ("home" is the front page). */
  slug: string;
  label: string;
  path: string;
  /** Pages with a photo / video hero show the Hero tab's media controls. */
  hero: 'media' | 'text' | 'none';
  sections: SectionDef[];
  slots: SlotDef[];
  seoDefaults: { title: string; description: string };
}

const t = (key: string, label: string, def: string, extra: Partial<FieldDef> = {}): FieldDef => ({ key, label, default: def, ...extra });
const area = (key: string, label: string, def: string, rows = 4, extra: Partial<FieldDef> = {}): FieldDef =>
  ({ key, label, default: def, type: 'textarea', rows, ...extra });

/** How much the hero photo is darkened so white text stays readable: one even tint, never a gradient. */
export const HERO_SHADES: Record<string, number> = { none: 0, light: 25, medium: 40, strong: 55 };
export const heroShadePercent = (value: string): number => HERO_SHADES[value] ?? HERO_SHADES['light'];

/** The hero's wording, shared by every page. */
const heroSection = (kicker: string, headline: string, lede: string, withButtons: boolean, buttons?: [string, string, string, string], shade = 'medium'): SectionDef => ({
  key: 'hero',
  title: 'Hero text',
  hint: 'The large heading at the top of the page.',
  fields: [
    t('kicker', 'Small line above the heading', kicker),
    t('headline', 'Heading', headline),
    area('lede', 'Description under the heading', lede, 3),
    {
      key: 'shade', label: 'Darken the photo', type: 'select', default: shade,
      options: [{ value: 'none', label: 'Not at all' }, { value: 'light', label: 'A little' }, { value: 'medium', label: 'Medium' }, { value: 'strong', label: 'A lot' }],
      hint: 'Makes white text easier to read over a bright photo. An even tint, not a gradient.',
    },
    ...(withButtons && buttons
      ? [
          t('cta1Text', 'First button — text', buttons[0]),
          t('cta1Url', 'First button — goes to', buttons[1], { type: 'url', hint: 'A page like /bookroom, a section like /bookroom#reserve, a full web address, or the word reserve to do whatever the Reserve button does (set in Site settings).' }),
          t('cta2Text', 'Second button — text', buttons[2]),
          t('cta2Url', 'Second button — goes to', buttons[3], { type: 'url' }),
        ]
      : []),
  ],
});

export const HOME_AMENITY_ICONS = ['bell', 'snow', 'bolt', 'wifi', 'car', 'tray', 'people', 'leaf', 'bed', 'shield'];

export const PAGES: PageDef[] = [
  {
    slug: 'home',
    label: 'Home',
    path: '/',
    hero: 'media',
    seoDefaults: {
      title: "Hotel Queen's Inn, Velankanni | Luxury Hotel & KVR Mahal",
      description: 'A three-acre luxury hotel on ECR Main Road, 10 minutes by road from the Velankanni Basilica. 51 AC rooms, multi-cuisine dining and KVR Mahal for weddings.',
    },
    sections: [
      heroSection(
        '',
        'Tranquility meets luxury in the sacred heart of Velankanni',
        'A serene three-acre sanctuary on ECR Main Road, ten minutes by road from the Shrine Basilica. Fifty-one air-conditioned rooms, multi-cuisine dining and the grand KVR Mahal.',
        true,
        ['Request tariff', 'reserve', 'Discover KVR Mahal', '/kvr-mahal'],
      ),
      {
        key: 'welcome',
        title: 'Welcome',
        hint: 'The first section below the hero.',
        fields: [
          t('kicker', 'Small line', "Welcome to Queen's Inn"),
          t('title', 'Heading', 'Ten minutes by road from the Basilica. A world away from the crowd.'),
          area('lede', 'Lead paragraph', 'Three gated acres of garden on ECR Main Road, ten minutes by road from the Shrine of Our Lady of Good Health.', 3),
          area('body', 'Paragraph', "Pilgrims, families and wedding parties return for the quiet: deep lawns and a swimming pool, silent central cooling, food made with care, and a team that has looked after Velankanni's visitors since 2017."),
          t('linkText', 'Link text', 'Read our story'),
        ],
      },
      {
        key: 'stats',
        title: 'Key figures',
        hint: 'Four numbers shown under the welcome text.',
        fields: [
          t('n1', 'Figure 1', '3'), t('t1', 'Figure 1 — label', 'acres of gated gardens and lawns'),
          t('n2', 'Figure 2', '51'), t('t2', 'Figure 2 — label', 'air-conditioned rooms in four categories'),
          t('n3', 'Figure 3', '10 min'), t('t3', 'Figure 3 — label', 'by road to the Shrine Basilica'),
          t('n4', 'Figure 4', '24 h'), t('t4', 'Figure 4 — label', 'reception and in-room dining'),
        ],
      },
      {
        key: 'rooms',
        title: 'Rooms introduction',
        hint: 'The room names, prices and descriptions themselves are managed under Rooms.',
        fields: [
          t('kicker', 'Small line', 'Rooms & suites'),
          t('title', 'Heading', 'Rest, well considered'),
          area('intro', 'Introduction', 'Four room categories, each with air conditioning, Wi-Fi and 24-hour service. Tariffs shown are starting rates per night.', 3),
        ],
      },
      {
        key: 'dining',
        title: 'Restaurant',
        fields: [
          t('kicker', 'Small line', 'Q Multi-Cuisine Restaurant'),
          t('title', 'Heading', 'From temple-town breakfasts to coastal suppers'),
          area('body', 'Description', 'South Indian and Chettinad classics, North Indian and Continental plates, and seafood from the Nagapattinam coast. Vegetarian and non-vegetarian dishes are prepared in separate kitchens.'),
          area('hours', 'Serving times', 'Breakfast buffet | 7:00 – 10:30\nLunch | 12:30 – 15:30\nDinner | 19:30 – 22:30\nIn-room dining | 24 hours', 5,
            { hint: 'One per line, written as: Meal | Time. Put a | between the two parts.' }),
        ],
      },
      {
        key: 'mahal',
        title: 'KVR Mahal feature',
        fields: [
          t('kicker', 'Small line', 'On the same campus'),
          t('name', 'Large name', 'KVR Mahal'),
          t('tagline', 'Tagline', 'Where sacred vows meet timeless hospitality.'),
          area('body', 'Description', "Velankanni's grandest fully air-conditioned mandapam, with a 300-seat dining pavilion and every guest room a short garden walk away. Your families arrive, celebrate and rest without leaving the gates."),
          t('n1', 'Figure 1', '1,000'), t('t1', 'Figure 1 — label', 'guests in the ceremonial hall'),
          t('n2', 'Figure 2', '300+'), t('t2', 'Figure 2 — label', 'seats in the dining pavilion'),
          t('cta1Text', 'First button', 'Discover KVR Mahal'),
          t('cta2Text', 'Second button', 'Plan your event'),
        ],
      },
      {
        key: 'strip',
        title: 'Sliding photo strip',
        hint: 'The scrolling row of photos above the facilities. Choose its photos, titles and links under Galleries.',
        fields: [
          t('kicker', 'Small line', 'Around the hotel'),
          t('title', 'Heading', 'A glimpse of your stay'),
          {
            key: 'speed', label: 'Scroll speed', type: 'select', default: 'medium',
            options: [{ value: 'slow', label: 'Slow' }, { value: 'medium', label: 'Medium' }, { value: 'fast', label: 'Fast' }],
            hint: 'How quickly the row slides on computers. It pauses while the mouse is over it.',
          },
          t('moreText', 'Phone button', 'Show all photos', { hint: 'On phones the photos are listed one under another; this button reveals the rest.' }),
        ],
      },
      {
        key: 'amenities',
        title: 'Facilities',
        fields: [
          t('kicker', 'Small line', 'Within the gates'),
          t('title', 'Heading', 'Everything close at hand'),
          area('items', 'Facilities list',
            [
              '24-hour reception | Concierge help with darshan timings and travel',
              'Silent central cooling | Quiet air conditioning across the campus',
              'Full power backup | Silent generators for rooms and halls',
              'Wi-Fi throughout | Rooms, lobby and restaurant',
              'Secure parking | 100+ cars and tour buses inside the gates',
              'In-room dining | Served around the clock',
              'Meeting hall | For family gatherings and business groups',
              'Pool & garden lawns | A swimming pool, landscaped lawns and a children’s play area',
              'Driver quarters | Rest rooms, washrooms and meals for drivers',
              'Gated & guarded | CCTV and round-the-clock security',
            ].join('\n'),
            10, { hint: 'One per line, written as: Title | Short description. The icons are fixed by position.' }),
        ],
      },
      {
        key: 'experiences',
        title: 'Experiences',
        hint: 'The three places shown come from the Experiences page.',
        fields: [
          t('kicker', 'Small line', 'Around Velankanni'),
          t('title', 'Heading', 'Pilgrim trails and coastal days'),
          t('linkText', 'Link text', 'All experiences'),
        ],
      },
      {
        key: 'gallery',
        title: 'Gallery',
        fields: [t('kicker', 'Small line', 'Gallery'), t('title', 'Heading', 'A look inside')],
      },
      {
        key: 'enquiry',
        title: 'Enquiry',
        fields: [
          t('kicker', 'Small line', 'Room enquiry'),
          t('title', 'Heading', "Tell us when you're coming"),
          area('intro', 'Introduction', 'Share your dates and our reservations desk will confirm availability and the best tariff, usually within two hours.', 3),
          area('lede', 'Note under the form', 'Prefer to talk? The fastest way to reach us is WhatsApp or a call.', 3),
          t('whatsappText', 'WhatsApp button', 'WhatsApp us'),
        ],
      },
    ],
    slots: [
      { key: 'intro-main', label: 'Welcome — large photo', hint: 'Shown in an arched frame. A tall photo works best.' },
      { key: 'intro-accent', label: 'Welcome — small photo' },
      { key: 'restaurant', label: 'Restaurant — wide photo', hint: 'Full-width image above the restaurant text.' },
      { key: 'dish-1', label: 'Restaurant — photo 1' },
      { key: 'dish-2', label: 'Restaurant — photo 2' },
      { key: 'dish-3', label: 'Restaurant — photo 3' },
      { key: 'mahal-feature', label: 'KVR Mahal — arched photo', hint: 'Shows themed artwork until you add a photo.' },
    ],
  },
  {
    slug: 'bookroom',
    label: 'Stay (Rooms & suites)',
    path: '/bookroom',
    hero: 'media',
    seoDefaults: {
      title: "Rooms & Tariffs | Hotel Queen's Inn, Velankanni",
      description: "Deluxe, Executive Triple, Family and Queen's Suite rooms near the Velankanni Basilica. Send a reservation enquiry or WhatsApp the front desk.",
    },
    sections: [
      heroSection('Stay with us', 'Rooms & suites', 'Fifty-one air-conditioned rooms in four categories, set around three acres of garden.', false),
      {
        key: 'enquiry',
        title: 'Reservation form',
        fields: [
          t('kicker', 'Small line', 'Reserve your stay'),
          t('title', 'Heading', 'Request a reservation'),
          area('intro', 'Introduction', "We don't take bookings or payments online. Send your dates and the desk will confirm by phone or WhatsApp.", 3),
        ],
      },
      {
        key: 'know',
        title: 'Good to know',
        hint: 'Check-in and check-out times come from Site settings: write {checkin} and {checkout} where the times belong.',
        fields: [
          t('kicker', 'Small line', 'Before you arrive'),
          t('title', 'Heading', 'Good to know'),
          t('linkText', 'Link to the policies', 'Full policies'),
          area('items', 'Points',
            'Check-in from {checkin} | Early check-in on request, subject to availability.\nCheck-out by {checkout} | Late check-out can be arranged at the desk.\nPhoto ID | Government-issued ID required for every adult guest.\nFree cancellation | Up to 48 hours before arrival. Feast-period rules differ.',
            6, { hint: 'One per line, written as: Heading | Text.' }),
        ],
      },
    ],
    slots: [],
  },
  {
    slug: 'kvr-mahal',
    label: 'KVR Mahal',
    path: '/kvr-mahal',
    hero: 'media',
    seoDefaults: {
      title: 'KVR Mahal | Wedding & Reception Hall in Velankanni',
      description: "Velankanni's grandest air-conditioned mandapam for 500–1,000 guests, with a 300-seat dining pavilion and 51 hotel rooms on one campus.",
    },
    sections: [
      heroSection('KVR Mahal', 'Where sacred vows meet timeless hospitality', "Velankanni's grandest air-conditioned ceremonial mandapam, with a dining pavilion and luxury rooms on the same gated campus.", false),
      {
        key: 'stats',
        title: 'Key figures',
        hint: 'The four numbers in the dark band under the hero. Leave a pair empty to hide it.',
        fields: [
          t('n1', 'Figure 1', '1,000'), t('t1', 'Figure 1 — label', 'guests in the ceremonial hall, from 500'),
          t('n2', 'Figure 2', '300+'), t('t2', 'Figure 2 — label', 'seats in the dining pavilion'),
          t('n3', 'Figure 3', '100%'), t('t3', 'Figure 3 — label', 'central air conditioning with silent backup'),
          t('n4', 'Figure 4', '100+'), t('t4', 'Figure 4 — label', 'cars and tour buses parked inside the gates'),
        ],
      },
      {
        key: 'hall',
        title: 'The ceremonial hall',
        fields: [
          t('kicker', 'Small line', 'The Grand Ceremonial Hall'),
          t('title', 'Heading', 'A stage worthy of the vow'),
          area('lede', 'Lead paragraph', 'High ceilings, crystal chandeliers and wide, pillarless sightlines, so every guest sees the muhurtham.', 3),
          area('items', 'Highlights', 'Elevated main stage with a customisable backdrop\nAcoustically tuned hall with balanced PA distribution\nHigh-capacity central AC with silent generator backup', 4,
            { hint: 'One per line. The icons are fixed by position.' }),
        ],
      },
      {
        key: 'dining',
        title: 'The dining pavilion',
        fields: [
          t('kicker', 'Small line', 'Bhojana Saalai'),
          t('title', 'Heading', 'A feast for three hundred at once'),
          area('lede', 'Lead paragraph', 'Organised banquet rows for traditional banana-leaf service, served from our own commercial kitchen.', 3),
          area('items', 'Highlights', 'Dedicated kitchen with high-pressure burners\nSeparate service flow, so the hall never crowds\nBuilt-in RO water plant and multi-basin wash bays', 4,
            { hint: 'One per line. The icons are fixed by position.' }),
        ],
      },
      {
        key: 'gallery',
        title: 'Photo strip',
        hint: 'The scrolling row of photos between the dining pavilion and the comparison table. Choose its photos under Galleries → KVR Mahal strip.',
        fields: [
          t('kicker', 'Small line', 'Inside KVR Mahal'),
          t('title', 'Heading', 'A look around the hall'),
          t('moreText', 'Phone button', 'Show all photos', { hint: 'On phones the photos are listed one under another; this button reveals the rest.' }),
        ],
      },
      {
        key: 'compare',
        title: 'Why one campus',
        fields: [
          t('kicker', 'Small line', 'Stay & celebrate'),
          t('title', 'Heading', 'Why one campus changes everything'),
          area('intro', 'Introduction', 'Outstation weddings usually scatter families across lodges. At KVR Mahal they stay together.', 3),
          t('colOther', 'Left column title', 'A typical standalone mandapam'),
          t('colUs', 'Right column title', "KVR Mahal with Queen's Inn"),
          area('rows', 'Rows',
            'Guest stays | Guests spread across outside lodges | 51 air-conditioned rooms on the same 3-acre campus\nBridal comfort | Small, basic dressing rooms | Two private AC green rooms with attached vanity suites\nParking | Street congestion and narrow access roads | Enclosed parking for 100+ cars and tour buses\nDrivers | No facilities for tour drivers | Rest quarters, washrooms and meals for drivers',
            7, { hint: 'One per line, written as: Topic | Typical mandapam | KVR Mahal.' }),
        ],
      },
      {
        key: 'enquiry',
        title: 'Event enquiry form',
        fields: [
          t('kicker', 'Small line', 'Plan your event'),
          t('title', 'Heading', 'Check a date for your celebration'),
          area('intro', 'Introduction', 'Tell us about the occasion. Our events team will share availability, a quotation and room blocks for your guests.', 3),
        ],
      },
    ],
    slots: [
      { key: 'mahal-hall', label: 'Ceremonial hall photo', hint: 'Shown in an arched frame; a tall photo works best. Themed artwork shows until you add one.' },
      { key: 'mahal-dining', label: 'Dining pavilion photo', hint: 'A wide photo works best.' },
    ],
  },
  {
    slug: 'about-us',
    label: 'Our story',
    path: '/about-us',
    hero: 'media',
    seoDefaults: {
      title: "About Us | Hotel Queen's Inn, Velankanni",
      description: 'Welcoming pilgrims, families and celebrations to Velankanni since 2017, on ECR Main Road near the Shrine Basilica.',
    },
    sections: [
      heroSection('Our story', 'A quiet house near a sacred shore', 'Welcoming pilgrims, families and celebrations to Velankanni since October 2017.', false),
      {
        key: 'story',
        title: 'The story',
        fields: [
          t('title', 'Heading', 'Built for the people who come to pray, and the families who come with them'),
          area('lede', 'Lead paragraph', "Queen's Inn opened in October 2017 on East Coast Road, ten minutes by road from the Shrine Basilica.", 3),
          area('body', 'The rest of the story',
            "We set out to give Velankanni a hotel that matched the importance of the journey: rooms that are calm and spotless, food that is honest, and a campus large enough that it never feels crowded, even during the Feast.\n\nToday the three-acre campus holds 51 rooms, the Q Multi-Cuisine Restaurant, garden lawns and KVR Mahal, our ceremonial hall for weddings and community celebrations.",
            8, { hint: 'Leave a blank line between paragraphs.' }),
        ],
      },
      {
        key: 'standards',
        title: 'Our standards',
        fields: [
          t('kicker', 'Small line', 'Our standards'),
          t('title', 'Heading', 'What you can count on'),
          area('items', 'Three points',
            'Safety first | Gated campus, CCTV, trained night security and verified guest registration.\nSilent comfort | Central cooling and silent generators, so rest is never interrupted.\nHygiene | Daily housekeeping, RO drinking water and separate veg and non-veg kitchens.',
            5, { hint: 'One per line, written as: Heading | Text. The icons are fixed by position.' }),
        ],
      },
      {
        key: 'location',
        title: 'Location',
        fields: [
          t('kicker', 'Small line', 'Location'),
          t('title', 'Heading', 'On East Coast Road, near the Shrine'),
          area('body', 'Text', 'The hotel stands on East Coast Road at Arch West Street, ten minutes by road from the Basilica and the holy tank, with Nagore, Thirunallar, Point Calimere, Muthupet and Tranquebar all reachable as day trips.', 4),
          t('buttonText', 'Button', 'Explore the region'),
        ],
      },
    ],
    slots: [{ key: 'lawn', label: 'Garden photo', hint: 'Shown beside the story. A tall photo works best.' }],
  },
  {
    slug: 'activities',
    label: 'Experiences',
    path: '/activities',
    hero: 'media',
    seoDefaults: {
      title: "Things to Do Near Velankanni | Hotel Queen's Inn",
      description: 'Velankanni Basilica, Nagore Dargah, Thirunallar, Point Calimere, Muthupet mangroves and Tranquebar, with distances from the hotel.',
    },
    sections: [
      heroSection('Experiences', 'Pilgrim trails and coastal days', 'A gentle base for the sacred sites and wild coast of the Cauvery delta.', false),
      {
        key: 'desk',
        title: 'Travel desk',
        hint: 'The places themselves (names, distances, photos) are under Experiences in the main menu.',
        fields: [
          t('kicker', 'Small line', 'Travel desk'),
          t('title', 'Heading', 'Let us plan the day'),
          area('body', 'Text', "Our front desk arranges cars and drivers, temple timings and boat trips at Muthupet. Tell us what you'd like to see.", 4),
          t('buttonText', 'Button', 'Plan on WhatsApp'),
          t('message', 'WhatsApp message', "Hello, I would like help planning a day trip from Queen's Inn.", { hint: 'What the guest’s WhatsApp is typed with when they tap the button.' }),
        ],
      },
    ],
    slots: [{ key: 'travel-desk', label: 'Travel desk photo', hint: 'Shown beside the travel desk text. Themed artwork shows until you add one.' }],
  },
  {
    slug: 'contact',
    label: 'Contact',
    path: '/contact',
    hero: 'media',
    seoDefaults: {
      title: "Contact | Hotel Queen's Inn, Velankanni",
      description: "Call, WhatsApp or email Hotel Queen's Inn, ECR Main Road, Velankanni 611 111.",
    },
    sections: [
      heroSection('Contact', "We're a call away", 'Our front desk is open round the clock. Call, message or write to us.', false, undefined, 'medium'),
      {
        key: 'details',
        title: 'Contact details',
        hint: 'Phone numbers, emails and the address come from Site settings.',
        fields: [t('title', 'Heading', 'Speak to the front desk')],
      },
      {
        key: 'reach',
        title: 'Quick-contact box',
        hint: 'The box beside the contact details. Phone numbers, emails and the address come from Site settings.',
        fields: [
          t('title', 'Heading', 'The quickest way to reach us'),
          area('body', 'Text', 'Call or WhatsApp the front desk and we will reply straight away.', 3),
        ],
      },
      {
        key: 'hours',
        title: 'Hours',
        hint: 'Check-in and check-out times are added automatically from Site settings.',
        fields: [
          t('title', 'Heading', 'Good to know'),
          area('rows', 'Lines', 'Reception | Open 24 hours\nIn-room dining | 24 hours', 4, { hint: 'One per line, written as: Label | Value.' }),
        ],
      },
      {
        key: 'message',
        title: 'Message form',
        fields: [
          t('title', 'Heading', 'Send us a message'),
          area('intro', 'Introduction', 'Write to us and our team will reply by phone or email, usually within a day.', 3),
        ],
      },
      {
        key: 'visit',
        title: 'Visiting us',
        fields: [
          t('title', 'Heading', 'Find us on ECR Main Road'),
          area('body', 'Directions', 'We are ten minutes by road from the Shrine Basilica of Our Lady of Good Health. Parking for cars and tour buses is inside the gates.', 3),
        ],
      },
    ],
    slots: [],
  },
];

export const POLICY_SLUGS = ['terms-conditions', 'cancellation-policy', 'privacy-policy'];

const byPage = new Map(PAGES.map((p) => [p.slug, p]));

export function pageDef(slug: string): PageDef | undefined {
  return byPage.get(slug);
}

/** The built-in wording for a field; '' if the page, section or field is unknown. */
export function defaultText(page: string, section: string, field: string): string {
  return byPage.get(page)?.sections.find((s) => s.key === section)?.fields.find((f) => f.key === field)?.default ?? '';
}
