export interface Theme {
  primary: string;
  accent: string;
  surface: string;
}

export interface SiteData {
  settings: Record<string, string | null>;
  theme: Theme;
}

export const DEFAULT_THEME: Theme = { primary: '#0F243E', accent: '#C5A880', surface: '#FBFBF9' };

/** Used until /api/site answers, and if it never does, so the site still renders. */
export const DEFAULT_SETTINGS: Record<string, string> = {
  HotelName: "Queen's Inn",
  LocationLine: 'Velankanni',
  Phone1: '+91 91593 99988',
  Phone2: '+91 91594 99988',
  WhatsAppNumber: '919159399988',
  WhatsAppMessage: "Hello Queen's Inn, I'd like to enquire about a stay.",
  ReservationsEmail: 'reservations@queensinn.co.in',
  SalesEmail: 'sales@queensinn.co.in',
  Address: '# 41/A, ECR Main Road, Arch West Street, Velankanni 611 111, Tamil Nadu',
  MapUrl: 'https://maps.google.com/?q=Hotel+Queens+Inn+Velankanni',
  CheckInTime: '12:00 PM',
  CheckOutTime: '11:00 AM',
};

export const THEME_PRESETS: (Theme & { name: string })[] = [
  { name: 'Royal Navy & Gold', primary: '#0F243E', accent: '#C5A880', surface: '#FBFBF9' },
  { name: 'Emerald & Brass', primary: '#12352B', accent: '#C2A46B', surface: '#FAF9F5' },
  { name: 'Burgundy & Champagne', primary: '#3E1220', accent: '#D4B98C', surface: '#FCFAF7' },
  { name: 'Charcoal & Rose Gold', primary: '#24262B', accent: '#C9A08A', surface: '#FAF8F7' },
];

/** WCAG 2.1 contrast ratio. Mirrors SiteService.Contrast on the API. */
export function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const c = hex.replace('#', '').match(/../g)!.map((x) => {
      const v = parseInt(x, 16) / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

export const isHex = (v: string) => /^#[0-9a-f]{6}$/i.test(v);
