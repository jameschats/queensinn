import { Theme } from './site.model';

export interface FontOption {
  name: string;
  kind: 'serif' | 'sans';
  /** Weights Google Fonts serves for this family (limited to 300–700, the range the admin offers). */
  weights: number[];
  /** Has a real italic face (the kicker style is italic). */
  italic?: boolean;
}

/** Everything selectable under "Choose your own". Kept to families with reliable Latin support. */
export const FONT_CATALOGUE: FontOption[] = [
  // Serif — headings
  { name: 'Cormorant Garamond', kind: 'serif', weights: [300, 400, 500, 600, 700], italic: true },
  { name: 'Playfair Display', kind: 'serif', weights: [400, 500, 600, 700], italic: true },
  { name: 'Lora', kind: 'serif', weights: [400, 500, 600, 700], italic: true },
  { name: 'EB Garamond', kind: 'serif', weights: [400, 500, 600, 700], italic: true },
  { name: 'Libre Baskerville', kind: 'serif', weights: [400, 700], italic: true },
  { name: 'Merriweather', kind: 'serif', weights: [300, 400, 700], italic: true },
  { name: 'Crimson Pro', kind: 'serif', weights: [300, 400, 500, 600, 700], italic: true },
  { name: 'Source Serif 4', kind: 'serif', weights: [300, 400, 500, 600, 700], italic: true },
  { name: 'Fraunces', kind: 'serif', weights: [300, 400, 500, 600, 700], italic: true },
  { name: 'Bodoni Moda', kind: 'serif', weights: [400, 500, 600, 700], italic: true },
  { name: 'DM Serif Display', kind: 'serif', weights: [400], italic: true },
  { name: 'Marcellus', kind: 'serif', weights: [400] },
  { name: 'Prata', kind: 'serif', weights: [400] },
  { name: 'Cinzel', kind: 'serif', weights: [400, 500, 600, 700] },
  // Sans — body (also usable for headings)
  { name: 'Jost', kind: 'sans', weights: [300, 400, 500, 600, 700] },
  { name: 'Inter', kind: 'sans', weights: [300, 400, 500, 600, 700] },
  { name: 'DM Sans', kind: 'sans', weights: [300, 400, 500, 600, 700] },
  { name: 'Montserrat', kind: 'sans', weights: [300, 400, 500, 600, 700] },
  { name: 'Poppins', kind: 'sans', weights: [300, 400, 500, 600, 700] },
  { name: 'Open Sans', kind: 'sans', weights: [300, 400, 500, 600, 700] },
  { name: 'Nunito Sans', kind: 'sans', weights: [300, 400, 500, 600, 700] },
  { name: 'Manrope', kind: 'sans', weights: [300, 400, 500, 600, 700] },
  { name: 'Mulish', kind: 'sans', weights: [300, 400, 500, 600, 700] },
  { name: 'Work Sans', kind: 'sans', weights: [300, 400, 500, 600, 700] },
  { name: 'Raleway', kind: 'sans', weights: [300, 400, 500, 600, 700] },
  { name: 'Source Sans 3', kind: 'sans', weights: [300, 400, 500, 600, 700] },
  { name: 'Figtree', kind: 'sans', weights: [300, 400, 500, 600, 700] },
  { name: 'Outfit', kind: 'sans', weights: [300, 400, 500, 600, 700] },
  { name: 'Lato', kind: 'sans', weights: [300, 400, 700] },
  { name: 'Roboto', kind: 'sans', weights: [300, 400, 500, 700] },
];

export interface FontPairing {
  name: string;
  note: string;
  headingFont: string;
  bodyFont: string;
  headingWeight: number;
  bodyWeight: number;
}

