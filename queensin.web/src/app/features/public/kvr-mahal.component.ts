import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { absUrl } from '../../core/api.config';
import { heroShadePercent } from '../../core/content/page-schemas';
import { MediaItem } from '../../core/models/content.model';
import { ContentService } from '../../core/services/content.service';
import { SeoService } from '../../core/services/seo.service';
import { SiteService } from '../../core/services/site.service';
import { EnquiryFormComponent } from '../../shared/enquiry-form.component';
import { IconComponent } from '../../shared/icon.component';
import { ImageComponent } from '../../shared/image.component';
import { PageHeroComponent } from '../../shared/page-hero.component';
import { ShowcaseStripComponent } from '../../shared/showcase-strip.component';

const HALL_ICONS = ['stage', 'sound', 'ac'];
const DINING_ICONS = ['pot', 'flow', 'drop'];

/**
 * The KVR Mahal page: key figures, the ceremonial hall, the dining pavilion, a comparison of staying on one campus, and
 * the event enquiry form. Wording is edited in Pages & content → KVR Mahal; the two feature photos under its Photos tab.
 */
@Component({
  selector: 'qi-kvr-mahal',
  imports: [RouterLink, PageHeroComponent, ImageComponent, IconComponent, EnquiryFormComponent, ShowcaseStripComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <qi-page-hero [kicker]="t('hero', 'kicker')" [title]="t('hero', 'headline')" [lede]="t('hero', 'lede')" art="mandap"
                  [slides]="heroPhotos()" [video]="heroVideo()" [shade]="shade()">
      <div class="mt-10 flex flex-wrap gap-3.5">
        <a routerLink="/kvr-mahal" fragment="mahal-enquiry" class="btn btn-gold">{{ t('hero', 'cta1Text') }}</a>
        <a [href]="site.tel('Phone2')" class="btn btn-ghost">{{ t('hero', 'cta2Text') }}</a>
      </div>
    </qi-page-hero>

    <section class="on-dark bg-primary py-[clamp(56px,6vw,90px)] text-on-primary">
      <div class="wrap grid grid-cols-2 lg:grid-cols-4">
        @for (s of stats(); track $index) {
          <div class="border-accent/35 py-6 pr-6 lg:border-r lg:last:border-r-0">
            <b class="block font-serif text-[clamp(44px,4.4vw,64px)] font-light leading-none text-accent">{{ s.n }}</b>
            <span class="mt-3 block max-w-[24ch] text-sm leading-normal text-on-primary-muted">{{ s.t }}</span>
          </div>
        }
      </div>
    </section>

    <section class="sec">
      <div class="wrap grid items-center gap-[clamp(40px,7vw,120px)] md:grid-cols-2">
        <div>
          <span class="kicker">{{ t('hall', 'kicker') }}</span>
          <h2 class="h-display">{{ t('hall', 'title') }}</h2>
          <hr class="rule" />
          <p class="lede whitespace-pre-line">{{ t('hall', 'lede') }}</p>
          <ul class="m-0 mt-9 grid list-none gap-5 p-0">
            @for (f of hall(); track $index) {
              <li class="grid grid-cols-[28px_1fr] items-start gap-4"><qi-icon [name]="f.icon" [size]="26" class="text-gold-ink" /><span class="text-[15px] leading-normal">{{ f.text }}</span></li>
            }
          </ul>
        </div>
        <div class="relative mx-auto w-full max-w-[460px] md:max-w-none">
          <div class="pointer-events-none absolute inset-[-14px_14px_14px_-14px] rounded-t-full border border-accent"></div>
          <qi-image class="relative aspect-[3/4] rounded-t-full" [media]="slot('mahal-hall')" art="hall" [alt]="t('hall', 'title')" sizes="(min-width: 768px) 40vw, 90vw" />
        </div>
      </div>
    </section>

    <section class="sec bg-tint">
      <div class="wrap grid items-center gap-[clamp(40px,7vw,120px)] md:grid-cols-2">
        <qi-image class="aspect-[4/3] md:order-2" [media]="slot('mahal-dining')" art="leaf" [alt]="t('dining', 'title')" sizes="(min-width: 768px) 50vw, 100vw" />
        <div>
          <span class="kicker">{{ t('dining', 'kicker') }}</span>
          <h2 class="h-display">{{ t('dining', 'title') }}</h2>
          <hr class="rule" />
          <p class="lede whitespace-pre-line">{{ t('dining', 'lede') }}</p>
          <ul class="m-0 mt-9 grid list-none gap-5 p-0">
            @for (f of dining(); track $index) {
              <li class="grid grid-cols-[28px_1fr] items-start gap-4"><qi-icon [name]="f.icon" [size]="26" class="text-gold-ink" /><span class="text-[15px] leading-normal">{{ f.text }}</span></li>
            }
          </ul>
        </div>
      </div>
    </section>

    @if (strip().length) {
      <section class="sec">
        <div class="wrap">
          <div class="mb-[clamp(28px,4vw,48px)]"><span class="kicker">{{ t('gallery', 'kicker') }}</span><h2 class="h-display">{{ t('gallery', 'title') }}</h2></div>
        </div>
        <qi-showcase-strip [items]="strip()" [moreText]="t('gallery', 'moreText')" />
      </section>
    }

    <section class="sec">
      <div class="wrap">
        <div class="mb-[clamp(36px,5vw,64px)] flex flex-wrap items-end justify-between gap-8">
          <div><span class="kicker">{{ t('compare', 'kicker') }}</span><h2 class="h-display">{{ t('compare', 'title') }}</h2></div>
          <p class="m-0 max-w-[44ch] text-muted">{{ t('compare', 'intro') }}</p>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[640px] border-collapse text-left text-[15px]">
            <thead>
              <tr>
                <th class="w-[18%] border-b border-line p-4"></th>
                <th class="border-b border-line p-4 font-sans text-[12px] font-normal uppercase tracking-[.16em] text-muted">{{ t('compare', 'colOther') }}</th>
                <th class="border-b border-accent bg-tint p-4 font-sans text-[12px] font-medium uppercase tracking-[.16em]">{{ t('compare', 'colUs') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (r of compare(); track $index) {
                <tr>
                  <td class="border-b border-line p-4 font-serif text-lg font-medium">{{ r[0] }}</td>
                  <td class="border-b border-line p-4 text-muted">{{ r[1] }}</td>
                  <td class="border-b border-line bg-tint p-4">{{ r[2] }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section class="sec bg-tint" id="mahal-enquiry">
      <div class="wrap grid gap-[clamp(40px,7vw,120px)] lg:grid-cols-[.8fr_1.2fr]">
        <div>
          <span class="kicker">{{ t('enquiry', 'kicker') }}</span>
          <h2 class="h-display">{{ t('enquiry', 'title') }}</h2>
          <p class="mt-6 max-w-[44ch] whitespace-pre-line text-muted">{{ t('enquiry', 'intro') }}</p>
          <div class="mt-9 grid gap-5 text-[15px]">
            <div class="grid grid-cols-[28px_1fr] gap-3.5"><qi-icon name="phone" class="mt-1 text-gold-ink" /><span><b class="block text-[12.5px] font-medium uppercase tracking-[.14em] text-ink/85">Events desk</b><a [href]="site.tel('Phone2')">{{ site.get('Phone2') || site.get('Phone1') }}</a></span></div>
            <div class="grid grid-cols-[28px_1fr] gap-3.5"><qi-icon name="mail" class="mt-1 text-gold-ink" /><span><b class="block text-[12.5px] font-medium uppercase tracking-[.14em] text-ink/85">Email</b><a [href]="'mailto:' + (site.get('SalesEmail') || site.get('ReservationsEmail'))">{{ site.get('SalesEmail') || site.get('ReservationsEmail') }}</a></span></div>
            <div class="grid grid-cols-[28px_1fr] gap-3.5"><qi-icon name="wa" class="mt-1 text-gold-ink" /><a [href]="site.whatsapp('Hello, I would like to enquire about KVR Mahal for an event.')" target="_blank" rel="noopener">WhatsApp the events desk</a></div>
          </div>
        </div>
        <qi-enquiry-form type="Mahal" />
      </div>
    </section>`,
})
export class KvrMahalComponent {
  private readonly cs = inject(ContentService);
  protected readonly site = inject(SiteService);

  private readonly page = computed(() => this.cs.content().pages['kvr-mahal']);
  protected readonly heroPhotos = computed(() => this.page()?.heroPhotos ?? []);
  protected readonly heroVideo = computed(() => this.page()?.heroVideo ?? null);
  protected readonly shade = computed(() => heroShadePercent(this.t('hero', 'shade')));

  protected readonly stats = computed(() => [1, 2, 3, 4].map((i) => ({ n: this.t('stats', 'n' + i), t: this.t('stats', 't' + i) })).filter((s) => s.n || s.t));
  protected readonly hall = computed(() => this.cs.rows('kvr-mahal', 'hall', 'items').map((r, i) => ({ icon: HALL_ICONS[i] ?? 'shield', text: r[0] ?? '' })));
  protected readonly dining = computed(() => this.cs.rows('kvr-mahal', 'dining', 'items').map((r, i) => ({ icon: DINING_ICONS[i] ?? 'shield', text: r[0] ?? '' })));
  protected readonly compare = computed(() => this.cs.rows('kvr-mahal', 'compare', 'rows'));
  protected readonly strip = computed(() => this.cs.content().mahalStrip);

  constructor() {
    const seo = this.cs.seo('kvr-mahal');
    inject(SeoService).set({ title: seo.title, description: seo.description, path: '/kvr-mahal', image: seo.image ? absUrl(seo.image) : undefined });
  }

  protected t(section: string, field: string): string {
    return this.cs.text('kvr-mahal', section, field);
  }

  protected slot(key: string): MediaItem | null {
    return this.cs.content().slots[key] ?? null;
  }
}
