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

export interface HeroSlide {
  id: number;
  kicker: string | null;
  headline: string | null;
  subHeadline: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
  image: MediaItem | null;
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

export interface PublicContent {
  hero: HeroSlide[];
  rooms: Room[];
  gallery: MediaItem[];
  attractions: Attraction[];
  testimonials: Testimonial[];
  /** Named photo positions (e.g. 'restaurant'); a missing key means no photo yet. */
  slots: Record<string, MediaItem>;
}

export const EMPTY_CONTENT: PublicContent = { hero: [], rooms: [], gallery: [], attractions: [], testimonials: [], slots: {} };
