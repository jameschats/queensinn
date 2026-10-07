import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { API_ORIGIN } from '../core/api.config';
import { MediaItem } from '../core/models/content.model';
import { artSvg } from './art';

/** Upload URLs come back site-relative (/uploads/...). Behind Nginx that is the same origin; in development the API is elsewhere. */
const abs = (u: string) => (u.startsWith('/') ? API_ORIGIN + u : u);

/**
 * A photograph that fills its container (give the host a size or aspect ratio).
 *
 * - With media: a responsive WebP `srcset`, over a blurred placeholder that shows instantly.
 * - Without media (or with no photo yet): theme-aware artwork of the chosen `art` kind, so the
 *   page never has an empty grey box and always matches the colours the admin picked.
 *
 * The photo is plain <img>, visible without JavaScript and while the page hydrates. `priority`
 * is for the first image on a page (the hero): eager load and high fetch priority for LCP.
 */
@Component({
  selector: 'qi-image',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block overflow-hidden bg-primary' },
  // In the base layer so a consumer's `absolute` / `fixed` utility overrides it (same-layer `relative` used to win).
  styles: `@layer base { :host { position: relative; } }`,
  template: `
    @if (media(); as m) {
      @if (m.placeholder) {
        <span class="absolute inset-0 scale-110 bg-cover bg-center blur-xl" [style.background-image]="'url(' + m.placeholder + ')'" aria-hidden="true"></span>
      } @else {
        <span class="absolute inset-0 [&>svg]:h-full [&>svg]:w-full" [innerHTML]="artHtml()" aria-hidden="true"></span>
      }
      <img class="absolute inset-0 h-full w-full" [class]="fit() === 'contain' ? 'object-contain' : 'object-cover'"
           [src]="src()" [attr.srcset]="srcset()" [attr.sizes]="srcset() ? sizes() : null"
           [attr.width]="m.width" [attr.height]="m.height" [alt]="alt() || m.altText || ''"
           [attr.loading]="priority() ? 'eager' : 'lazy'" [attr.fetchpriority]="priority() ? 'high' : null" decoding="async" />
    } @else {
      <span class="absolute inset-0 [&>svg]:h-full [&>svg]:w-full" [innerHTML]="artHtml()" [attr.role]="alt() ? 'img' : null" [attr.aria-label]="alt() || null"></span>
    }`,
})
export class ImageComponent {
  private readonly sanitizer = inject(DomSanitizer);

  readonly media = input<MediaItem | null | undefined>(null);
  /** Artwork kind shown when there is no photo: dusk, garden, arch, hall, mandap, portico, room, suite, dine, leaf, sea, fort, mangrove, basilica, minaret, gopuram. */
  readonly art = input('dusk');
  /** Overrides the photo's own alt text; leave empty for a decorative image. */
  readonly alt = input('');
  /** The CSS `sizes` hint: how wide the image renders, so the browser picks the right file. */
  readonly sizes = input('100vw');
  readonly priority = input(false);
  readonly fit = input<'cover' | 'contain'>('cover');

  protected readonly srcset = computed(() => {
    const v = this.media()?.variants ?? {};
    const entries = Object.entries(v).sort((a, b) => +a[0] - +b[0]);
    return entries.length > 1 ? entries.map(([w, u]) => `${abs(u)} ${w}w`).join(', ') : null;
  });

  /** A mid-size file as the fallback `src`, for browsers that ignore srcset. */
  protected readonly src = computed(() => {
    const m = this.media();
    if (!m) return '';
    const widths = Object.keys(m.variants).map(Number).sort((a, b) => a - b);
    const pick = widths.find((w) => w >= 960) ?? widths[widths.length - 1];
    return abs(pick ? m.variants[pick] : m.url);
  });

  // The markup comes from our own artSvg() with fixed inputs, never from user content.
  protected readonly artHtml = computed(() => this.sanitizer.bypassSecurityTrustHtml(artSvg(this.art())));
}
