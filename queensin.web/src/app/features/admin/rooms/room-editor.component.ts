import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HasUnsavedChanges } from '../../../core/guards/admin.guards';
import { thumbUrl } from '../../../core/media-url';
import { apiError } from '../../../core/models/api.model';
import { MediaItem } from '../../../core/models/content.model';
import { AdminApiService, AmenityAdmin, RoomAdmin, SaveRoom } from '../../../core/services/admin-api.service';
import { IconComponent } from '../../../shared/icon.component';
import { MediaPickerComponent } from '../media/media-picker.component';

type Target = 'featured' | 'gallery';

/** One room category: its words, numbers, photos and amenities. `/admin/rooms/new` adds a room. */
@Component({
  selector: 'qi-room-editor',
  imports: [FormsModule, RouterLink, IconComponent, MediaPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div>
        <a routerLink="/admin/rooms" class="text-[13px] text-[#6B7485] hover:underline">← All rooms</a>
        <h1 class="mt-1 text-[22px] font-medium">{{ isNew ? 'Add a room' : (form.name || 'Room') }}</h1>
        @if (!isNew && room(); as r) { <p class="mt-0.5 text-[13px] text-[#6B7485]">Website key: <b class="font-medium text-[#1D2430]">{{ r.slug }}</b> (never changes when you rename the room)</p> }
      </div>
      <div class="flex flex-wrap items-center gap-2">
        @if (dirty()) { <span class="pill pill-warn">Unsaved changes</span> }
        <button type="button" class="abtn abtn-pri" [disabled]="saving() || loading() || (!dirty() && !isNew)" (click)="save()">{{ saving() ? 'Saving…' : (isNew ? 'Add room' : 'Save changes') }}</button>
      </div>
    </header>

    @if (message(); as m) { <p class="alert mb-4" [class.alert-ok]="m.ok" role="status">{{ m.text }}</p> }

    @if (loading()) {
      <div class="card text-[#6B7485]">Loading…</div>
    } @else {
      <div class="grid gap-5">
        <section class="card">
          <b class="mb-3 block font-medium">About the room</b>
          <div class="grid gap-4">
            <label class="alabel">Room name<input class="ainput" [(ngModel)]="form.name" (ngModelChange)="touch()" name="name" maxlength="120" /></label>
            <label class="alabel">Short line under the name<input class="ainput" [(ngModel)]="form.tagline" (ngModelChange)="touch()" name="tagline" maxlength="200" placeholder="e.g. Garden views for two" /></label>
            <label class="alabel">Description<textarea class="ainput" rows="5" [(ngModel)]="form.description" (ngModelChange)="touch()" name="description" maxlength="3000"></textarea>
              <span class="ahint">A few sentences on who the room suits and what it feels like. {{ (form.description || '').length }} / 3000</span></label>
          </div>
        </section>

        <section class="card">
          <b class="mb-3 block font-medium">Details and price</b>
          <div class="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label class="alabel">Size (sq ft)<input class="ainput" type="number" min="50" max="5000" [(ngModel)]="form.sizeSqFt" (ngModelChange)="touch()" name="size" /></label>
            <label class="alabel">Beds<input class="ainput" [(ngModel)]="form.bedType" (ngModelChange)="touch()" name="bed" maxlength="80" placeholder="e.g. King bed" /></label>
            <label class="alabel">View<input class="ainput" [(ngModel)]="form.viewType" (ngModelChange)="touch()" name="view" maxlength="80" placeholder="e.g. Garden view" /></label>
            <label class="alabel">Most guests<input class="ainput" type="number" min="1" max="20" [(ngModel)]="form.maxGuests" (ngModelChange)="touch()" name="guests" /></label>
            <label class="alabel">Standard rate per night (₹)<input class="ainput" type="number" min="0" [(ngModel)]="form.startingTariff" (ngModelChange)="touch()" name="tariff" />
              <span class="ahint">Leave blank to show no price.</span></label>
            <label class="alabel">Tax note<input class="ainput" [(ngModel)]="form.taxNote" (ngModelChange)="touch()" name="tax" maxlength="60" placeholder="+ GST" /></label>
          </div>
          <label class="mt-4 flex items-center gap-2 text-[13.5px]"><input type="checkbox" [(ngModel)]="form.isActive" (ngModelChange)="touch()" name="active" />Show this room on the website</label>
        </section>

        <section class="card">
          <b class="mb-1 block font-medium">Photos</b>
          <p class="ahint mb-4">The main photo is used in lists and on the home page. Extra photos appear as small pictures under it on the Stay page.</p>
          <div class="grid gap-5 lg:grid-cols-[260px_1fr]">
            <div>
              @if (featured(); as f) { <img class="aspect-[3/2] w-full rounded-md object-cover" [src]="thumb(f)" [alt]="f.altText || f.fileName" /> }
              @else { <div class="grid aspect-[3/2] w-full place-items-center rounded-md border border-dashed border-[#B8BFCC] bg-[#FBFBF9] text-[12.5px] text-[#6B7485]">No main photo</div> }
              <div class="mt-2 flex gap-2">
                <button type="button" class="abtn abtn-sm" (click)="choose('featured')">{{ featured() ? 'Change main photo' : 'Choose main photo' }}</button>
                @if (featured()) { <button type="button" class="abtn abtn-sm abtn-danger" (click)="featured.set(null); touch()">Remove</button> }
              </div>
            </div>
            <div>
              <ul class="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-3 p-0">
                @for (m of gallery(); track m.id; let i = $index) {
                  <li class="overflow-hidden rounded-md border border-[#E3E6EB] bg-white">
                    <img class="aspect-[4/3] w-full object-cover" [src]="thumb(m)" [alt]="m.altText || m.fileName" />
                    <div class="flex justify-between gap-1 p-1.5">
                      <button type="button" class="abtn abtn-sm" [disabled]="i === 0" (click)="moveGallery(i, -1)" aria-label="Move earlier"><qi-icon name="arrowL" [size]="12" /></button>
                      <button type="button" class="abtn abtn-sm" [disabled]="i === gallery().length - 1" (click)="moveGallery(i, 1)" aria-label="Move later"><qi-icon name="arrowR" [size]="12" /></button>
                      <button type="button" class="abtn abtn-sm abtn-danger" (click)="removeGallery(i)" aria-label="Remove"><qi-icon name="x" [size]="12" /></button>
                    </div>
                  </li>
                }
              </ul>
              <button type="button" class="abtn mt-3" (click)="choose('gallery')"><qi-icon name="plus" [size]="15" />Add more photos</button>
            </div>
          </div>
        </section>

        <section class="card">
          <b class="mb-1 block font-medium">Amenities</b>
          <p class="ahint mb-4">Tick everything this room has.</p>
          <ul class="m-0 grid list-none gap-x-6 gap-y-2.5 p-0 sm:grid-cols-2 lg:grid-cols-3">
            @for (a of amenities(); track a.id) {
              <li><label class="flex cursor-pointer items-center gap-2 text-[13.5px]"><input type="checkbox" [checked]="has(a.id)" (change)="toggleAmenity(a.id)" />{{ a.name }}</label></li>
            }
          </ul>
          <form class="mt-4 flex gap-2" (ngSubmit)="addAmenity()">
            <input class="ainput max-w-[280px]" name="newAmenity" [(ngModel)]="newAmenity" maxlength="80" placeholder="Something missing? e.g. Mini fridge" aria-label="New amenity" />
            <button type="submit" class="abtn" [disabled]="!newAmenity.trim()">Add to list</button>
          </form>
        </section>

        @if (!isNew) {
          <section class="card border-[#F4C7C3]">
            <b class="mb-1 block font-medium">Delete this room</b>
            <p class="ahint mb-3">Removes it from the website. Past enquiries about it are kept. To take it off the site without losing it, untick “Show this room” above instead.</p>
            <button type="button" class="abtn abtn-danger" [disabled]="saving()" (click)="remove()">Delete room</button>
          </section>
        }
      </div>
    }

    @if (picker(); as p) {
      <qi-media-picker kind="image" [title]="p === 'featured' ? 'Choose the main photo' : 'Add photos — tick as many as you like'" [multi]="p === 'gallery'"
                       (picked)="picked($event)" (pickedMany)="pickedMany($event)" (closed)="picker.set(null)" />
    }`,
})
export class RoomEditorComponent implements HasUnsavedChanges {
  private readonly api = inject(AdminApiService);
  private readonly router = inject(Router);
  private readonly idParam = inject(ActivatedRoute).snapshot.paramMap.get('id');

  protected readonly isNew = this.idParam === 'new';
  protected readonly room = signal<RoomAdmin | null>(null);
  protected readonly amenities = signal<AmenityAdmin[]>([]);
  protected readonly featured = signal<MediaItem | null>(null);
  protected readonly gallery = signal<MediaItem[]>([]);
  protected readonly amenityIds = signal<number[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly dirty = signal(false);
  protected readonly picker = signal<Target | null>(null);
  protected readonly message = signal<{ ok: boolean; text: string } | null>(null);
  protected newAmenity = '';
  protected form = { name: '', tagline: '', description: '', sizeSqFt: null as number | null, bedType: '', viewType: '', maxGuests: 2, startingTariff: null as number | null, taxNote: '+ GST', isActive: true };
  protected readonly canSave = computed(() => this.form.name.trim().length >= 2);

  constructor() {
    this.api.amenities().subscribe((a) => this.amenities.set(a));
    if (this.isNew) { this.loading.set(false); this.dirty.set(true); return; }
    this.api.room(Number(this.idParam)).subscribe({
      next: (r) => { this.load(r); this.loading.set(false); },
      error: (e) => { this.loading.set(false); this.message.set({ ok: false, text: apiError(e) }); },
    });
  }

  hasUnsavedChanges(): boolean { return this.dirty() && !this.saving(); }

  @HostListener('window:beforeunload', ['$event'])
  protected onUnload(e: BeforeUnloadEvent): void { if (this.dirty()) e.preventDefault(); }

  private load(r: RoomAdmin): void {
    this.room.set(r);
    this.form = {
      name: r.name, tagline: r.tagline ?? '', description: r.description ?? '', sizeSqFt: r.sizeSqFt, bedType: r.bedType ?? '', viewType: r.viewType ?? '',
      maxGuests: r.maxGuests, startingTariff: r.startingTariff, taxNote: r.taxNote ?? '', isActive: r.isActive,
    };
    this.featured.set(r.featured);
    this.gallery.set(r.images);
    this.amenityIds.set(r.amenityIds);
    this.dirty.set(false);
  }

  protected touch(): void { this.dirty.set(true); this.message.set(null); }

  protected thumb(m: MediaItem): string { return thumbUrl(m, 480); }
  protected has(id: number): boolean { return this.amenityIds().includes(id); }
  protected toggleAmenity(id: number): void {
    this.amenityIds.update((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
    this.touch();
  }

  protected addAmenity(): void {
    const name = this.newAmenity.trim();
    if (!name) return;
    this.api.createAmenity(name).subscribe({
      next: (a) => {
        this.amenities.update((l) => (l.some((x) => x.id === a.id) ? l : [...l, a]));
        if (!this.has(a.id)) this.toggleAmenity(a.id);
        this.newAmenity = '';
      },
      error: (e) => this.message.set({ ok: false, text: apiError(e) }),
    });
  }

  // --- photos ---

  protected choose(t: Target): void { this.picker.set(t); }
  protected picked(m: MediaItem): void { this.featured.set(m); this.picker.set(null); this.touch(); }
  protected pickedMany(items: MediaItem[]): void {
    this.gallery.update((l) => [...l, ...items.filter((m) => !l.some((x) => x.id === m.id))]);
    this.picker.set(null);
    this.touch();
  }
  protected removeGallery(i: number): void { this.gallery.update((l) => l.filter((_, k) => k !== i)); this.touch(); }
  protected moveGallery(i: number, d: -1 | 1): void {
    this.gallery.update((l) => { const j = i + d; if (j < 0 || j >= l.length) return l; const c = [...l]; [c[i], c[j]] = [c[j], c[i]]; return c; });
    this.touch();
  }

  // --- save / delete ---

  protected save(): void {
    if (!this.canSave()) { this.message.set({ ok: false, text: 'Please give the room a name.' }); return; }
    const f = this.form;
    const body: SaveRoom = {
      name: f.name, tagline: f.tagline, description: f.description, sizeSqFt: f.sizeSqFt || null, bedType: f.bedType, viewType: f.viewType,
      maxGuests: f.maxGuests, startingTariff: f.startingTariff === null || (f.startingTariff as unknown) === '' ? null : f.startingTariff, taxNote: f.taxNote, isActive: f.isActive,
      featuredMediaId: this.featured()?.id ?? null, imageIds: this.gallery().map((m) => m.id), amenityIds: this.amenityIds(),
    };
    this.saving.set(true);
    this.message.set(null);
    const req = this.isNew ? this.api.createRoom(body) : this.api.saveRoom(Number(this.idParam), body);
    req.subscribe({
      next: (r) => {
        this.saving.set(false);
        this.dirty.set(false);
        if (this.isNew) { this.router.navigate(['/admin/rooms', r.id]); return; }
        this.load(r);
        this.message.set({ ok: true, text: 'Saved. The website shows this room now.' });
      },
      error: (e) => { this.saving.set(false); this.message.set({ ok: false, text: apiError(e) }); },
    });
  }

  protected remove(): void {
    const r = this.room();
    if (!r || !confirm(`Delete “${r.name}”? It disappears from the website. Past enquiries are kept.`)) return;
    this.saving.set(true);
    this.api.deleteRoom(r.id).subscribe({
      next: () => { this.dirty.set(false); this.router.navigate(['/admin/rooms']); },
      error: (e) => { this.saving.set(false); this.message.set({ ok: false, text: apiError(e) }); },
    });
  }
}
