import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, PLATFORM_ID, inject, signal } from '@angular/core';
import {
  NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterLink, RouterLinkActive, RouterOutlet, Scroll,
} from '@angular/router';
import { filter } from 'rxjs';
import { SiteService } from '../core/services/site.service';
import { BrandComponent } from '../shared/brand.component';
import { IconComponent } from '../shared/icon.component';

interface NavItem {
  label: string;
  link: string;
  fragment?: string;
}

/**
 * Header, full-screen mobile menu, footer and the mobile Call / WhatsApp / Enquire bar.
 * The header is transparent over a hero and turns solid on scroll; pages without a hero set
 * `data: { solidHeader: true }` on their route.
 */
@Component({
  selector: 'qi-public-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, BrandComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './public-layout.component.html',
  host: { '(window:scroll)': 'onScroll()' },
})
export class PublicLayoutComponent {
  protected readonly site = inject(SiteService);
  private readonly router = inject(Router);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly scrolled = signal(false);
  protected readonly solidRoute = signal(false);
  protected readonly menuOpen = signal(false);
  /** True while a page change resets the scroll position, so the header snaps to its new state instead of fading. */
  protected readonly instant = signal(false);
  protected readonly year = new Date().getFullYear();

  protected readonly nav: NavItem[] = [
    { label: 'Stay', link: '/bookroom' },
    { label: 'KVR Mahal', link: '/kvr-mahal' },
    { label: 'Dining', link: '/', fragment: 'restaurant' },
    { label: 'Experiences', link: '/activities' },
    { label: 'Our story', link: '/about-us' },
    { label: 'Contact', link: '/contact' },
  ];

  constructor() {
    this.readRouteData();
    const sub = this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      this.readRouteData();
      this.menuOpen.set(false);
      this.onScroll();
    });
    // Jumping to an anchor on another page (e.g. Dining from /kvr-mahal) should land instantly, not
    // glide down a whole page after the cross-fade; scrolling within a page stays smooth.
    const root = inject(DOCUMENT).documentElement;
    let lastPath = this.router.url.split(/[?#]/)[0];
    const instantUntilScrolled = this.router.events.subscribe((e) => {
      if (e instanceof NavigationStart) {
        if (e.url.split(/[?#]/)[0] !== lastPath) { root.classList.add('no-smooth'); this.instant.set(true); }
      } else if (e instanceof NavigationEnd) {
        lastPath = e.urlAfterRedirects.split(/[?#]/)[0];
        setTimeout(() => { root.classList.remove('no-smooth'); this.instant.set(false); }, 600);   // safety net
      } else if (e instanceof Scroll) {
        setTimeout(() => { root.classList.remove('no-smooth'); this.instant.set(false); }, 120);
      } else if (e instanceof NavigationCancel || e instanceof NavigationError) {
        root.classList.remove('no-smooth');
        this.instant.set(false);
      }
    });
    inject(DestroyRef).onDestroy(() => { sub.unsubscribe(); instantUntilScrolled.unsubscribe(); });
  }

  protected onScroll(): void {
    if (this.isBrowser) this.scrolled.set(window.scrollY > 40);
  }

  private readRouteData(): void {
    // Read from the router's snapshot: during construction the child ActivatedRoute
    // exists but its snapshot isn't attached yet, so walking this.route fails on SSR.
    let r = this.router.routerState.snapshot.root;
    while (r.firstChild) r = r.firstChild;
    this.solidRoute.set(r.data?.['solidHeader'] === true);
  }
}
