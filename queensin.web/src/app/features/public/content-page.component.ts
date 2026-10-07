import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SeoService } from '../../core/services/seo.service';
import { PageHeroComponent } from '../../shared/page-hero.component';

/** Route data for every page that is still a shell in Stage 2. */
export interface ContentPageData {
  path: string;
  kicker?: string;
  title: string;
  lede?: string;
  metaTitle: string;
  metaDescription?: string;
  /** Section anchors that other pages link to, kept so those links resolve today. */
  anchors?: string[];
  /** Pages without a hero (policies) use a plain heading instead. */
  plain?: boolean;
}

/**
 * Stage 2 shell for every preserved route: correct URL, title, meta and canonical are all in
 * place from day one so nothing about the old Wix URLs breaks. Each page gets its real
 * component in Stage 5 when the content API exists.
 */
@Component({
  selector: 'qi-content-page',
  imports: [PageHeroComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (page.plain) {
      <section class="sec pt-[calc(var(--sec)+60px)]">
        <div class="wrap">
          @if (page.kicker) { <span class="kicker">{{ page.kicker }}</span> }
          <h1 class="text-[clamp(44px,5.4vw,80px)] font-light">{{ page.title }}</h1>
          @if (page.lede) { <p class="lede mt-6">{{ page.lede }}</p> }
        </div>
      </section>
    } @else {
      <qi-page-hero [kicker]="page.kicker ?? ''" [title]="page.title" [lede]="page.lede ?? ''" />
    }
    @for (a of page.anchors ?? []; track a) { <section [id]="a"></section> }`,
})
export class ContentPageComponent {
  protected readonly page = inject(ActivatedRoute).snapshot.data['page'] as ContentPageData;

  constructor() {
    inject(SeoService).set({ title: this.page.metaTitle, description: this.page.metaDescription, path: this.page.path });
  }
}
