import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { absUrl } from '../../core/api.config';
import { heroShadePercent } from '../../core/content/page-schemas';
import { ContentService } from '../../core/services/content.service';
import { SeoService } from '../../core/services/seo.service';
import { SiteService } from '../../core/services/site.service';
import { EnquiryFormComponent } from '../../shared/enquiry-form.component';
import { IconComponent } from '../../shared/icon.component';
import { MapEmbedComponent } from '../../shared/map-embed.component';
import { PageHeroComponent } from '../../shared/page-hero.component';

/**
 * Contact page: every way to reach the front desk, the address with a map, and the hours. Phone numbers, emails,
 * address, check-in/out and the map position come from Site settings (so they are edited once and appear everywhere);
 * the headings and descriptive text come from Pages & content → Contact.
 */
@Component({
  selector: 'qi-contact',
  imports: [IconComponent, PageHeroComponent, EnquiryFormComponent, MapEmbedComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <qi-page-hero [kicker]="t('hero', 'kicker')" [title]="t('hero', 'headline')" [lede]="t('hero', 'lede')" art="portico"
                  [slides]="heroPhotos()" [video]="heroVideo()" [shade]="shade()" />
    <section class="sec">
      <div class="wrap grid items-start gap-[clamp(48px,8vw,140px)] lg:grid-cols-[1.1fr_.9fr]">
        <div>
          <h2 class="text-[clamp(26px,2.6vw,38px)]">{{ t('details', 'title') }}</h2>

          <div class="mt-9 grid gap-[26px] text-[15px]">
            <div class="grid grid-cols-[28px_1fr] gap-3.5">
              <qi-icon name="phone" class="mt-1 text-gold-ink" />
              <span><b class="block text-[12.5px] font-medium uppercase tracking-[.14em] text-ink/85">Call</b>
                <a [href]="site.tel('Phone1')">{{ site.get('Phone1') }}</a>
                @if (site.get('Phone2')) { · <a [href]="site.tel('Phone2')">{{ site.get('Phone2') }}</a> }
                @if (site.get('Phone3')) { · <a [href]="site.tel('Phone3')">{{ site.get('Phone3') }}</a> }</span>
            </div>
            <div class="grid grid-cols-[28px_1fr] gap-3.5">
              <qi-icon name="wa" class="mt-1 text-gold-ink" />
              <span><b class="block text-[12.5px] font-medium uppercase tracking-[.14em] text-ink/85">WhatsApp</b>
                <a [href]="site.whatsapp()" target="_blank" rel="noopener">Message the front desk</a></span>
            </div>
            <div class="grid grid-cols-[28px_1fr] gap-3.5">
              <qi-icon name="mail" class="mt-1 text-gold-ink" />
              <span><b class="block text-[12.5px] font-medium uppercase tracking-[.14em] text-ink/85">Email</b>
                <a [href]="'mailto:' + site.get('ReservationsEmail')">{{ site.get('ReservationsEmail') }}</a>
                @if (site.get('SalesEmail')) { <br /><a [href]="'mailto:' + site.get('SalesEmail')">{{ site.get('SalesEmail') }}</a> <span class="ml-1 text-muted">(events &amp; sales)</span> }</span>
            </div>
            <div class="grid grid-cols-[28px_1fr] gap-3.5">
              <qi-icon name="pin" class="mt-1 text-gold-ink" />
              <span><b class="block text-[12.5px] font-medium uppercase tracking-[.14em] text-ink/85">Address</b>
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

      @if (travel().length) {
        <div class="wrap mt-[clamp(64px,8vw,110px)]">
          <h2 class="text-[clamp(26px,2.6vw,38px)]">{{ t('travel', 'title') }}</h2>
          <ul class="mt-8 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
            @for (r of travel(); track $index) {
              <li class="border border-line bg-tint p-6">
                <b class="block text-[12.5px] font-medium uppercase tracking-[.14em] text-ink/85">{{ r[0] }}</b>
                <span class="mt-2 block text-[15px]">{{ r[1] }}</span>
              </li>
            }
          </ul>
        </div>
      }

      <div class="wrap mt-[clamp(64px,8vw,110px)]" id="message">
        <h2 class="text-[clamp(26px,2.6vw,38px)]">{{ t('message', 'title') }}</h2>
        <p class="mt-4 mb-10 max-w-[62ch] whitespace-pre-line text-muted">{{ t('message', 'intro') }}</p>
        <div class="max-w-[820px]"><qi-enquiry-form type="Contact" /></div>
      </div>

      <div class="wrap mt-[clamp(64px,8vw,110px)]">
        <h2 class="text-[clamp(26px,2.6vw,38px)]">{{ t('visit', 'title') }}</h2>
        <p class="mt-4 max-w-[62ch] whitespace-pre-line text-muted">{{ t('visit', 'body') }}</p>
        <qi-map-embed class="mt-8 aspect-[16/9] w-full md:aspect-[21/9]" />
      </div>
    </section>`,
})
export class ContactComponent {
  private readonly cs = inject(ContentService);
  protected readonly site = inject(SiteService);

  private readonly stored = computed(() => this.cs.content().pages['contact']);
  protected readonly heroPhotos = computed(() => this.stored()?.heroPhotos ?? []);
  protected readonly heroVideo = computed(() => this.stored()?.heroVideo ?? null);

  protected readonly shade = computed(() => heroShadePercent(this.t('hero', 'shade')));

  protected readonly hours = computed(() => this.cs.rows('contact', 'hours', 'rows').map((r) => [r[0] ?? '', r[1] ?? '']));

  protected readonly travel = computed(() => this.cs.rows('contact', 'travel', 'rows').map((r) => [r[0] ?? '', r[1] ?? '']).filter((r) => r[0]));

  constructor() {
    const seo = this.cs.seo('contact');
    inject(SeoService).set({ title: seo.title, description: seo.description, path: '/contact', image: seo.image ? absUrl(seo.image) : undefined });
  }

  protected t(section: string, field: string): string {
    return this.cs.text('contact', section, field);
  }
}
