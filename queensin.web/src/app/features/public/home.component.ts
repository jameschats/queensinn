import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, afterNextRender, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { absUrl } from '../../core/api.config';
import { HOME_AMENITY_ICONS, heroShadePercent } from '../../core/content/page-schemas';
import { MediaItem } from '../../core/models/content.model';
import { ContentService } from '../../core/services/content.service';
import { SeoService } from '../../core/services/seo.service';
import { SITE_URL } from '../../core/api.config';
import { SiteService } from '../../core/services/site.service';
import { IconComponent } from '../../shared/icon.component';
import { EnquiryFormComponent } from '../../shared/enquiry-form.component';
import { ImageComponent } from '../../shared/image.component';
import { ParsedLink, parseLink } from '../../shared/link';
import { PageHeroComponent } from '../../shared/page-hero.component';
import { ReserveLinkDirective } from '../../shared/reserve-link.directive';
import { ShowcaseStripComponent } from '../../shared/showcase-strip.component';

/** Photo shapes for the masonry gallery, cycled so the columns stay lively. */
const GALLERY_SHAPES = ['aspect-[3/4]', 'aspect-[4/3]', 'aspect-[2/3]', 'aspect-[4/3]', 'aspect-square', 'aspect-[3/4]'];
const ATTRACTION_ART = ['basilica', 'minaret', 'gopuram', 'sea', 'mangrove', 'fort'];

/**
 * The front page. Every piece of wording comes from `t(section, field)`, which returns what the admin set in
 * Pages & content, or the built-in default from page-schemas.ts; photos come from the page's hero list and
 * named photo positions. Rooms, gallery, experiences and guest quotes come from their own admin screens.
 */
