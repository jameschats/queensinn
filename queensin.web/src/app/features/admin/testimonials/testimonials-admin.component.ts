import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HasUnsavedChanges } from '../../../core/guards/admin.guards';
import { apiError } from '../../../core/models/api.model';
import { AdminApiService, TestimonialAdmin } from '../../../core/services/admin-api.service';
import { IconComponent } from '../../../shared/icon.component';

interface Row { id?: number; quote: string; guestName: string; origin: string; visible: boolean }

/** The guest quotes that rotate in the dark band on the home page. */
@Component({
  selector: 'qi-testimonials-admin',
  imports: [FormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-[22px] font-medium">Guest quotes</h1>
        <p class="mt-0.5 max-w-[70ch] text-[13.5px] text-[#6B7485]">Short words from guests, shown one at a time on the home page. Only use quotes from real guests, and ask their permission first. The three starting quotes are examples; replace them.</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        @if (dirty()) { <span class="pill pill-warn">Unsaved changes</span> }
        <button type="button" class="abtn" (click)="add()"><qi-icon name="plus" [size]="15" />Add a quote</button>
        <button type="button" class="abtn abtn-pri" [disabled]="saving() || loading() || !dirty()" (click)="save()">{{ saving() ? 'Saving…' : 'Save changes' }}</button>
      </div>
    </header>

    @if (message(); as m) { <p class="alert mb-4" [class.alert-ok]="m.ok" role="status">{{ m.text }}</p> }

    @if (loading()) {
      <div class="card text-[#6B7485]">Loading…</div>
    } @else if (!rows().length) {
      <div class="card text-center text-[#6B7485]">No quotes, so the quote band is hidden on the website. Add one to show it.</div>
    } @else {
      <ul class="m-0 grid list-none gap-3 p-0">
        @for (r of rows(); track $index; let i = $index) {
          <li class="card grid gap-3 !p-3 md:grid-cols-[1fr_auto]" [class.opacity-60]="!r.visible">
            <div class="grid gap-2.5">
              <label class="alabel">Quote<textarea class="ainput" rows="3" maxlength="600" [(ngModel)]="r.quote" (ngModelChange)="touch()" [name]="'q' + i"></textarea>
                <span class="ahint">{{ r.quote.length }} / 600</span></label>
              <div class="grid gap-2.5 sm:grid-cols-2">
                <label class="alabel">Guest name<input class="ainput" maxlength="120" [(ngModel)]="r.guestName" (ngModelChange)="touch()" [name]="'g' + i" placeholder="e.g. Merlin D'Souza, or just Guest" /></label>
                <label class="alabel">From (optional)<input class="ainput" maxlength="120" [(ngModel)]="r.origin" (ngModelChange)="touch()" [name]="'o' + i" placeholder="e.g. Bengaluru" /></label>
              </div>
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
    }`,
})
export class TestimonialsAdminComponent implements HasUnsavedChanges {
  private readonly api = inject(AdminApiService);
  protected readonly rows = signal<Row[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly dirty = signal(false);
  protected readonly message = signal<{ ok: boolean; text: string } | null>(null);

  constructor() {
    this.api.testimonials().subscribe({
      next: (l) => { this.rows.set(l.map((t) => this.toRow(t))); this.loading.set(false); },
      error: (e) => { this.loading.set(false); this.message.set({ ok: false, text: apiError(e) }); },
    });
  }

  hasUnsavedChanges(): boolean { return this.dirty() && !this.saving(); }

  @HostListener('window:beforeunload', ['$event'])
  protected onUnload(e: BeforeUnloadEvent): void { if (this.dirty()) e.preventDefault(); }

  private toRow(t: TestimonialAdmin): Row { return { id: t.id, quote: t.quote, guestName: t.guestName, origin: t.origin ?? '', visible: t.visible }; }
  protected touch(): void { this.dirty.set(true); this.message.set(null); }
  private mutate(fn: (r: Row[]) => Row[]): void { this.rows.update(fn); this.touch(); }
  protected add(): void { this.mutate((r) => [...r, { quote: '', guestName: '', origin: '', visible: true }]); }
  protected remove(i: number): void { this.mutate((r) => r.filter((_, k) => k !== i)); }
  protected toggle(i: number): void { this.mutate((r) => r.map((x, k) => (k === i ? { ...x, visible: !x.visible } : x))); }
  protected move(i: number, d: -1 | 1): void {
    this.mutate((r) => { const j = i + d; if (j < 0 || j >= r.length) return r; const c = [...r]; [c[i], c[j]] = [c[j], c[i]]; return c; });
  }

  protected save(): void {
    this.saving.set(true);
    this.message.set(null);
    this.api.saveTestimonials(this.rows().map((r) => ({ id: r.id, quote: r.quote, guestName: r.guestName, origin: r.origin, visible: r.visible }))).subscribe({
      next: (l) => { this.rows.set(l.map((t) => this.toRow(t))); this.dirty.set(false); this.saving.set(false); this.message.set({ ok: true, text: 'Saved. The website shows these quotes now.' }); },
      error: (e) => { this.saving.set(false); this.message.set({ ok: false, text: apiError(e) }); },
    });
  }
}
