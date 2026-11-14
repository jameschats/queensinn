import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HasUnsavedChanges } from '../../../core/guards/admin.guards';
import { thumbUrl } from '../../../core/media-url';
import { apiError } from '../../../core/models/api.model';
import { MediaItem } from '../../../core/models/content.model';
import { AdminApiService } from '../../../core/services/admin-api.service';
import { IconComponent } from '../../../shared/icon.component';
import { MediaPickerComponent } from '../media/media-picker.component';

type Placement = 'collage' | 'strip' | 'mahal';

interface Row {
  id?: number;
  media: MediaItem;
  title: string;
  caption: string;
  linkUrl: string;
  visible: boolean;
}

interface GalleryState {
  rows: Row[];
  loaded: boolean;
  dirty: boolean;
}

/**
 * The galleries. "Collage" is the home page's photo grid that opens in a full-screen viewer; "Sliding strip" is the
 * scrolling row of cards above the facilities, and "KVR Mahal strip" is the same kind of row on the KVR Mahal page;
 * each card in a strip can have a title, a caption and a link. Photos are
 * chosen from the media library (several at once), reordered, shown or hidden, and saved per gallery.
 */
@Component({
  selector: 'qi-gallery-admin',
  imports: [FormsModule, RouterLink, IconComponent, MediaPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-[22px] font-medium">Galleries</h1>
        <p class="mt-0.5 text-[13.5px] text-[#6B7485]">The photo galleries on the home page and the KVR Mahal page. Add photos from the media library, drag them into order with the arrows, and save.</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        @if (state().dirty) { <span class="pill pill-warn">Unsaved changes</span> }
        <a href="/#gallery" target="_blank" rel="noopener" class="abtn"><qi-icon name="ext" [size]="15" />View site</a>
        <button type="button" class="abtn abtn-pri" [disabled]="saving() || loading() || !state().dirty" (click)="save()">{{ saving() ? 'Saving…' : 'Save ' + saveLabel() }}</button>
      </div>
    </header>

    <nav class="mb-5 flex gap-1 border-b border-[#E3E6EB]" role="tablist" aria-label="Galleries">
      @for (t of tabs; track t.id) {
        <button type="button" role="tab" [attr.aria-selected]="tab() === t.id" (click)="show(t.id)"
                class="-mb-px border-0 border-b-2 bg-transparent px-4 py-2.5 text-[14px]"
                [class]="tab() === t.id ? 'border-b-[var(--color-accent)] font-medium text-[#1D2430]' : 'border-b-transparent text-[#6B7485] hover:text-[#1D2430]'">
          {{ t.label }}
          @if (states()[t.id].dirty) { <span class="ml-1 text-[#93370D]">•</span> }
        </button>
      }
    </nav>

    @if (message(); as m) { <p class="alert mb-4" [class.alert-ok]="m.ok" role="status">{{ m.text }}</p> }

    <p class="ahint mb-4">
      @if (tab() === 'strip') {
        The scrolling row above “Within the gates”. On phones it becomes a list, one photo under another. The heading and scroll speed are under
        <a routerLink="/admin/pages/home" class="underline">Pages &amp; content → Home → Page text</a>.
      } @else if (tab() === 'mahal') {
        The scrolling row on the KVR Mahal page, between the dining pavilion and the “Why one campus” table. The heading is under
        <a routerLink="/admin/pages/kvr-mahal" class="underline">Pages &amp; content → KVR Mahal → Page text</a>.
      } @else {
        The photo grid near the bottom of the home page. Visitors tap a photo to see it full screen.
      }
    </p>

    @if (loading()) {
      <div class="card text-[#6B7485]">Loading…</div>
    } @else {
      <div class="mb-4"><button type="button" class="abtn abtn-pri" (click)="adding.set(true)"><qi-icon name="plus" [size]="15" />Add photos</button>
        <span class="ml-3 text-[13px] text-[#6B7485]">{{ state().rows.length }} photo{{ state().rows.length === 1 ? '' : 's' }} · {{ visibleCount() }} shown on the site</span></div>

      @if (!state().rows.length) {
        <div class="card text-center text-[#6B7485]">This gallery is empty, so it is hidden on the website. Add some photos to show it.</div>
      } @else if (tab() !== 'collage') {
        <ul class="m-0 grid list-none gap-3 p-0">
          @for (r of state().rows; track $index; let i = $index) {
            <li class="card grid gap-4 !p-3 sm:grid-cols-[132px_1fr_auto]" [class.opacity-60]="!r.visible">
              <img class="aspect-[3/4] w-[132px] rounded-md object-cover" [src]="thumb(r.media)" [alt]="r.media.altText || r.media.fileName" />
              <div class="grid content-start gap-2.5">
                <label class="alabel">Title<input class="ainput" maxlength="120" [(ngModel)]="r.title" (ngModelChange)="touch()" [name]="'t' + i" placeholder="e.g. Deluxe Double Room" /></label>
                <label class="alabel">Short description<input class="ainput" maxlength="300" [(ngModel)]="r.caption" (ngModelChange)="touch()" [name]="'c' + i" placeholder="One line under the title" /></label>
                <label class="alabel">Link (optional)<input class="ainput" maxlength="300" [(ngModel)]="r.linkUrl" (ngModelChange)="touch()" [name]="'l' + i" placeholder="/bookroom, /#restaurant or https://…" /></label>
              </div>
              <div class="flex flex-row items-start gap-1.5 sm:flex-col">
                <button type="button" class="abtn abtn-sm" [disabled]="i === 0" (click)="move(i, -1)" aria-label="Move earlier"><qi-icon name="up" [size]="13" /></button>
                <button type="button" class="abtn abtn-sm" [disabled]="i === state().rows.length - 1" (click)="move(i, 1)" aria-label="Move later"><qi-icon name="down" [size]="13" /></button>
                <button type="button" class="abtn abtn-sm" (click)="toggle(i)" [attr.aria-pressed]="r.visible" [title]="r.visible ? 'Shown on the website' : 'Hidden'">{{ r.visible ? 'Shown' : 'Hidden' }}</button>
                <button type="button" class="abtn abtn-sm abtn-danger" (click)="remove(i)" aria-label="Remove"><qi-icon name="trash" [size]="13" /></button>
              </div>
            </li>
          }
        </ul>
      } @else {
        <ul class="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3 p-0">
          @for (r of state().rows; track $index; let i = $index) {
            <li class="overflow-hidden rounded-lg border border-[#E3E6EB] bg-white" [class.opacity-60]="!r.visible">
              <img class="aspect-[4/3] w-full object-cover" [src]="thumb(r.media)" [alt]="r.media.altText || r.media.fileName" />
              <div class="flex items-center justify-between gap-1 px-2 py-2">
                <span class="text-[12px] text-[#6B7485]">#{{ i + 1 }}</span>
                <span class="flex gap-1">
                  <button type="button" class="abtn abtn-sm" [disabled]="i === 0" (click)="move(i, -1)" aria-label="Move earlier"><qi-icon name="arrowL" [size]="12" /></button>
                  <button type="button" class="abtn abtn-sm" [disabled]="i === state().rows.length - 1" (click)="move(i, 1)" aria-label="Move later"><qi-icon name="arrowR" [size]="12" /></button>
                  <button type="button" class="abtn abtn-sm" (click)="toggle(i)" [attr.aria-pressed]="r.visible">{{ r.visible ? 'Shown' : 'Hidden' }}</button>
                  <button type="button" class="abtn abtn-sm abtn-danger" (click)="remove(i)" aria-label="Remove"><qi-icon name="trash" [size]="12" /></button>
                </span>
              </div>
            </li>
          }
        </ul>
      }

      <div class="mt-6 flex justify-end">
        <button type="button" class="abtn abtn-pri" [disabled]="saving() || !state().dirty" (click)="save()">{{ saving() ? 'Saving…' : 'Save ' + saveLabel() }}</button>
      </div>
    }

    @if (adding()) {
      <qi-media-picker kind="image" title="Add photos — tick as many as you like" [multi]="true" (pickedMany)="addMany($event)" (closed)="adding.set(false)" />
    }`,
})
export class GalleryAdminComponent implements HasUnsavedChanges {
  private readonly api = inject(AdminApiService);

  protected readonly tabs: { id: Placement; label: string }[] = [
    { id: 'strip', label: 'Sliding strip' },
    { id: 'collage', label: 'Collage gallery' },
    { id: 'mahal', label: 'KVR Mahal strip' },
  ];
  protected readonly tab = signal<Placement>('strip');
  protected readonly states = signal<Record<Placement, GalleryState>>({
    strip: { rows: [], loaded: false, dirty: false },
    collage: { rows: [], loaded: false, dirty: false },
    mahal: { rows: [], loaded: false, dirty: false },
  });
  protected readonly state = computed(() => this.states()[this.tab()]);
  protected readonly saveLabel = computed(() => ({ strip: 'strip', collage: 'collage', mahal: 'KVR Mahal strip' })[this.tab()]);
  protected readonly visibleCount = computed(() => this.state().rows.filter((r) => r.visible).length);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly adding = signal(false);
  protected readonly message = signal<{ ok: boolean; text: string } | null>(null);

  constructor() {
    this.load('strip');
  }

  hasUnsavedChanges(): boolean {
    const s = this.states();
    return s.strip.dirty || s.collage.dirty || s.mahal.dirty;
  }

  @HostListener('window:beforeunload', ['$event'])
  protected onUnload(e: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) e.preventDefault();
  }

  protected show(t: Placement): void {
    this.tab.set(t);
    this.message.set(null);
    if (!this.states()[t].loaded) this.load(t);
  }

  private patch(p: Placement, fn: (s: GalleryState) => GalleryState): void {
    this.states.update((all) => ({ ...all, [p]: fn(all[p]) }));
  }

  private load(p: Placement): void {
    this.loading.set(true);
    this.api.gallery(p).subscribe({
      next: (items) => {
        const rows: Row[] = items.filter((i) => i.media).map((i) => ({
          id: i.id, media: i.media!, title: i.title ?? '', caption: i.caption ?? '', linkUrl: i.linkUrl ?? '', visible: i.visible,
        }));
        this.patch(p, () => ({ rows, loaded: true, dirty: false }));
        this.loading.set(false);
      },
      error: (e) => { this.loading.set(false); this.message.set({ ok: false, text: apiError(e) }); },
    });
  }

  protected touch(): void {
    this.patch(this.tab(), (s) => ({ ...s, dirty: true }));
    this.message.set(null);
  }

  private mutate(fn: (rows: Row[]) => Row[]): void {
    this.patch(this.tab(), (s) => ({ ...s, rows: fn(s.rows), dirty: true }));
    this.message.set(null);
  }

  protected addMany(items: MediaItem[]): void {
    this.adding.set(false);
    this.mutate((rows) => [...rows, ...items.map((m): Row => ({ media: m, title: '', caption: '', linkUrl: '', visible: true }))]);
  }

  protected move(i: number, d: -1 | 1): void {
    this.mutate((rows) => {
      const j = i + d;
      if (j < 0 || j >= rows.length) return rows;
      const c = [...rows];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });
  }

  protected toggle(i: number): void {
    this.mutate((rows) => rows.map((r, k) => (k === i ? { ...r, visible: !r.visible } : r)));
  }

  protected remove(i: number): void {
    this.mutate((rows) => rows.filter((_, k) => k !== i));
  }

  protected save(): void {
    const p = this.tab();
    this.saving.set(true);
    this.message.set(null);
    this.api.saveGallery(p, this.state().rows.map((r) => ({
      id: r.id, mediaId: r.media.id, title: r.title, caption: r.caption, linkUrl: r.linkUrl, visible: r.visible,
    }))).subscribe({
      next: (items) => {
        const rows: Row[] = items.filter((i) => i.media).map((i) => ({
          id: i.id, media: i.media!, title: i.title ?? '', caption: i.caption ?? '', linkUrl: i.linkUrl ?? '', visible: i.visible,
        }));
        this.patch(p, () => ({ rows, loaded: true, dirty: false }));
        this.saving.set(false);
        this.message.set({ ok: true, text: 'Saved. The website shows this gallery now.' });
      },
      error: (e) => { this.saving.set(false); this.message.set({ ok: false, text: apiError(e) }); },
    });
  }

  protected thumb(m: MediaItem): string {
    return thumbUrl(m, 480);
  }
}
