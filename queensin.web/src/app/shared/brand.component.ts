import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteService } from '../core/services/site.service';
import { CrownComponent } from './icon.component';

/** Logo lockup: crown + hotel name + location line. Text comes from site settings. */
@Component({
  selector: 'qi-brand',
  imports: [RouterLink, CrownComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a [routerLink]="link()" class="flex items-center gap-3 leading-none" [attr.aria-label]="site.hotelName() + ' home'">
      <qi-crown [size]="30" />
      <span>
        <span class="block font-serif text-[27px] font-medium tracking-[.01em]">{{ site.hotelName() }}</span>
        @if (showPlace()) {
          <small class="mt-[5px] block text-[9.5px] uppercase tracking-[.42em] opacity-75">{{ site.get('LocationLine') }}</small>
        }
      </span>
    </a>`,
})
export class BrandComponent {
  protected readonly site = inject(SiteService);
  readonly link = input('/');
  readonly showPlace = input(true);
}
