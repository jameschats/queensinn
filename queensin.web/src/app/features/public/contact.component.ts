import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { absUrl } from '../../core/api.config';
import { ContentService } from '../../core/services/content.service';
import { SeoService } from '../../core/services/seo.service';
import { SiteService } from '../../core/services/site.service';
import { IconComponent } from '../../shared/icon.component';

/** Used only if the hotel's coordinates are missing or malformed in Site settings. */
const FALLBACK_QUERY = 'Hotel Queens Inn Velankanni';
const COORD = /^-?\d{1,3}(\.\d{1,8})?$/;

/**
 * Contact page: every way to reach the front desk, the address with a map, and the hours. Phone numbers, emails,
 * address, check-in/out and the map position come from Site settings (so they are edited once and appear everywhere);
 * the headings and descriptive text come from Pages & content → Contact.
 */
@Component({
  selector: 'qi-contact',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="sec pt-[calc(var(--sec)+60px)]">
      <div class="wrap grid items-start gap-[clamp(48px,8vw,140px)] lg:grid-cols-[1.1fr_.9fr]">
        <div>
          @if (t('hero', 'kicker')) { <span class="kicker">{{ t('hero', 'kicker') }}</span> }
          <h1 class="text-[clamp(40px,5vw,72px)]">{{ t('hero', 'headline') }}</h1>
          @if (t('hero', 'lede')) { <p class="lede mt-6 whitespace-pre-line">{{ t('hero', 'lede') }}</p> }

          <div class="mt-12 grid gap-[26px] text-[15px]">
            <div class="grid grid-cols-[28px_1fr] gap-3.5">
              <qi-icon name="phone" class="mt-1 text-gold-ink" />
              <span><b class="block text-[11.5px] font-normal uppercase tracking-[.2em] text-muted">Call</b>
                <a [href]="site.tel('Phone1')">{{ site.get('Phone1') }}</a>
                @if (site.get('Phone2')) { · <a [href]="site.tel('Phone2')">{{ site.get('Phone2') }}</a> }</span>
            </div>
            <div class="grid grid-cols-[28px_1fr] gap-3.5">
              <qi-icon name="wa" class="mt-1 text-gold-ink" />
              <span><b class="block text-[11.5px] font-normal uppercase tracking-[.2em] text-muted">WhatsApp</b>
                <a [href]="site.whatsapp()" target="_blank" rel="noopener">Message the front desk</a></span>
            </div>
            <div class="grid grid-cols-[28px_1fr] gap-3.5">
              <qi-icon name="mail" class="mt-1 text-gold-ink" />
              <span><b class="block text-[11.5px] font-normal uppercase tracking-[.2em] text-muted">Email</b>
                <a [href]="'mailto:' + site.get('ReservationsEmail')">{{ site.get('ReservationsEmail') }}</a>
                @if (site.get('SalesEmail')) { <br /><a [href]="'mailto:' + site.get('SalesEmail')">{{ site.get('SalesEmail') }}</a> <span class="ml-1 text-muted">(events &amp; sales)</span> }</span>
            </div>
            <div class="grid grid-cols-[28px_1fr] gap-3.5">
              <qi-icon name="pin" class="mt-1 text-gold-ink" />
              <span><b class="block text-[11.5px] font-normal uppercase tracking-[.2em] text-muted">Address</b>
                <span class="whitespace-pre-line">{{ site.get('Address') }}</span>
                @if (site.get('MapUrl')) { <br /><a [href]="site.get('MapUrl')" target="_blank" rel="noopener" class="link mt-2 inline-block">Open in Google Maps</a> }</span>
            </div>
          </div>
        </div>

        <aside class="grid gap-8">
          <div class="bg-tint p-[clamp(28px,3.5vw,48px)]">
            <h2 class="text-[clamp(26px,2.4vw,34px)]">{{ t('reach', 'title') }}</h2>
            <p class="mt-4 whitespace-pre-line text-muted">{{ t('reach', 'body') }}</p>
            <div class="mt-7 flex flex-wrap gap-3.5">
              <a [href]="site.whatsapp()" target="_blank" rel="noopener" class="btn btn-gold">WhatsApp us</a>
              <a [href]="site.tel('Phone1')" class="btn btn-ghost">Call {{ site.get('Phone1') }}</a>
            </div>
          </div>

          <div>
            <h2 class="mb-4 text-[clamp(22px,2vw,28px)]">{{ t('hours', 'title') }}</h2>
            <dl class="m-0 grid gap-2.5 border-t border-line pt-5 text-[14.5px]">
              @for (r of hours(); track $index) {
                <div class="flex justify-between gap-4"><dt>{{ r[0] }}</dt><dd class="m-0 text-right">{{ r[1] }}</dd></div>
              }
              @if (site.get('CheckInTime')) { <div class="flex justify-between gap-4"><dt>Check-in</dt><dd class="m-0 text-right">from {{ site.get('CheckInTime') }}</dd></div> }
              @if (site.get('CheckOutTime')) { <div class="flex justify-between gap-4"><dt>Check-out</dt><dd class="m-0 text-right">by {{ site.get('CheckOutTime') }}</dd></div> }
            </dl>
          </div>
        </aside>
      </div>

      <div class="wrap mt-[clamp(64px,8vw,110px)]">
        <h2 class="text-[clamp(26px,2.6vw,38px)]">{{ t('visit', 'title') }}</h2>
        <p class="mt-4 max-w-[62ch] whitespace-pre-line text-muted">{{ t('visit', 'body') }}</p>
        <div class="mt-8 aspect-[16/9] w-full overflow-hidden border border-line bg-tint md:aspect-[21/9]">
          <iframe class="h-full w-full border-0" [src]="mapSrc()" title="Map showing Hotel Queen's Inn, Velankanni" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>
        </div>
      </div>
    </section>`,
})
export class ContactComponent {
  private readonly cs = inject(ContentService);
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly site = inject(SiteService);

  protected readonly hours = computed(() => this.cs.rows('contact', 'hours', 'rows').map((r) => [r[0] ?? '', r[1] ?? '']));

  /** A Google Maps embed at the hotel's coordinates. Only plain numbers are allowed into the address. */
  protected readonly mapSrc = computed(() => {
    const lat = this.site.get('Latitude') || '10.6806';
    const lng = this.site.get('Longitude') || '79.8474';
    const q = COORD.test(lat) && COORD.test(lng) ? `${lat},${lng}` : encodeURIComponent(FALLBACK_QUERY);
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://maps.google.com/maps?q=${q}&z=15&output=embed`);
  });

  constructor() {
    const seo = this.cs.seo('contact');
    inject(SeoService).set({ title: seo.title, description: seo.description, path: '/contact', image: seo.image ? absUrl(seo.image) : undefined });
  }

  protected t(section: string, field: string): string {
    return this.cs.text('contact', section, field);
  }
}
