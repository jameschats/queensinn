import { ChangeDetectionStrategy, Component, RESPONSE_INIT, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/services/seo.service';

/** Real 404 status during SSR, so search engines drop dead URLs instead of indexing this page. */
@Component({
  selector: 'qi-not-found',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="sec pt-[calc(var(--sec)+60px)]">
      <div class="wrap">
        <span class="kicker">Page not found</span>
        <h1 class="max-w-[16ch] text-[clamp(44px,5.4vw,80px)] font-light">This path doesn’t lead anywhere</h1>
        <p class="lede mt-6">The page may have moved when we refreshed the website.</p>
        <div class="mt-9 flex flex-wrap gap-3.5">
          <a routerLink="/" class="btn">Go to the home page</a>
          <a routerLink="/contact" class="btn btn-ghost">Contact us</a>
        </div>
      </div>
    </section>`,
})
export class NotFoundComponent {
  constructor() {
    const init = inject(RESPONSE_INIT, { optional: true });
    if (init) init.status = 404;
    inject(SeoService).set({ title: "Page not found | Hotel Queen's Inn", path: '/404', noindex: true });
  }
}
