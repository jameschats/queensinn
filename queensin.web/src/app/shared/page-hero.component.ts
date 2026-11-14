import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, effect, inject, input, signal, viewChild } from '@angular/core';
import { absUrl } from '../core/api.config';
import { MediaItem } from '../core/models/content.model';
import { ImageComponent } from './image.component';

/**
 * Page-top hero: a stack of photos that crossfade (slow Ken Burns zoom on the active one) behind the
 * headline block. With no photos it falls back to themed artwork of `art`.
 *
 * An optional muted looping `video` plays over the first photo, but only where that is kind to the
 * visitor: a desktop-sized screen, no reduced-motion preference, no data-saver setting. Everyone else
 * (and server-rendered HTML, and while the video loads) gets the photos, which is why a hero with a
 * video should still have at least one photo.
 */
@Component({
  selector: 'qi-page-hero',
  imports: [ImageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="on-dark relative flex overflow-hidden bg-primary text-on-primary"
             [class]="full() ? 'h-svh min-h-[640px]' : 'min-h-[70vh] pt-[150px]'">
      <!-- Only the first photo is fetched at once; the others follow a moment later, so the first one (and the page) paints sooner. -->
      @for (s of slides(); track s.id; let i = $index) {
        @if (i === 0 || more()) {
          <div class="slide absolute inset-0 transition-opacity duration-[1600ms] ease-linear" [class.opacity-0]="i !== active()"
               [class.kb]="i === active() && !playingVideo()" [attr.aria-hidden]="i !== active()">
            <qi-image class="h-full w-full" [media]="s" [art]="art()" sizes="100vw" [priority]="i === 0" />
          </div>
        }
      } @empty {
        <qi-image class="absolute inset-0 h-full w-full opacity-40" [art]="art()" />
      }
      @if (playingVideo() && video(); as v) {
        <video #vid class="absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms]" [class.opacity-0]="!videoReady()"
               [src]="videoUrl(v)" [muted]="true" loop playsinline autoplay preload="auto" aria-hidden="true" tabindex="-1"
               (canplay)="videoReady.set(true)" (error)="videoFailed()"></video>
      }
      <!-- Nothing is laid over the photo or video by default, so its true colours show. The admin can still choose a flat, even tint
           (Pages & content → Hero text → Darken the photo); the white text stays readable through a soft shadow of its own instead. -->
      @if (shade() > 0) {
        <div class="absolute inset-0" [style.background-color]="'color-mix(in srgb, var(--color-primary) ' + shade() + '%, transparent)'"></div>
      }
      <div class="wrap relative z-10 mt-auto pb-[clamp(64px,12vh,140px)] [text-shadow:0_1px_2px_rgb(0_0_0/0.75),0_2px_18px_rgb(0_0_0/0.6),0_0_40px_rgb(0_0_0/0.35)]">
        <!-- A small frosted panel behind the words only; the photo or video around it is untouched. -->
        <div class="inline-block max-w-full rounded-2xl bg-primary/35 p-[clamp(20px,2.4vw,36px)] backdrop-blur-md">
        @if (kicker()) { <span class="kicker">{{ kicker() }}</span> }
        <h1 class="leading-none tracking-[-.01em] animate-[qi-up_1.4s_var(--ease-lux)_both]"
            [class]="full() ? 'max-w-[17ch] text-[clamp(36px,4.8vw,76px)]' : 'max-w-[18ch] text-[clamp(40px,5.2vw,84px)]'">{{ title() }}</h1>
        @if (lede()) {
          <p class="mt-7 max-w-[46ch] text-[clamp(16px,1.3vw,19px)] text-on-primary/90 animate-[qi-up_1.4s_.25s_var(--ease-lux)_both]">{{ lede() }}</p>
        }
        </div>
        <ng-content />
        @if (slides().length > 1 && !playingVideo()) {
          <div class="mt-8 flex gap-1" role="tablist" aria-label="Hero photos">
            @for (s of slides(); track s.id; let i = $index) {
              <button type="button" role="tab" [attr.aria-selected]="i === active()" [attr.aria-label]="'Show photo ' + (i + 1)"
                      class="group relative h-6 w-10 border-0 bg-transparent p-0" (click)="go(i)">
                <span class="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 transition-colors" [class]="i === active() ? 'bg-accent' : 'bg-on-primary/35 group-hover:bg-on-primary/60'"></span>
              </button>
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
  /** Optional looping background video (see class comment for when it plays). */
  readonly video = input<MediaItem | null>(null);
  /** Artwork shown when there are no photos. */
  readonly art = input('dusk');
  /** Percentage of an even dark tint over the photo (0 to 100). */
  readonly shade = input(25);

  protected readonly active = signal(0);
  /** True a moment after load: the photos after the first are rendered (and fetched) only then. */
  protected readonly more = signal(false);
  protected readonly playingVideo = signal(false);
  protected readonly videoReady = signal(false);
  private readonly videoEl = viewChild<ElementRef<HTMLVideoElement>>('vid');
  private timer?: ReturnType<typeof setInterval>;
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
      const wide = window.matchMedia('(min-width: 768px)').matches;
      if (this.video() && wide && !reduced && !saveData) this.playingVideo.set(true);
      else if (!reduced) this.start();
      const later = setTimeout(() => this.more.set(true), 2500);
      this.destroyRef.onDestroy(() => { clearInterval(this.timer); clearTimeout(later); });
    });
    // The muted *property* (not the attribute) is what lets browsers autoplay, so set it and start playback explicitly.
    effect(() => {
      const el = this.videoEl()?.nativeElement;
      if (!el) return;
      el.muted = true;
      el.play().catch(() => this.videoFailed());
    });
  }

  protected videoUrl(v: MediaItem): string {
    return absUrl(v.url);
  }

  /** A video that cannot play (bad file, blocked autoplay) quietly hands over to the photos. */
  protected videoFailed(): void {
    if (!this.playingVideo()) return;
    this.playingVideo.set(false);
    this.videoReady.set(false);
    this.start();
  }

  protected go(i: number): void {
    this.more.set(true);
    this.active.set(i);
    clearInterval(this.timer);   // a visitor's choice restarts the countdown
    this.start();
  }

  private start(): void {
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      const n = this.slides().length;
      if (n > 1) this.active.update((i) => (i + 1) % n);
    }, 6500);
  }
}
