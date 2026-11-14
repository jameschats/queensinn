import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { absUrl } from '../core/api.config';
import { SiteService } from '../core/services/site.service';
import { CrownComponent } from './icon.component';

/**
 * The brand in the header, menu and footer. When a logo image is set in Site settings it is shown on its own;
 * otherwise a text lockup is drawn: crown + hotel name + location line, with the text from site settings.
 */
@Component({
  selector: 'qi-brand',
  imports: [RouterLink, CrownComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (logo(); as src) {
      <a [routerLink]="link()" class="block leading-none" [attr.aria-label]="site.hotelName() + ' home'">
        <img [src]="src" [alt]="'Hotel ' + site.hotelName() + ', ' + site.get('LocationLine')" height="60" class="h-[60px] w-auto max-w-[220px] object-contain" />
      </a>
    } @else {
      <a [routerLink]="link()" class="flex items-center gap-3 leading-none" [attr.aria-label]="site.hotelName() + ' home'">
        <qi-crown [size]="30" />
        <span>
          <span class="block font-serif text-[27px] font-medium tracking-[.01em]">{{ site.hotelName() }}</span>
          @if (showPlace()) {
            <small class="mt-[5px] block text-[9.5px] uppercase tracking-[.42em] opacity-75">{{ site.get('LocationLine') }}</small>
          }
        </span>
      </a>
    }`,
})
export class BrandComponent {
  protected readonly site = inject(SiteService);
  readonly link = input('/');
  readonly showPlace = input(true);
  /** The logo image address from Site settings (site-relative uploads are completed with the API address), or '' for the text lockup. */
  protected readonly logo = computed(() => {
    const u = this.site.get('LogoLightUrl') || this.site.get('LogoDarkUrl');
    return u ? absUrl(u) : '';
  });
}
