import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { absUrl } from '../../core/api.config';
import { heroShadePercent } from '../../core/content/page-schemas';
import { MediaItem } from '../../core/models/content.model';
import { ContentService } from '../../core/services/content.service';
import { SeoService } from '../../core/services/seo.service';
import { SiteService } from '../../core/services/site.service';
import { IconComponent } from '../../shared/icon.component';
import { ImageComponent } from '../../shared/image.component';
import { PageHeroComponent } from '../../shared/page-hero.component';

/** Themed artwork shown for a place until it has a photo, repeated if there are more places than pictures. */
const ART = ['basilica', 'minaret', 'gopuram', 'sea', 'mangrove', 'fort'];

/**
 * Experiences: the sacred sites and wild coast within reach of the hotel, each with its distance, a short description
 * and a photo (from Admin → Experiences), and the travel desk. Wording under Pages & content → Experiences.
 */
@Component({
  selector: 'qi-activities',
  imports: [PageHeroComponent, ImageComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <qi-page-hero [kicker]="t('hero', 'kicker')" [title]="t('hero', 'headline')" [lede]="t('hero', 'lede')" art="sea"
                  [slides]="heroPhotos()" [video]="heroVideo()" [shade]="shade()" />

    <section class="sec">
      <div class="wrap">
        @for (a of places(); track a.id; let i = $index) {
          <article class="grid items-center gap-x-[clamp(28px,5vw,72px)] gap-y-6 border-b border-line py-[clamp(36px,5vw,64px)] first:pt-0 md:grid-cols-[150px_1fr_minmax(0,1fr)]">
            <div class="font-serif text-[clamp(52px,5vw,72px)] font-light leading-none">{{ km(a.distanceKm) }}<small class="ml-1.5 block font-sans text-[13px] tracking-[.06em] text-muted">km away</small></div>
            <div>
              <h2 class="text-[clamp(28px,2.8vw,40px)]">{{ a.name }}</h2>
              @if (a.description) { <p class="mt-3.5 whitespace-pre-line text-muted">{{ a.description }}</p> }
            </div>
            <qi-image class="aspect-[3/2]" [media]="a.image" [art]="art(i)" [alt]="a.name" sizes="(min-width: 768px) 38vw, 100vw" />
          </article>
        } @empty {
          <p class="text-muted">Our guide to the region is on its way. Ask the front desk on {{ site.get('Phone1') }}.</p>
        }
        @if (credits().length) {
          <p class="mt-10 max-w-[90ch] text-[12.5px] leading-relaxed text-muted">
            Photo credits:
            @for (c of credits(); track c.name; let last = $last) { <span>{{ c.name }}: {{ c.text }}{{ last ? '.' : '; ' }}</span> }
          </p>
        }
      </div>
    </section>

    <section class="sec bg-tint">
      <div class="wrap grid items-center gap-[clamp(40px,7vw,120px)] md:grid-cols-2">
        <div>
          <span class="kicker">{{ t('desk', 'kicker') }}</span>
          <h2 class="h-display">{{ t('desk', 'title') }}</h2>
          <hr class="rule" />
          <p class="max-w-[52ch] whitespace-pre-line text-muted">{{ t('desk', 'body') }}</p>
          <div class="mt-8">
            <a [href]="site.whatsapp(t('desk', 'message'))" target="_blank" rel="noopener" class="btn inline-flex gap-3"><qi-icon name="wa" [size]="18" />{{ t('desk', 'buttonText') }}</a>
          </div>
        </div>
        <qi-image class="aspect-[4/3]" [media]="slot('travel-desk')" art="fort" [alt]="t('desk', 'title')" sizes="(min-width: 768px) 45vw, 100vw" />
      </div>
    </section>`,
})
export class ActivitiesComponent {
  private readonly cs = inject(ContentService);
  protected readonly site = inject(SiteService);

  private readonly page = computed(() => this.cs.content().pages['activities']);
  protected readonly heroPhotos = computed(() => this.page()?.heroPhotos ?? []);
  protected readonly heroVideo = computed(() => this.page()?.heroVideo ?? null);
  protected readonly shade = computed(() => heroShadePercent(this.t('hero', 'shade')));
  protected readonly places = computed(() => this.cs.content().attractions);
  /** Credit lines for photos used under a free licence: the photo's caption in the media library, shown as "Place: caption". */
  protected readonly credits = computed(() =>
    this.places().filter((a) => a.image?.caption).map((a) => ({ name: a.name, text: (a.image!.caption as string).replace(/^Photo:\s*/i, '') })));

  constructor() {
    const seo = this.cs.seo('activities');
    inject(SeoService).set({ title: seo.title, description: seo.description, path: '/activities', image: seo.image ? absUrl(seo.image) : undefined });
  }

  protected t(section: string, field: string): string {
    return this.cs.text('activities', section, field);
  }

  protected slot(key: string): MediaItem | null {
    return this.cs.content().slots[key] ?? null;
  }

  protected art(i: number): string {
    return ART[i % ART.length];
  }

  /** 0.5 stays 0.5; 14 shows as 14. */
  protected km(d: number): string {
    return Number.isInteger(d) ? String(d) : d.toFixed(1);
  }
}
