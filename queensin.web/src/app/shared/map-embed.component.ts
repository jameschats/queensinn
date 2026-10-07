import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { SiteService } from '../core/services/site.service';

/** Used only if the hotel's coordinates are missing or malformed in Site settings. */
const FALLBACK_QUERY = 'Hotel Queens Inn Velankanni';
const COORD = /^-?\d{1,3}(\.\d{1,8})?$/;

/**
 * A Google Maps embed at the hotel's coordinates (Site settings → Latitude / Longitude). The frame is lazy-loaded, so
 * the map costs nothing until the visitor scrolls to it. Only plain numbers are allowed into the address.
 */
@Component({
  selector: 'qi-map-embed',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block overflow-hidden border border-line bg-tint' },
  template: `<iframe class="h-full w-full border-0" [src]="src()" title="Map showing Hotel Queen's Inn, Velankanni" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>`,
})
export class MapEmbedComponent {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly site = inject(SiteService);
  /** Map zoom level, 1 (world) to 20 (street). */
  readonly zoom = input(15);

  protected readonly src = computed(() => {
    const lat = this.site.get('Latitude') || '10.6806';
    const lng = this.site.get('Longitude') || '79.8474';
    const q = COORD.test(lat) && COORD.test(lng) ? `${lat},${lng}` : encodeURIComponent(FALLBACK_QUERY);
    const z = Math.min(20, Math.max(1, Math.round(this.zoom())));
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://maps.google.com/maps?q=${q}&z=${z}&output=embed`);
  });
}
