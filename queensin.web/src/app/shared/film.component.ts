import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { absUrl } from '../core/api.config';
import { MediaItem } from '../core/models/content.model';
import { IconComponent } from './icon.component';
import { ImageComponent } from './image.component';

/**
 * A click-to-play film with sound. Until the visitor presses play only the cover photo is loaded (the video has
 * preload="none" and is not even in the page), so it costs nothing for people who do not watch it.
 */
@Component({
  selector: 'qi-film',
  imports: [IconComponent, ImageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative mx-auto aspect-video w-full max-w-[1040px] overflow-hidden bg-deep shadow-[0_20px_60px_rgb(0_0_0/0.35)]">
      @if (playing()) {
        <video class="absolute inset-0 h-full w-full bg-black" [src]="src()" [attr.poster]="posterUrl()" controls autoplay loop playsinline preload="auto"
               [attr.aria-label]="label()"></video>
      } @else {
        <qi-image class="absolute inset-0 h-full w-full" [media]="poster()" art="dusk" [alt]="label()" sizes="(min-width: 1100px) 1040px, 100vw" />
        <button type="button" class="group absolute inset-0 flex items-center justify-center border-0 bg-transparent p-0" [attr.aria-label]="'Play: ' + label()" (click)="playing.set(true)">
          <span class="flex h-[84px] w-[84px] items-center justify-center rounded-full bg-accent text-primary shadow-[0_8px_30px_rgb(0_0_0/0.4)] transition-transform duration-200 group-hover:scale-105 group-active:scale-95">
            <qi-icon name="play" [size]="34" />
          </span>
        </button>
      }
    </div>`,
})
export class FilmComponent {
  readonly video = input<MediaItem | null>(null);
  readonly poster = input<MediaItem | null>(null);
  readonly label = input('Watch the film');

  protected readonly playing = signal(false);
  protected readonly src = computed(() => (this.video() ? absUrl(this.video()!.url) : ''));
  protected readonly posterUrl = computed(() => {
    const p = this.poster();
    if (!p) return null;
    const v = p.variants?.[1600] ?? p.variants?.[960];
    return absUrl(v ?? p.url);
  });
}
