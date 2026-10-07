import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Page-top hero. Stage 2 renders the colour field only; Stage 3 adds the image/video
 * layer (qi-image with WebP srcset and slow Ken Burns) behind the same text block.
 */
@Component({
  selector: 'qi-page-hero',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="on-dark relative flex overflow-hidden bg-primary text-on-primary"
             [class]="full() ? 'h-svh min-h-[640px]' : 'h-[70vh] min-h-[520px]'">
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_72%_85%,color-mix(in_srgb,var(--color-accent)_38%,transparent),transparent_60%)]"></div>
      <div class="absolute inset-0 bg-gradient-to-b from-primary/50 via-transparent to-deep/80"></div>
      <div class="wrap relative z-10 mt-auto pb-[clamp(64px,12vh,140px)]">
        @if (kicker()) { <span class="kicker">{{ kicker() }}</span> }
        <h1 class="max-w-[13ch] text-[clamp(44px,6.6vw,104px)] font-light leading-none tracking-[-.01em] animate-[qi-up_1.4s_var(--ease-lux)_both]">{{ title() }}</h1>
        @if (lede()) {
          <p class="mt-7 max-w-[46ch] text-[clamp(16px,1.3vw,19px)] text-on-primary/90 animate-[qi-up_1.4s_.25s_var(--ease-lux)_both]">{{ lede() }}</p>
        }
        <ng-content />
      </div>
    </section>`,
  styles: `@keyframes qi-up { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: none; } }`,
})
export class PageHeroComponent {
  readonly kicker = input('');
  readonly title = input.required<string>();
  readonly lede = input('');
  readonly full = input(false);
}
