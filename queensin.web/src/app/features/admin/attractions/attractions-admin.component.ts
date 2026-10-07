import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HasUnsavedChanges } from '../../../core/guards/admin.guards';
import { thumbUrl } from '../../../core/media-url';
import { apiError } from '../../../core/models/api.model';
import { MediaItem } from '../../../core/models/content.model';
import { AdminApiService, AttractionAdmin } from '../../../core/services/admin-api.service';
import { IconComponent } from '../../../shared/icon.component';
import { MediaPickerComponent } from '../media/media-picker.component';

interface Row { id?: number; name: string; distanceKm: number | null; description: string; media: MediaItem | null; visible: boolean }

/** The places on the Experiences page (and the first three on the home page): name, distance, text and photo. */
@Component({
  selector: 'qi-attractions-admin',
  imports: [FormsModule, RouterLink, IconComponent, MediaPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-[22px] font-medium">Experiences</h1>
        <p class="mt-0.5 text-[13.5px] text-[#6B7485]">Places to visit near the hotel. The first three that are shown also appear on the home page. The page heading and travel-desk text are under
          <a routerLink="/admin/pages/activities" class="underline">Pages &amp; content → Experiences</a>.</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        @if (dirty()) { <span class="pill pill-warn">Unsaved changes</span> }
        <button type="button" class="abtn" (click)="add()"><qi-icon name="plus" [size]="15" />Add a place</button>
        <button type="button" class="abtn abtn-pri" [disabled]="saving() || loading() || !dirty()" (click)="save()">{{ saving() ? 'Saving…' : 'Save changes' }}</button>
      </div>
    </header>

    @if (message(); as m) { <p class="alert mb-4" [class.alert-ok]="m.ok" role="status">{{ m.text }}</p> }

    @if (loading()) {
      <div class="card text-[#6B7485]">Loading…</div>
    } @else if (!rows().length) {
      <div class="card text-center text-[#6B7485]">No places yet. Add the first one.</div>
    } @else {
      <ul class="m-0 grid list-none gap-3 p-0">
        @for (r of rows(); track $index; let i = $index) {
          <li class="card grid gap-4 !p-3 md:grid-cols-[180px_1fr_auto]" [class.opacity-60]="!r.visible">
            <div>
              @if (r.media) { <img class="aspect-[3/2] w-full rounded-md object-cover" [src]="thumb(r.media)" [alt]="r.media.altText || r.name" /> }
              @else { <div class="grid aspect-[3/2] w-full place-items-center rounded-md border border-dashed border-[#B8BFCC] bg-[#FBFBF9] text-[12px] text-[#6B7485]">No photo</div> }
              <div class="mt-2 flex gap-1.5">
                <button type="button" class="abtn abtn-sm" (click)="choose(i)">{{ r.media ? 'Change' : 'Add photo' }}</button>
                @if (r.media) { <button type="button" class="abtn abtn-sm abtn-danger" (click)="clearPhoto(i)">Remove</button> }
              </div>
            </div>
            <div class="grid content-start gap-2.5">
              <div class="grid gap-2.5 sm:grid-cols-[1fr_130px]">
                <label class="alabel">Name<input class="ainput" maxlength="120" [(ngModel)]="r.name" (ngModelChange)="touch()" [name]="'n' + i" /></label>
                <label class="alabel">Distance (km)<input class="ainput" type="number" min="0" max="999" step="0.1" [(ngModel)]="r.distanceKm" (ngModelChange)="touch()" [name]="'d' + i" /></label>
              </div>
              <label class="alabel">Description<textarea class="ainput" rows="3" maxlength="2000" [(ngModel)]="r.description" (ngModelChange)="touch()" [name]="'t' + i"></textarea></label>
            </div>
            <div class="flex flex-row items-start gap-1.5 md:flex-col">
              <button type="button" class="abtn abtn-sm" [disabled]="i === 0" (click)="move(i, -1)" aria-label="Move up"><qi-icon name="up" [size]="13" /></button>
              <button type="button" class="abtn abtn-sm" [disabled]="i === rows().length - 1" (click)="move(i, 1)" aria-label="Move down"><qi-icon name="down" [size]="13" /></button>
              <button type="button" class="abtn abtn-sm" (click)="toggle(i)" [attr.aria-pressed]="r.visible">{{ r.visible ? 'Shown' : 'Hidden' }}</button>
              <button type="button" class="abtn abtn-sm abtn-danger" (click)="remove(i)" aria-label="Remove"><qi-icon name="trash" [size]="13" /></button>
            </div>
          </li>
        }
      </ul>
    }

    @if (picking() !== null) {
      <qi-media-picker kind="image" title="Choose a photo for this place" (picked)="picked($event)" (closed)="picking.set(null)" />
    }`,
})
export class AttractionsAdminComponent implements HasUnsavedChanges {
  private readonly api = inject(AdminApiService);
  protected readonly rows = signal<Row[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly dirty = signal(false);
  protected readonly picking = signal<number | null>(null);
  protected readonly message = signal<{ ok: boolean; text: string } | null>(null);

  constructor() {
    this.api.attractions().subscribe({
      next: (l) => { this.rows.set(l.map((a) => this.toRow(a))); this.loading.set(false); },
      error: (e) => { this.loading.set(false); this.message.set({ ok: false, text: apiError(e) }); },
    });
  }

  hasUnsavedChanges(): boolean { return this.dirty() && !this.saving(); }

  @HostListener('window:beforeunload', ['$event'])
  protected onUnload(e: BeforeUnloadEvent): void { if (this.dirty()) e.preventDefault(); }

  private toRow(a: AttractionAdmin): Row {
    return { id: a.id, name: a.name, distanceKm: a.distanceKm, description: a.description ?? '', media: a.media, visible: a.visible };
  }

  protected touch(): void { this.dirty.set(true); this.message.set(null); }
  protected thumb(m: MediaItem): string { return thumbUrl(m, 480); }

  private mutate(fn: (rows: Row[]) => Row[]): void { this.rows.update(fn); this.touch(); }
  protected add(): void { this.mutate((r) => [...r, { name: '', distanceKm: null, description: '', media: null, visible: true }]); }
  protected remove(i: number): void { this.mutate((r) => r.filter((_, k) => k !== i)); }
  protected toggle(i: number): void { this.mutate((r) => r.map((x, k) => (k === i ? { ...x, visible: !x.visible } : x))); }
  protected move(i: number, d: -1 | 1): void {
    this.mutate((r) => { const j = i + d; if (j < 0 || j >= r.length) return r; const c = [...r]; [c[i], c[j]] = [c[j], c[i]]; return c; });
  }

  protected choose(i: number): void { this.picking.set(i); }
  protected clearPhoto(i: number): void { this.mutate((r) => r.map((x, k) => (k === i ? { ...x, media: null } : x))); }
  protected picked(m: MediaItem): void {
    const i = this.picking();
    this.picking.set(null);
    if (i !== null) this.mutate((r) => r.map((x, k) => (k === i ? { ...x, media: m } : x)));
  }

  protected save(): void {
    this.saving.set(true);
    this.message.set(null);
    this.api.saveAttractions(this.rows().map((r) => ({
      id: r.id, name: r.name, distanceKm: r.distanceKm ?? 0, description: r.description, mediaId: r.media?.id ?? null, visible: r.visible,
    }))).subscribe({
      next: (l) => { this.rows.set(l.map((a) => this.toRow(a))); this.dirty.set(false); this.saving.set(false); this.message.set({ ok: true, text: 'Saved. The website shows these places now.' }); },
      error: (e) => { this.saving.set(false); this.message.set({ ok: false, text: apiError(e) }); },
    });
  }
}