/** Curated pairings. All use regular-weight body text; the old look was light (300) and read as thin. */
export const FONT_PAIRINGS: FontPairing[] = [
  { name: 'Classic Luxe', note: 'Delicate serif, clean sans', headingFont: 'Cormorant Garamond', bodyFont: 'Jost', headingWeight: 500, bodyWeight: 400 },
  { name: 'Grand Heritage', note: 'High-contrast serif, friendly sans', headingFont: 'Playfair Display', bodyFont: 'Lato', headingWeight: 500, bodyWeight: 400 },
  { name: 'Warm Hospitality', note: 'Soft, bookish and welcoming', headingFont: 'Lora', bodyFont: 'Nunito Sans', headingWeight: 500, bodyWeight: 400 },
  { name: 'Modern Elegance', note: 'Roman-capitals feel, modern sans', headingFont: 'Marcellus', bodyFont: 'Manrope', headingWeight: 400, bodyWeight: 400 },
  { name: 'Refined Editorial', note: 'Old-style serif, neutral sans', headingFont: 'EB Garamond', bodyFont: 'Inter', headingWeight: 500, bodyWeight: 400 },
  { name: 'Bold Statement', note: 'Strong display serif, easy sans', headingFont: 'DM Serif Display', bodyFont: 'DM Sans', headingWeight: 400, bodyWeight: 400 },
  { name: 'Clean Contemporary', note: 'All sans, very readable', headingFont: 'Montserrat', bodyFont: 'Open Sans', headingWeight: 500, bodyWeight: 400 },
  { name: 'Temple Roman', note: 'Inscriptional capitals, calm body', headingFont: 'Cinzel', bodyFont: 'Mulish', headingWeight: 500, bodyWeight: 400 },
];

export const HEADING_WEIGHTS = [
  { value: 400, label: 'Regular' },
  { value: 500, label: 'Medium' },
  { value: 600, label: 'Semi-bold' },
  { value: 700, label: 'Bold' },
];
export const BODY_WEIGHTS = [
  { value: 300, label: 'Light' },
  { value: 400, label: 'Regular' },
  { value: 500, label: 'Medium' },
  { value: 600, label: 'Semi-bold' },
];
export const TEXT_SIZES = [
  { value: 15, label: 'Small' },
  { value: 17, label: 'Default' },
  { value: 18, label: 'Large' },
  { value: 20, label: 'Extra large' },
];

export type Typography = Pick<Theme, 'headingFont' | 'bodyFont' | 'headingWeight' | 'bodyWeight' | 'baseSize'>;

export function findFont(name: string): FontOption | undefined {
  return FONT_CATALOGUE.find((f) => f.name === name);
}

/** CSS font stack with a same-kind fallback, so text never drops to a mismatched face while loading. */
/** Fonts shipped with the site itself (see the @font-face rules in styles.css); every other font is loaded from Google. */
export const BUNDLED_FONTS: readonly string[] = ['Lora', 'Nunito Sans'];

export function fontStack(name: string): string {
  const kind = findFont(name)?.kind ?? 'sans';
  const fallback = kind === 'serif' ? 'Georgia, "Times New Roman", serif' : '"Helvetica Neue", Arial, sans-serif';
  return `"${name}", ${fallback}`;
}

function familyParam(name: string, role: 'heading' | 'body'): string {
  const f = findFont(name);
  const q = name.trim().replace(/\s+/g, '+');
  if (!f || (f.weights.length === 1 && !f.italic)) return `family=${q}`;
  if (role === 'heading' && f.italic) {
    const tuples = [...f.weights.map((w) => `0,${w}`), `1,${f.weights.includes(400) ? 400 : f.weights[0]}`];
    return `family=${q}:ital,wght@${tuples.join(';')}`;
  }
  return `family=${q}:wght@${f.weights.join(';')}`;
}

/** One Google Fonts stylesheet URL for the given families (heading-style families also get an italic). */
export function googleFontsUrl(families: { name: string; role: 'heading' | 'body' }[]): string {
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const f of families) {
    if (seen.has(f.name)) continue;
    seen.add(f.name);
    parts.push(familyParam(f.name, f.role));
  }
  return `https://fonts.googleapis.com/css2?${parts.join('&')}&display=swap`;
}
