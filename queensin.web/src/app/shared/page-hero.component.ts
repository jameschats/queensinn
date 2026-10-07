import { ChangeDetectionStrategy, Component, DestroyRef, afterNextRender, inject, input, signal } from '@angular/core';
import { MediaItem } from '../core/models/content.model';
import { ImageComponent } from './image.component';

/**
 * Page-top hero: a stack of photos that crossfade (slow Ken Burns zoom on the active one)
 * behind the headline block. With no photos it falls back to themed artwork of `art`, so a
 * page without media still looks finished. Rotation runs only in the browser and is skipped
 * for visitors who prefer reduced motion.
 */
@Component({
  selector: 'qi-page-hero',
  imports: [ImageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="on-dark relative flex overflow-hidden bg-primary text-on-primary"
             [class]="full() ? 'h-svh min-h-[640px]' : 'min-h-[70vh] pt-[150px]'">
      @for (s of slides(); track s.id; let i = $index) {
        <div class="slide absolute inset-0 transition-opacity duration-[1600ms] ease-linear" [class.opacity-0]="i !== active()"
             [class.kb]="i === active()" [attr.aria-hidden]="i !== active()">
          <qi-image class="h-full w-full" [media]="s" [art]="art()" sizes="100vw" [priority]="i === 0" />
        </div>
      } @empty {
        <qi-image class="absolute inset-0 h-full w-full" [art]="art()" />
      }
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_72%_85%,color-mix(in_srgb,var(--color-accent)_38%,transparent),transparent_60%)] opacity-60"></div>
      <div class="absolute inset-0 bg-gradient-to-b from-primary/60 via-primary/10 to-deep/85"></div>
      <div class="absolute inset-0 bg-gradient-to-r from-primary/65 via-primary/25 to-transparent"></div>
      <div class="wrap relative z-10 mt-auto pb-[clamp(64px,12vh,140px)]">
        @if (kicker()) { <span class="kicker">{{ kicker() }}</span> }
        <h1 class="leading-none tracking-[-.01em] animate-[qi-up_1.4s_var(--ease-lux)_both]"
            [class]="full() ? 'max-w-[17ch] text-[clamp(36px,4.8vw,76px)]' : 'max-w-[18ch] text-[clamp(40px,5.2vw,84px)]'">{{ title() }}</h1>
        @if (lede()) {
          <p class="mt-7 max-w-[46ch] text-[clamp(16px,1.3vw,19px)] text-on-primary/90 animate-[qi-up_1.4s_.25s_var(--ease-lux)_both]">{{ lede() }}</p>
        }
        <ng-content />
        @if (slides().length > 1) {
          <div class="mt-10 flex gap-2" role="tablist" aria-label="Hero photos">
            @for (s of slides(); track s.id; let i = $index) {
              <button type="button" role="tab" [attr.aria-selected]="i === active()" [attr.aria-label]="'Show photo ' + (i + 1)"
                      class="h-[3px] w-10 border-0 p-0 transition-colors" [class]="i === active() ? 'bg-accent' : 'bg-on-primary/35 hover:bg-on-primary/60'"
                      (click)="go(i)"></button>
            }
          </div>
        }
      </div>
    </section>`,
  styles: `
    @keyframes qi-up { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: none; } }
    @keyframes qi-kb { from { transform: scale(1); } to { transform: scale(1.08); } }
    .kb { animation: qi-kb 14s linear both; }
    @media (prefers-reduced-motion: reduce) { .kb { animation: none; } }`,
})
export class PageHeroComponent {
  readonly kicker = input('');
  readonly title = input.required<string>();
  readonly lede = input('');
  readonly full = input(false);
  readonly slides = input<MediaItem[]>([]);
  /** Artwork shown when there are no photos. */
  readonly art = input('dusk');

  protected readonly active = signal(0);
  private timer?: ReturnType<typeof setInterval>;
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      this.start();
      this.destroyRef.onDestroy(() => clearInterval(this.timer));
    });
  }

  protected go(i: number): void {
    this.active.set(i);
    clearInterval(this.timer);   // a visitor's choice restarts the countdown
    this.start();
  }

  private start(): void {
    this.timer = setInterval(() => {
      const n = this.slides().length;
      if (n > 1) this.active.update((i) => (i + 1) % n);
    }, 6500);
  }
}
