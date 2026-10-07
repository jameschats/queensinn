import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { thumbUrl } from '../../../core/media-url';
import { apiError } from '../../../core/models/api.model';
import { AdminApiService, RoomAdmin } from '../../../core/services/admin-api.service';
import { IconComponent } from '../../../shared/icon.component';

/** The room categories, in the order guests see them. Reordering and hiding save immediately. */
@Component({
  selector: 'qi-rooms-admin',
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-[22px] font-medium">Rooms</h1>
        <p class="mt-0.5 text-[13.5px] text-[#6B7485]">The room categories on the Stay page and the home page: names, prices, descriptions, photos and amenities.</p>
      </div>
      <a routerLink="/admin/rooms/new" class="abtn abtn-pri"><qi-icon name="plus" [size]="15" />Add a room</a>
    </header>

    @if (message(); as m) { <p class="alert mb-4" [class.alert-ok]="m.ok" role="status">{{ m.text }}</p> }

    @if (loading()) {
      <div class="card text-[#6B7485]">Loading…</div>
    } @else if (!rooms().length) {
      <div class="card text-center text-[#6B7485]">No rooms yet. Add the first one.</div>
    } @else {
      <ul class="m-0 grid list-none gap-3 p-0">
        @for (r of rooms(); track r.id; let i = $index) {
          <li class="card grid items-center gap-4 !p-3 sm:grid-cols-[150px_1fr_auto]" [class.opacity-60]="!r.isActive">
            @if (r.featured) { <img class="aspect-[3/2] w-full rounded-md object-cover" [src]="thumb(r)" [alt]="r.featured.altText || r.name" /> }
            @else { <div class="grid aspect-[3/2] w-full place-items-center rounded-md border border-dashed border-[#B8BFCC] text-[12px] text-[#6B7485]">No photo</div> }
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <b class="font-medium">{{ r.name }}</b>
                @if (!r.isActive) { <span class="pill">Hidden</span> }
              </div>
              <p class="m-0 mt-0.5 text-[13px] text-[#4A5465]">{{ r.tagline || 'No tagline' }}</p>
              <p class="m-0 mt-0.5 text-[12.5px] text-[#6B7485]">
                {{ r.startingTariff ? '₹' + r.startingTariff.toLocaleString('en-IN') + ' ' + (r.taxNote || '') : 'No price shown' }} · up to {{ r.maxGuests }} guests ·
                {{ r.images.length }} photo{{ r.images.length === 1 ? '' : 's' }} · {{ r.amenityIds.length }} amenities
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-1.5 sm:justify-end">
              <button type="button" class="abtn abtn-sm" [disabled]="i === 0 || busy()" (click)="move(i, -1)" aria-label="Move up"><qi-icon name="up" [size]="13" /></button>
              <button type="button" class="abtn abtn-sm" [disabled]="i === rooms().length - 1 || busy()" (click)="move(i, 1)" aria-label="Move down"><qi-icon name="down" [size]="13" /></button>
              <a [routerLink]="['/admin/rooms', r.id]" class="abtn abtn-pri abtn-sm"><qi-icon name="edit" [size]="13" />Edit</a>
            </div>
          </li>
        }
      </ul>
    }`,
})
export class RoomsAdminComponent {
  private readonly api = inject(AdminApiService);
  protected readonly rooms = signal<RoomAdmin[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly message = signal<{ ok: boolean; text: string } | null>(null);

  constructor() {
    this.api.rooms().subscribe({
      next: (r) => { this.rooms.set(r); this.loading.set(false); },
      error: (e) => { this.loading.set(false); this.message.set({ ok: false, text: apiError(e) }); },
    });
  }

  protected thumb(r: RoomAdmin): string { return thumbUrl(r.featured!, 480); }

  protected move(i: number, d: -1 | 1): void {
    const list = [...this.rooms()];
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    const before = this.rooms();
    this.rooms.set(list);
    this.busy.set(true);
    this.api.reorderRooms(list.map((r) => r.id)).subscribe({
      next: () => { this.busy.set(false); this.message.set({ ok: true, text: 'Order saved. The website shows it now.' }); },
      error: (e) => { this.rooms.set(before); this.busy.set(false); this.message.set({ ok: false, text: apiError(e) }); },
    });
  }
}
