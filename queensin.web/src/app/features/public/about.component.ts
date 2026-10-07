import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { absUrl } from '../../core/api.config';
import { heroShadePercent } from '../../core/content/page-schemas';
import { MediaItem } from '../../core/models/content.model';
import { ContentService } from '../../core/services/content.service';
import { SeoService } from '../../core/services/seo.service';
import { SiteService } from '../../core/services/site.service';
import { IconComponent } from '../../shared/icon.component';
import { ImageComponent } from '../../shared/image.component';
import { MapEmbedComponent } from '../../shared/map-embed.component';
import { PageHeroComponent } from '../../shared/page-hero.component';

const STANDARD_ICONS = ['shield', 'snow', 'drop'];

/** Our story: who the hotel is for, what guests can count on, and where it is. Wording under Pages & content → Our story. */
@Component({
  selector: 'qi-about',
  imports: [RouterLink, PageHeroComponent, ImageComponent, IconComponent, MapEmbedComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <qi-page-hero [kicker]="t('hero', 'kicker')" [title]="t('hero', 'headline')" [lede]="t('hero', 'lede')" art="arch"
                  [slides]="heroPhotos()" [video]="heroVideo()" [shade]="shade()" />

    <section class="sec">
      <div class="wrap grid items-center gap-[clamp(40px,7vw,120px)] md:grid-cols-2">
        <div>
          <h2 class="h-display">{{ t('story', 'title') }}</h2>
          <hr class="rule" />
          <p class="lede whitespace-pre-line">{{ t('story', 'lede') }}</p>
          @for (p of paragraphs(); track $index) { <p class="mt-5 max-w-[56ch] text-muted">{{ p }}</p> }
        </div>
        <div class="relative">
          <div class="pointer-events-none absolute inset-[-14px_14px_14px_-14px] border border-accent"></div>
          <qi-image class="relative aspect-[4/5]" [media]="slot('lawn')" art="garden" [alt]="t('story', 'title')" sizes="(min-width: 768px) 45vw, 100vw" />
        </div>
      </div>
    </section>

    <section class="sec bg-tint">
      <div class="wrap">
        <div class="mb-[clamp(36px,5vw,64px)]"><span class="kicker">{{ t('standards', 'kicker') }}</span><h2 class="h-display">{{ t('standards', 'title') }}</h2></div>
        <div class="grid gap-x-10 gap-y-9 md:grid-cols-3">
          @for (s of standards(); track $index) {
            <div class="grid grid-cols-[34px_1fr] items-start gap-5">
              <qi-icon [name]="s.icon" [size]="32" class="text-gold-ink" />
              <span><b class="mb-1.5 block font-serif text-[21px] font-medium">{{ s.title }}</b><span class="text-[15px] leading-normal text-muted">{{ s.text }}</span></span>
            </div>
          }
        </div>
      </div>
    </section>

    <section class="sec">
      <div class="wrap grid items-center gap-[clamp(40px,7vw,120px)] md:grid-cols-2">
        <div class="md:order-2">
          <span class="kicker">{{ t('location', 'kicker') }}</span>
          <h2 class="h-display">{{ t('location', 'title') }}</h2>
          <hr class="rule" />
          <p class="max-w-[52ch] whitespace-pre-line text-muted">{{ t('location', 'body') }}</p>
          <div class="mt-8 flex flex-wrap gap-3.5">
            <a routerLink="/activities" class="btn btn-ghost">{{ t('location', 'buttonText') }}</a>
            @if (site.get('MapUrl')) { <a [href]="site.get('MapUrl')" target="_blank" rel="noopener" class="btn btn-ghost">Open in Google Maps</a> }
          </div>
        </div>
        <qi-map-embed class="aspect-[4/3] w-full" [zoom]="14" />
      </div>
    </section>`,
})
export class AboutComponent {
  private readonly cs = inject(ContentService);
  protected readonly site = inject(SiteService);

  private readonly page = computed(() => this.cs.content().pages['about-us']);
  protected readonly heroPhotos = computed(() => this.page()?.heroPhotos ?? []);
  protected readonly heroVideo = computed(() => this.page()?.heroVideo ?? null);
  protected readonly shade = computed(() => heroShadePercent(this.t('hero', 'shade')));

  /** The story text, split into paragraphs at blank lines. */
  protected readonly paragraphs = computed(() => this.t('story', 'body').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean));
  protected readonly standards = computed(() => this.cs.rows('about-us', 'standards', 'items').map((r, i) => ({ icon: STANDARD_ICONS[i] ?? 'shield', title: r[0] ?? '', text: r[1] ?? '' })));

  constructor() {
    const seo = this.cs.seo('about-us');
    inject(SeoService).set({ title: seo.title, description: seo.description, path: '/about-us', image: seo.image ? absUrl(seo.image) : undefined });
  }

  protected t(section: string, field: string): string {
    return this.cs.text('about-us', section, field);
  }

  protected slot(key: string): MediaItem | null {
    return this.cs.content().slots[key] ?? null;
  }
}