@Component({
  selector: 'qi-home',
  imports: [RouterLink, PageHeroComponent, ImageComponent, IconComponent, ShowcaseStripComponent, ReserveLinkDirective, EnquiryFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.component.html',
})
export class HomeComponent {
  private readonly cs = inject(ContentService);
  private readonly content = this.cs.content;
  private readonly doc = inject(DOCUMENT);
  protected readonly site = inject(SiteService);

  // --- hero ---
  private readonly page = computed(() => this.content().pages['home']);
  protected readonly heroPhotos = computed(() => this.page()?.heroPhotos ?? []);
  protected readonly heroVideo = computed(() => this.page()?.heroVideo ?? null);
  protected readonly shade = computed(() => heroShadePercent(this.t('hero', 'shade')));

  // --- rooms ---
  protected readonly rooms = computed(() => this.content().rooms);
  protected readonly roomIndex = signal(0);
  protected readonly room = computed(() => this.rooms()[this.roomIndex()] ?? null);

  // --- other sections ---
  protected readonly gallery = computed(() => this.content().gallery);
  protected readonly attractions = computed(() =>
    this.content().attractions.slice(0, 3).map((a, i) => ({ a, art: ATTRACTION_ART[i % ATTRACTION_ART.length] })));
  protected readonly quotes = computed(() => this.content().testimonials);
  protected readonly strip = computed(() => this.content().strip);
  /** Sliding-strip speed in pixels per second, from the admin's Slow / Medium / Fast choice. */
  protected readonly stripSpeed = computed(() => ({ slow: 30, medium: 50, fast: 80 } as Record<string, number>)[this.t('strip', 'speed')] ?? 50);

  protected readonly stats = computed(() => [1, 2, 3, 4].map((i) => ({ n: this.t('stats', 'n' + i), t: this.t('stats', 't' + i) })));
  protected readonly amenities = computed(() =>
    this.cs.rows('home', 'amenities', 'items').map((r, i) => ({ i: HOME_AMENITY_ICONS[i] ?? 'shield', t: r[0] ?? '', d: r[1] ?? '' })));
  protected readonly dining = computed(() => this.cs.rows('home', 'dining', 'hours').map((r) => [r[0] ?? '', r[1] ?? '']));

  // --- Q Bar (the new resto bar) ---
  protected readonly showQBar = computed(() => this.t('qbar', 'show') !== 'hide');
  protected readonly qbarLink = computed(() => this.site.whatsapp(this.t('qbar', 'message')));

  // --- guest quotes (rotate in the browser only) ---
  protected readonly quoteIndex = signal(0);

  // --- lightbox ---
  protected readonly lightbox = signal<number | null>(null);
  protected readonly lightboxItem = computed(() => {
    const i = this.lightbox();
    return i === null ? null : (this.gallery()[i] ?? null);
  });

  constructor() {
    const seo = this.cs.seo('home');
    const seoService = inject(SeoService);
    seoService.set({ title: seo.title, description: seo.description, path: '/', image: seo.image ? absUrl(seo.image) : undefined });
    seoService.setJsonLd(this.hotelData());

    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const timer = setInterval(() => {
        const n = this.quotes().length;
        if (n > 1) this.quoteIndex.update((i) => (i + 1) % n);
      }, 7000);
      destroyRef.onDestroy(() => clearInterval(timer));
    });
  }

  /** schema.org "Hotel" data built from Site settings and the rooms, so search results can show the hotel's details. */
  private hotelData(): object {
    const s = this.site;
    const prices = this.content().rooms.map((r) => r.startingTariff).filter((p): p is number => !!p);
    const first = this.content().pages['home']?.heroPhotos?.[0];
    const social = ['FacebookUrl', 'InstagramUrl', 'YouTubeUrl'].map((k) => s.get(k)).filter(Boolean);
    return {
      '@context': 'https://schema.org',
      '@type': 'Hotel',
      name: `Hotel ${s.hotelName()}, ${s.get('LocationLine')}`,
      url: SITE_URL,
      telephone: s.get('Phone1'),
      email: s.get('ReservationsEmail'),
      image: first ? absUrl(first.url) : undefined,
      priceRange: prices.length ? `₹${Math.min(...prices).toLocaleString('en-IN')} – ₹${Math.max(...prices).toLocaleString('en-IN')}` : undefined,
      checkinTime: s.get('CheckInTime') || undefined,
      checkoutTime: s.get('CheckOutTime') || undefined,
      address: { '@type': 'PostalAddress', streetAddress: s.get('Address'), addressLocality: s.get('LocationLine'), addressCountry: 'IN' },
      geo: s.get('Latitude') && s.get('Longitude') ? { '@type': 'GeoCoordinates', latitude: s.get('Latitude'), longitude: s.get('Longitude') } : undefined,
      sameAs: social.length ? social : undefined,
    };
  }

  /** The admin's wording for a field on this page, or the built-in default. */
  protected t(section: string, field: string): string {
    return this.cs.text('home', section, field);
  }

  /** A button's destination, from an address field such as hero.cta1Url. */
  protected link(section: string, field: string): ParsedLink {
    return parseLink(this.t(section, field));
  }

  /** True when a button's address field says "reserve": it then does whatever the Reserve button is set to do. */
  protected isReserve(section: string, field: string): boolean {
    return this.t(section, field).trim().toLowerCase() === 'reserve';
  }

  /** The photo in a named slot, or null (which shows themed artwork instead). */
  protected slot(key: string): MediaItem | null {
    return this.content().slots[key] ?? null;
  }

  protected shape(i: number): string {
    return GALLERY_SHAPES[i % GALLERY_SHAPES.length];
  }

  /** ₹ with Indian digit grouping. */
  protected inr(n: number | null): string {
    return n === null ? '' : '₹' + n.toLocaleString('en-IN');
  }

  protected openLightbox(i: number): void {
    this.lightbox.set(i);
    this.doc.body.style.overflow = 'hidden';
  }

  protected closeLightbox(): void {
    this.lightbox.set(null);
    this.doc.body.style.overflow = '';
  }

  protected step(d: number): void {
    const n = this.gallery().length;
    const i = this.lightbox();
    if (i !== null && n) this.lightbox.set((i + d + n) % n);
  }

  @HostListener('document:keydown', ['$event'])
  protected onKey(e: KeyboardEvent): void {
    if (this.lightbox() === null) return;
    if (e.key === 'Escape') this.closeLightbox();
    else if (e.key === 'ArrowRight') this.step(1);
    else if (e.key === 'ArrowLeft') this.step(-1);
  }
}
