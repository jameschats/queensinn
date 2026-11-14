import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { absUrl } from '../../core/api.config';
import { heroShadePercent } from '../../core/content/page-schemas';
import { MediaItem, Room } from '../../core/models/content.model';
import { ContentService } from '../../core/services/content.service';
import { SeoService } from '../../core/services/seo.service';
import { SiteService } from '../../core/services/site.service';
import { EnquiryFormComponent } from '../../shared/enquiry-form.component';
import { IconComponent } from '../../shared/icon.component';
import { ImageComponent } from '../../shared/image.component';
import { PageHeroComponent } from '../../shared/page-hero.component';

/**
 * The Stay page: a card for every room category (photos, description, specs, amenities, starting price), the
 * reservation enquiry form and the practical "Good to know" points. Room details come from Admin > Rooms; the headings
 * and policy lines from Pages & content > Stay.
 */
@Component({
  selector: 'qi-stay',
  imports: [RouterLink, PageHeroComponent, ImageComponent, IconComponent, EnquiryFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <qi-page-hero [kicker]="t('hero', 'kicker')" [title]="t('hero', 'headline')" [lede]="t('hero', 'lede')" art="room"
                  [slides]="heroPhotos()" [video]="heroVideo()" [shade]="shade()" />

    <section class="sec" id="rooms">
      <div class="wrap grid gap-[clamp(64px,9vw,128px)]">
        @for (r of rooms(); track r.id; let i = $index) {
          <article class="grid items-center gap-[clamp(28px,5vw,80px)] md:grid-cols-2" [id]="'room-' + r.slug">
            <div [class.md:order-2]="i % 2 === 1">
              <qi-image class="aspect-[4/3]" [media]="current(r)" [art]="i === 3 ? 'suite' : 'room'" [alt]="r.name" sizes="(min-width: 768px) 50vw, 100vw" />
              @if (photos(r).length > 1) {
                <ul class="m-0 mt-3 grid list-none grid-cols-5 gap-2 p-0" aria-label="More photos of {{ r.name }}">
                  @for (m of photos(r); track m.id; let k = $index) {
                    <li><button type="button" class="block w-full border-2 bg-transparent p-0 transition-colors" [class]="k === index(r) ? 'border-accent' : 'border-transparent opacity-80 hover:opacity-100'"
                                (click)="show(r, k)" [attr.aria-label]="'Show photo ' + (k + 1)" [attr.aria-pressed]="k === index(r)">
                      <qi-image class="aspect-[4/3]" [media]="m" sizes="120px" /></button></li>
                  }
                </ul>
              }
            </div>
            <div>
              @if (r.tagline) { <span class="kicker">{{ r.tagline }}</span> }
              <h2 class="text-[clamp(32px,3.2vw,46px)]">{{ r.name }}</h2>
              @if (r.description) { <p class="mt-5 whitespace-pre-line text-muted">{{ r.description }}</p> }
              <div class="mt-7 grid grid-cols-2 gap-x-7 gap-y-3.5 text-[14.5px]">
                @if (r.sizeSqFt) { <div class="flex items-center gap-3"><qi-icon name="sqft" class="text-gold-ink" />{{ r.sizeSqFt }} sq ft</div> }
                @if (r.bedType) { <div class="flex items-center gap-3"><qi-icon name="bed" class="text-gold-ink" />{{ r.bedType }}</div> }
                @if (r.viewType) { <div class="flex items-center gap-3"><qi-icon name="eye" class="text-gold-ink" />{{ r.viewType }}</div> }
                <div class="flex items-center gap-3"><qi-icon name="guest" class="text-gold-ink" />Up to {{ r.maxGuests }} guests</div>
              </div>
              @if (r.amenities.length) {
                <ul class="m-0 mt-6 flex list-none flex-wrap gap-2 p-0">
                  @for (a of r.amenities; track a) { <li class="border border-line px-3 py-1.5 text-[13px] text-muted">{{ a }}</li> }
                </ul>
              }
              @if (r.startingTariff) {
                <p class="mt-8 font-serif text-[30px] leading-[1.1]">{{ inr(r.startingTariff) }} <small class="font-sans text-[13px] tracking-[.04em] text-muted">per night {{ r.taxNote || '+ GST' }}</small></p>
              }
              <button type="button" class="btn mt-6" (click)="enquire(r)">Enquire for this room</button>
            </div>
          </article>
        } @empty {
          <p class="text-muted">Our rooms will be listed here shortly. Please call us on {{ site.get('Phone1') }}.</p>
        }
      </div>
    </section>

    <section class="sec bg-tint" id="reserve">
      <div class="wrap grid gap-[clamp(40px,7vw,120px)] lg:grid-cols-[.8fr_1.2fr]">
        <div>
          <span class="kicker">{{ t('enquiry', 'kicker') }}</span>
          <h2 class="h-display">{{ t('enquiry', 'title') }}</h2>
          <p class="mt-6 max-w-[44ch] whitespace-pre-line text-muted">{{ t('enquiry', 'intro') }}</p>
          <div class="mt-9 grid gap-5 text-[15px]">
            <div class="grid grid-cols-[28px_1fr] gap-3.5"><qi-icon name="phone" class="mt-1 text-gold-ink" /><span><a [href]="site.tel('Phone1')">{{ site.get('Phone1') }}</a>@if (site.get('Phone2')) { · <a [href]="site.tel('Phone2')">{{ site.get('Phone2') }}</a> }@if (site.get('Phone3')) { · <a [href]="site.tel('Phone3')">{{ site.get('Phone3') }}</a> }</span></div>
            <div class="grid grid-cols-[28px_1fr] gap-3.5"><qi-icon name="wa" class="mt-1 text-gold-ink" /><a [href]="site.whatsapp()" target="_blank" rel="noopener">Message the front desk</a></div>
          </div>
        </div>
        <qi-enquiry-form type="Room" [roomId]="selectedRoom()" />
      </div>
    </section>

    @if (site.bookingLinks().length) {
      <section class="sec" id="book-online">
        <div class="wrap grid items-center gap-8 md:grid-cols-[1fr_auto]">
          <div>
            <span class="kicker">{{ t('book', 'kicker') }}</span>
            <h2 class="h-display">{{ t('book', 'title') }}</h2>
            <p class="mt-5 max-w-[56ch] whitespace-pre-line text-muted">{{ t('book', 'intro') }}</p>
          </div>
          <div class="flex flex-wrap gap-3 md:justify-end">
            @for (l of site.bookingLinks(); track l.url) {
              <a [href]="l.url" target="_blank" rel="noopener noreferrer" class="btn btn-ghost inline-flex gap-3"><qi-icon name="ext" [size]="16" />{{ l.name }}</a>
            }
          </div>
        </div>
      </section>
    }

    <section class="sec">
      <div class="wrap">
        <div class="mb-[clamp(36px,5vw,64px)] flex flex-wrap items-end justify-between gap-6">
          <div><span class="kicker">{{ t('know', 'kicker') }}</span><h2 class="h-display">{{ t('know', 'title') }}</h2></div>
          <a routerLink="/terms-conditions" class="link">{{ t('know', 'linkText') }}</a>
        </div>
        <div class="grid border-l border-t border-line sm:grid-cols-2 lg:grid-cols-4">
          @for (k of know(); track $index) {
            <div class="border-b border-r border-line p-7">
              <b class="mb-2 block font-serif text-xl font-medium">{{ k[0] }}</b>
              <span class="text-[14.5px] leading-normal text-muted">{{ k[1] }}</span>
            </div>
          }
        </div>
      </div>
    </section>`,
})
export class StayComponent {
  private readonly cs = inject(ContentService);
  private readonly doc = inject(DOCUMENT);
  protected readonly site = inject(SiteService);

  private readonly page = computed(() => this.cs.content().pages['bookroom']);
  protected readonly heroPhotos = computed(() => this.page()?.heroPhotos ?? []);
  protected readonly heroVideo = computed(() => this.page()?.heroVideo ?? null);
  protected readonly shade = computed(() => heroShadePercent(this.t('hero', 'shade')));
  protected readonly rooms = computed(() => this.cs.content().rooms);
  protected readonly selectedRoom = signal<number | null>(null);
  private readonly shown = signal<Record<number, number>>({});

  /** "Check-in from {checkin} | text" lines, with the times filled in from Site settings. */
  protected readonly know = computed(() =>
    this.cs.rows('bookroom', 'know', 'items').map((r) => [
      this.fill(r[0] ?? ''), this.fill(r[1] ?? ''),
    ]));

  constructor() {
    const seo = this.cs.seo('bookroom');
    inject(SeoService).set({ title: seo.title, description: seo.description, path: '/bookroom', image: seo.image ? absUrl(seo.image) : undefined });
    // /bookroom?room=family-room pre-selects that room in the form
    const slug = inject(ActivatedRoute).snapshot.queryParamMap.get('room');
    const match = this.rooms().find((r) => r.slug === slug);
    if (match) this.selectedRoom.set(match.id);
  }

  protected t(section: string, field: string): string {
    return this.cs.text('bookroom', section, field);
  }

  private fill(s: string): string {
    return s.replace('{checkin}', this.site.get('CheckInTime')).replace('{checkout}', this.site.get('CheckOutTime')).replace(/\s+/g, ' ').trim();
  }

  /** The room's main photo first, then its extras, without repeats. */
  protected photos(r: Room): MediaItem[] {
    const all = [r.image, ...r.images].filter((m): m is MediaItem => !!m);
    return all.filter((m, i) => all.findIndex((x) => x.id === m.id) === i);
  }

  protected index(r: Room): number { return this.shown()[r.id] ?? 0; }
  protected current(r: Room): MediaItem | null { return this.photos(r)[this.index(r)] ?? null; }
  protected show(r: Room, i: number): void { this.shown.update((s) => ({ ...s, [r.id]: i })); }

  protected enquire(r: Room): void {
    this.selectedRoom.set(r.id);
    this.doc.getElementById('reserve')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected inr(n: number | null): string {
    return n === null ? '' : '₹' + n.toLocaleString('en-IN');
  }
}
