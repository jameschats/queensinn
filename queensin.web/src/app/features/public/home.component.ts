import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, afterNextRender, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MediaItem } from '../../core/models/content.model';
import { ContentService } from '../../core/services/content.service';
import { SeoService } from '../../core/services/seo.service';
import { SiteService } from '../../core/services/site.service';
import { IconComponent } from '../../shared/icon.component';
import { ImageComponent } from '../../shared/image.component';
import { PageHeroComponent } from '../../shared/page-hero.component';

const DEFAULT_HEADLINE = 'Tranquility meets luxury in the sacred heart of Velankanni';
const DEFAULT_SUB =
  'A three-acre sanctuary on ECR Main Road, 500 metres from the Shrine Basilica. Fifty-one rooms, a multi-cuisine restaurant and the grand KVR Mahal.';

/** Photo shapes for the masonry gallery, cycled so the columns stay lively. */
const GALLERY_SHAPES = ['aspect-[3/4]', 'aspect-[4/3]', 'aspect-[2/3]', 'aspect-[4/3]', 'aspect-square', 'aspect-[3/4]'];
const ATTRACTION_ART = ['basilica', 'minaret', 'gopuram', 'sea', 'mangrove', 'fort'];

@Component({
  selector: 'qi-home',
  imports: [RouterLink, PageHeroComponent, ImageComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.component.html',
})
export class HomeComponent {
  private readonly content = inject(ContentService).content;
  private readonly doc = inject(DOCUMENT);
  protected readonly site = inject(SiteService);

  // --- hero ---
  protected readonly heroSlides = computed(() => this.content().hero.map((s) => s.image).filter((i): i is MediaItem => !!i));
  private readonly heroText = computed(() => this.content().hero.find((s) => s.headline));
  protected readonly headline = computed(() => this.heroText()?.headline || DEFAULT_HEADLINE);
  protected readonly sub = computed(() => this.heroText()?.subHeadline || DEFAULT_SUB);

  // --- rooms ---
  protected readonly rooms = computed(() => this.content().rooms);
  protected readonly roomIndex = signal(0);
  protected readonly room = computed(() => this.rooms()[this.roomIndex()] ?? null);

  // --- other sections ---
  protected readonly gallery = computed(() => this.content().gallery);
  protected readonly attractions = computed(() =>
    [0, 1, 3].map((i) => ({ a: this.content().attractions[i], art: ATTRACTION_ART[i] })).filter((x) => !!x.a));
  protected readonly quotes = computed(() => this.content().testimonials);

  protected readonly stats = [
    { n: '3', t: 'acres of gated gardens and lawns' },
    { n: '51', t: 'air-conditioned rooms in four categories' },
    { n: '500 m', t: 'walk to the Shrine Basilica' },
    { n: '24 h', t: 'reception and in-room dining' },
  ];
  protected readonly amenities = [
    { i: 'bell', t: '24-hour reception', d: 'Concierge help with darshan timings and travel' },
    { i: 'snow', t: 'Silent central cooling', d: 'Quiet air conditioning across the campus' },
    { i: 'bolt', t: 'Full power backup', d: 'Silent generators for rooms and halls' },
    { i: 'wifi', t: 'Wi-Fi throughout', d: 'Rooms, lobby and restaurant' },
    { i: 'car', t: 'Secure parking', d: '100+ cars and tour buses inside the gates' },
    { i: 'tray', t: 'In-room dining', d: 'Served around the clock' },
    { i: 'people', t: 'Meeting hall', d: 'For family gatherings and business groups' },
    { i: 'leaf', t: 'Garden lawns', d: 'With a children’s play area' },
    { i: 'bed', t: 'Driver quarters', d: 'Rest rooms, washrooms and meals for drivers' },
    { i: 'shield', t: 'Gated & guarded', d: 'CCTV and round-the-clock security' },
  ];
  protected readonly dining = [
    ['Breakfast buffet', '7:00 – 10:30'],
    ['Lunch', '12:30 – 15:30'],
    ['Dinner', '19:30 – 22:30'],
    ['In-room dining', '24 hours'],
  ];

  // --- guest quotes (rotate in the browser only) ---
  protected readonly quoteIndex = signal(0);

  // --- lightbox ---
  protected readonly lightbox = signal<number | null>(null);
  protected readonly lightboxItem = computed(() => {
    const i = this.lightbox();
    return i === null ? null : (this.gallery()[i] ?? null);
  });

  constructor() {
    inject(SeoService).set({
      title: "Hotel Queen's Inn, Velankanni | Luxury Hotel & KVR Mahal",
      description: 'A three-acre luxury hotel on ECR Main Road, 500 m from the Velankanni Basilica. 51 AC rooms, multi-cuisine dining and KVR Mahal for weddings.',
      path: '/',
    });

    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const t = setInterval(() => {
        const n = this.quotes().length;
        if (n > 1) this.quoteIndex.update((i) => (i + 1) % n);
      }, 7000);
      destroyRef.onDestroy(() => clearInterval(t));
    });
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
