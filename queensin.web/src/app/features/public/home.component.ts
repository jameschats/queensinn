import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/services/seo.service';
import { PageHeroComponent } from '../../shared/page-hero.component';

@Component({
  selector: 'qi-home',
  imports: [RouterLink, PageHeroComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <qi-page-hero [full]="true" title="Tranquility meets luxury in the sacred heart of Velankanni"
      lede="A three-acre sanctuary on ECR Main Road, 500 metres from the Shrine Basilica. Fifty-one rooms, a multi-cuisine restaurant and the grand KVR Mahal.">
      <div class="mt-10 flex flex-wrap gap-3.5">
        <a routerLink="/bookroom" fragment="reserve" class="btn btn-gold">Request tariff</a>
        <a routerLink="/kvr-mahal" class="btn btn-ghost">Discover KVR Mahal</a>
      </div>
    </qi-page-hero>

    <section class="sec">
      <div class="wrap">
        <span class="kicker">Welcome to Queen's Inn</span>
        <h2 class="h-display max-w-[18ch]">Half a kilometre from the Basilica. A world away from the crowd.</h2>
        <hr class="rule" />
        <p class="lede">Three gated acres of garden on ECR Main Road, a ten-minute walk from the Shrine of Our Lady of Good Health.</p>

        <div class="mt-[clamp(64px,8vw,110px)] grid grid-cols-2 border-t border-line md:grid-cols-4">
          @for (s of stats; track s.n) {
            <div class="border-line pr-6 pt-7 pb-7 md:border-r md:last:border-r-0 md:pb-0">
              <b class="block font-serif text-[clamp(44px,4.4vw,64px)] font-light leading-none">{{ s.n }}</b>
              <span class="mt-3 block max-w-[20ch] text-sm leading-normal text-muted">{{ s.t }}</span>
            </div>
          }
        </div>
      </div>
    </section>

    <section id="restaurant" class="sec bg-tint">
      <div class="wrap">
        <span class="kicker">Q Multi-Cuisine Restaurant</span>
        <h2 class="h-display max-w-[18ch]">From temple-town breakfasts to coastal suppers</h2>
      </div>
    </section>
    <section id="gallery"></section>
    <section id="enquiry"></section>`,
})
export class HomeComponent {
  protected readonly stats = [
    { n: '3', t: 'acres of gated gardens and lawns' },
    { n: '51', t: 'air-conditioned rooms in four categories' },
    { n: '500 m', t: 'walk to the Shrine Basilica' },
    { n: '24 h', t: 'reception and in-room dining' },
  ];

  constructor() {
    inject(SeoService).set({
      title: "Hotel Queen's Inn, Velankanni | Luxury Hotel & KVR Mahal",
      description: 'A three-acre luxury hotel on ECR Main Road, 500 m from the Velankanni Basilica. 51 AC rooms, multi-cuisine dining and KVR Mahal for weddings.',
      path: '/',
    });
  }
}
