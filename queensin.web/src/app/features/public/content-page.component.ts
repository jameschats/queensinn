import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { absUrl } from '../../core/api.config';
import { pageDef } from '../../core/content/page-schemas';
import { ContentService } from '../../core/services/content.service';
import { Policy } from '../../core/services/policy.service';
import { SeoService } from '../../core/services/seo.service';
import { PageHeroComponent } from '../../shared/page-hero.component';

/** Route data for the pages that are still shells until Stage 5 builds their real content. */
export interface ContentPageData {
  /** The page's slug in the editor and API (matches core/content/page-schemas.ts). */
  slug: string;
  path: string;
  /** Section anchors that other pages link to, kept so those links resolve today. */
  anchors?: string[];
  /** Pages without a photo hero (contact, policies) use a plain heading instead. */
  plain?: boolean;
  /** Artwork shown behind the hero until the page has a photo (see qi-image for kinds). */
  art?: string;
  /** Set for terms / cancellation / privacy: the text comes from the policy API. */
  policy?: string;
  /** Heading used only if a policy cannot be loaded. */
  title?: string;
}

/**
 * Shell for every preserved route: correct URL, title, meta and canonical are in place so nothing about the
 * old Wix URLs breaks. The hero (text, photos, video) and SEO are editable in Pages & content; policy pages show
 * their saved text. Each page gets its full body in Stage 5.
 */
@Component({
  selector: 'qi-content-page',
  imports: [PageHeroComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (page.plain) {
      <section class="sec pt-[calc(var(--sec)+60px)]">
        <div class="wrap">
          @if (!page.policy && t('kicker')) { <span class="kicker">{{ t('kicker') }}</span> }
          <h1 class="text-[clamp(40px,5vw,72px)]">{{ page.policy ? (policy?.title || page.title) : t('headline') }}</h1>
          @if (!page.policy && t('lede')) { <p class="lede mt-6">{{ t('lede') }}</p> }
          @if (policy) {
            <div class="policy-body mt-12 max-w-[72ch]" [innerHTML]="policy.bodyHtml"></div>
          } @else if (page.policy) {
            <p class="mt-8 text-muted">This page is being updated. Please call us on the number in the footer.</p>
          }
        </div>
      </section>
    } @else {
      <qi-page-hero [kicker]="t('kicker')" [title]="t('headline')" [lede]="t('lede')" [art]="page.art ?? 'dusk'"
                    [slides]="heroPhotos()" [video]="heroVideo()" />
    }
    @for (a of page.anchors ?? []; track a) { <section [id]="a"></section> }`,
})
export class ContentPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly cs = inject(ContentService);
  protected readonly page = this.route.snapshot.data['page'] as ContentPageData;
  protected readonly policy = (this.route.snapshot.data['policy'] ?? null) as Policy | null;

  private readonly stored = computed(() => this.cs.content().pages[this.page.slug]);
  protected readonly heroPhotos = computed(() => this.stored()?.heroPhotos ?? []);
  protected readonly heroVideo = computed(() => this.stored()?.heroVideo ?? null);

  constructor() {
    const def = pageDef(this.page.slug);
    const seo = def ? this.cs.seo(this.page.slug) : { title: this.policy?.title ? `${this.policy.title} | Hotel Queen's Inn` : (this.page.title ?? ''), description: '', image: undefined };
    inject(SeoService).set({ title: seo.title, description: seo.description || undefined, path: this.page.path, image: seo.image ? absUrl(seo.image) : undefined });
  }

  protected t(field: string): string {
    return this.cs.text(this.page.slug, 'hero', field);
  }
}
