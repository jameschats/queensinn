/** An uploaded image. `variants` maps pixel width to a WebP URL (keys arrive as strings). */
export interface MediaItem {
  id: number;
  kind: string;
  fileName: string;
  url: string;
  variants: Record<string, string>;
  placeholder: string | null;
  width: number | null;
  height: number | null;
  sizeBytes: number;
  altText: string | null;
  caption: string | null;
  category: string | null;
  createdAt: string;
}

export interface Room {
  id: number;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  sizeSqFt: number | null;
  bedType: string | null;
  viewType: string | null;
  maxGuests: number;
  startingTariff: number | null;
  taxNote: string | null;
  image: MediaItem | null;
  images: MediaItem[];
  amenities: string[];
}

/** A card in the sliding strip on the home page. */
export interface StripItem {
  id: number;
  title: string | null;
  caption: string | null;
  linkUrl: string | null;
  image: MediaItem;
}

export interface Attraction {
  id: number;
  name: string;
  distanceKm: number;
  description: string | null;
  image: MediaItem | null;
}

export interface Testimonial {
  quote: string;
  guestName: string;
  origin: string | null;
}

/** One page's editable content. A field missing from `sections` means "use the built-in wording". */
export interface PageContent {
  title: string;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImage: MediaItem | null;
  sections: Record<string, Record<string, string>>;
  heroPhotos: MediaItem[];
  heroVideo: MediaItem | null;
}

export interface PublicContent {
  rooms: Room[];
  gallery: MediaItem[];
  strip: StripItem[];
  /** The KVR Mahal page's own photo strip. */
  mahalStrip: StripItem[];
  attractions: Attraction[];
  testimonials: Testimonial[];
  /** Named photo positions (e.g. 'restaurant'); a missing key means no photo yet. */
  slots: Record<string, MediaItem>;
  /** Keyed by page slug; the front page is 'home'. */
  pages: Record<string, PageContent>;
}

export const EMPTY_CONTENT: PublicContent = { rooms: [], gallery: [], strip: [], mahalStrip: [], attractions: [], testimonials: [], slots: {}, pages: {} };
