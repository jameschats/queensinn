import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { apiError } from '../../../core/models/api.model';
import { AdminApiService, EnquiryDetail, EnquirySummary } from '../../../core/services/admin-api.service';
import { EnquiryCountsService } from '../../../core/services/enquiry-counts.service';
import { SiteService } from '../../../core/services/site.service';
import { IconComponent } from '../../../shared/icon.component';

const STATUSES = ['New', 'Contacted', 'Confirmed', 'Lost'] as const;
const TYPE_LABEL: Record<string, string> = { Room: 'Room', Mahal: 'KVR Mahal', Contact: 'Message' };

/**
 * The enquiry inbox: every room, event and contact enquiry from the website, newest first. Staff can filter, open one,
 * call / WhatsApp / email the guest in one tap, move it through New → Contacted → Confirmed (or Lost), and keep notes.
 */
@Component({
  selector: 'qi-enquiries',
  imports: [FormsModule, DatePipe, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-[22px] font-medium">Enquiries</h1>
        <p class="mt-0.5 text-[13.5px] text-[#6B7485]">Everything guests send from the website. Reply quickly: the first to answer usually wins the booking.</p>
      </div>
      <button type="button" class="abtn" (click)="reload()">Refresh</button>
    </header>

    <div class="mb-4 flex flex-wrap items-center gap-2">
      @for (s of tabs; track s.v) {
        <button type="button" class="abtn abtn-sm" [class.abtn-pri]="status() === s.v" (click)="setStatus(s.v)">
          {{ s.label }}@if (s.v && counts.counts()?.byStatus?.[s.v] !== undefined) { <span class="ml-1 opacity-70">{{ counts.counts()!.byStatus[s.v] }}</span> }
        </button>
      }
      <select class="ainput !h-[30px] !w-auto !py-0 text-[12.5px]" [ngModel]="type()" (ngModelChange)="setType($event)" aria-label="Type">
        <option value="">All types</option><option value="Room">Room</option><option value="Mahal">KVR Mahal</option><option value="Contact">Messages</option>
      </select>
      <input class="ainput !h-[30px] !w-[210px] !py-0 text-[12.5px]" type="search" placeholder="Search name, phone, email" [ngModel]="query()" (ngModelChange)="setQuery($event)" aria-label="Search" />
    </div>

    <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <!-- list -->
      <div class="min-w-0" [class.hidden]="selected() && mobileDetail()" [class.lg:block]="true">
        @if (loading() && !items().length) {
          <div class="card text-[#6B7485]">Loading…</div>
        } @else if (!items().length) {
          <div class="card text-center text-[#6B7485]">No enquiries here yet.</div>
        } @else {
          <ul class="m-0 grid list-none gap-2 p-0">
            @for (e of items(); track e.id) {
              <li>
                <button type="button" (click)="open(e.id)"
                        class="block w-full rounded-lg border bg-white p-3.5 text-left transition-shadow hover:shadow-md"
                        [class]="selected()?.id === e.id ? 'border-[var(--color-accent)] shadow-md' : 'border-[#E3E6EB]'">
                  <span class="flex items-center justify-between gap-2">
                    <b class="truncate font-medium">{{ e.name }}</b>
                    <span class="pill" [class.pill-warn]="e.status === 'New'" [class.pill-ok]="e.status === 'Confirmed'">{{ e.status }}</span>
                  </span>
                  <span class="mt-0.5 block truncate text-[13px] text-[#4A5465]">{{ label(e.type) }} · {{ e.detail }}</span>
                  <span class="mt-1 block text-[12px] text-[#6B7485]">{{ e.reference }} · {{ e.createdAt + 'Z' | date: 'd MMM, h:mm a' }}</span>
                </button>
              </li>
            }
          </ul>
          @if (items().length < total()) {
            <div class="mt-3 text-center"><button type="button" class="abtn" [disabled]="loading()" (click)="more()">Load more</button></div>
          }
        }
      </div>

      <!-- detail -->
      <div class="min-w-0" [class.hidden]="!selected() && !loadingDetail()" [class.lg:block]="true">
        @if (selected(); as d) {
          <section class="card lg:sticky lg:top-6">
            <button type="button" class="abtn abtn-sm mb-3 lg:hidden" (click)="closeDetail()">← All enquiries</button>
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 class="text-[19px] font-medium">{{ d.name }}</h2>
                <p class="mt-0.5 text-[12.5px] text-[#6B7485]">{{ d.reference }} · {{ label(d.type) }} · received {{ d.createdAt + 'Z' | date: 'd MMM y, h:mm a' }}</p>
              </div>
              <span class="pill" [class.pill-warn]="d.status === 'New'" [class.pill-ok]="d.status === 'Confirmed'">{{ d.status }}</span>
            </div>

            <div class="mt-4 flex flex-wrap gap-2">
              <a class="abtn abtn-pri" [href]="'tel:' + phoneDigits(d.phone)"><qi-icon name="phone" [size]="15" />Call</a>
              <a class="abtn" [href]="whatsapp(d)" target="_blank" rel="noopener"><qi-icon name="wa" [size]="15" />WhatsApp</a>
              @if (d.email) { <a class="abtn" [href]="'mailto:' + d.email + '?subject=' + encode('Your enquiry ' + d.reference + ' — Hotel Queen\\'s Inn')"><qi-icon name="mail" [size]="15" />Email</a> }
            </div>
            <p class="mt-2 text-[13px] text-[#4A5465]">{{ d.phone }}@if (d.email) { · {{ d.email }} }</p>

            <dl class="mt-4 grid gap-x-6 gap-y-2 border-t border-[#EEF0F3] pt-4 text-[13.5px] sm:grid-cols-2">
              @for (r of rows(d); track r[0]) { <div><dt class="text-[12px] text-[#6B7485]">{{ r[0] }}</dt><dd class="m-0">{{ r[1] }}</dd></div> }
            </dl>
            @if (d.message) {
              <div class="mt-4 rounded-md bg-[#F7F8FA] p-3 text-[13.5px] whitespace-pre-line">{{ d.message }}</div>
            }

            <div class="mt-5">
              <span class="text-[12px] font-medium uppercase tracking-wider text-[#6B7485]">Status</span>
              <div class="mt-1.5 flex flex-wrap gap-1.5">
                @for (s of statuses; track s) {
                  <button type="button" class="abtn abtn-sm" [class.abtn-pri]="d.status === s" [disabled]="busy()" (click)="setStatusOf(d, s)">{{ s }}</button>
                }
              </div>
            </div>

            <div class="mt-5">
              <span class="text-[12px] font-medium uppercase tracking-wider text-[#6B7485]">Notes</span>
              @if (d.notes.length) {
                <ul class="m-0 mt-2 grid list-none gap-2 p-0">
                  @for (n of d.notes; track n.id) {
                    <li class="rounded-md border border-[#EEF0F3] p-2.5 text-[13.5px]"><span class="whitespace-pre-line">{{ n.note }}</span>
                      <span class="mt-1 block text-[11.5px] text-[#6B7485]">{{ n.by || 'Staff' }} · {{ n.createdAt + 'Z' | date: 'd MMM, h:mm a' }}</span></li>
                  }
                </ul>
              }
              <form class="mt-2 flex gap-2" (ngSubmit)="addNote(d)">
                <input class="ainput" name="note" [(ngModel)]="note" maxlength="2000" placeholder="e.g. Called, ground-floor room held till 6 pm" aria-label="Add a note" />
                <button class="abtn abtn-pri" type="submit" [disabled]="busy() || !note.trim()">Add</button>
              </form>
            </div>

            @if (message(); as m) { <p class="alert mt-3" [class.alert-ok]="m.ok" role="status">{{ m.text }}</p> }
            <div class="mt-5 border-t border-[#EEF0F3] pt-3 text-right"><button type="button" class="abtn abtn-sm abtn-danger" [disabled]="busy()" (click)="remove(d)">Delete enquiry</button></div>
          </section>
        } @else if (loadingDetail()) {
          <div class="card text-[#6B7485]">Loading…</div>
        } @else {
          <div class="card hidden text-center text-[#6B7485] lg:block">Choose an enquiry to see its details.</div>
        }
      </div>
    </div>`,
})
export class EnquiriesComponent {
  private readonly api = inject(AdminApiService);
  protected readonly counts = inject(EnquiryCountsService);
  private readonly site = inject(SiteService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly statuses = STATUSES;
  protected readonly tabs: { v: string; label: string }[] = [{ v: '', label: 'All' }, ...STATUSES.map((s) => ({ v: s, label: s }))];

  protected readonly items = signal<EnquirySummary[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly status = signal('New');
  protected readonly type = signal('');
  protected readonly query = signal('');
  protected readonly selected = signal<EnquiryDetail | null>(null);
  protected readonly loadingDetail = signal(false);
  protected readonly busy = signal(false);
  protected readonly message = signal<{ ok: boolean; text: string } | null>(null);
  /** On phones the detail replaces the list instead of sitting beside it. */
  protected readonly mobileDetail = computed(() => this.selected() !== null);
  protected note = '';

  private page = 1;
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    this.destroyRef.onDestroy(() => clearTimeout(this.timer));
    this.counts.refresh();
    this.reload();
  }

  protected label(t: string): string { return TYPE_LABEL[t] ?? t; }
  protected encode(s: string): string { return encodeURIComponent(s); }
  protected phoneDigits(p: string): string { return p.replace(/[^\d+]/g, ''); }

  /** wa.me wants country code and digits only; a bare 10-digit Indian number gets 91 in front. */
  protected whatsapp(d: EnquiryDetail): string {
    let n = d.phone.replace(/\D/g, '');
    if (n.length === 10) n = '91' + n;
    const text = `Hello ${d.name.split(' ')[0]}, this is ${this.site.get('HotelName') || "Queen's Inn"} about your enquiry ${d.reference}.`;
    return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
  }

  protected rows(d: EnquiryDetail): string[][] {
    const fmt = (s: string | null) => (s ? new Date(s + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
    const r: (string | null)[][] = [];
    if (d.type === 'Room') r.push(['Room', d.roomName ?? 'Any room'], ['Check-in', fmt(d.checkIn)], ['Check-out', fmt(d.checkOut)], ['Guests', d.guests]);
    if (d.type === 'Mahal') r.push(['Event', d.eventType], ['Event date', fmt(d.eventDate)], ['Alternative date', fmt(d.altDate)], ['Expected guests', d.guestCount], ['Rooms needed', d.roomsNeeded]);
    if (d.type === 'Contact') r.push(['Subject', d.subject]);
    r.push(['Sent from', d.sourcePage]);
    return r.filter((x): x is string[] => !!x[1]);
  }

  // --- list ---

  protected reload(): void {
    this.page = 1;
    this.fetch(true);
    this.counts.refresh();
  }

  private fetch(replace: boolean): void {
    this.loading.set(true);
    this.api.enquiries({ status: this.status() || undefined, type: this.type() || undefined, q: this.query() || undefined, page: this.page, pageSize: 25 }).subscribe({
      next: (r) => { this.items.update((c) => (replace ? r.items : [...c, ...r.items])); this.total.set(r.totalCount); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  protected more(): void { this.page++; this.fetch(false); }
  protected setStatus(s: string): void { this.status.set(s); this.reload(); }
  protected setType(t: string): void { this.type.set(t); this.reload(); }
  protected setQuery(q: string): void { this.query.set(q); clearTimeout(this.timer); this.timer = setTimeout(() => this.reload(), 350); }

  // --- detail ---

  protected open(id: number): void {
    this.loadingDetail.set(true);
    this.message.set(null);
    this.note = '';
    this.api.enquiry(id).subscribe({
      next: (d) => { this.selected.set(d); this.loadingDetail.set(false); },
      error: (e) => { this.loadingDetail.set(false); this.message.set({ ok: false, text: apiError(e) }); },
    });
  }

  protected closeDetail(): void { this.selected.set(null); }

  protected setStatusOf(d: EnquiryDetail, s: string): void {
    if (d.status === s) return;
    this.busy.set(true);
    this.api.setEnquiryStatus(d.id, s).subscribe({
      next: (u) => {
        this.selected.set(u);
        this.items.update((l) => l.map((x) => (x.id === u.id ? { ...x, status: u.status } : x)));
        // a filtered list no longer contains an enquiry that moved to another status
        if (this.status() && this.status() !== u.status) { this.items.update((l) => l.filter((x) => x.id !== u.id)); this.total.update((t) => Math.max(0, t - 1)); }
        this.counts.refresh();
        this.busy.set(false);
        this.message.set({ ok: true, text: `Marked ${s}.` });
      },
      error: (e) => { this.busy.set(false); this.message.set({ ok: false, text: apiError(e) }); },
    });
  }

  protected addNote(d: EnquiryDetail): void {
    if (!this.note.trim()) return;
    this.busy.set(true);
    this.api.addEnquiryNote(d.id, this.note).subscribe({
      next: (u) => { this.selected.set(u); this.note = ''; this.busy.set(false); this.message.set(null); },
      error: (e) => { this.busy.set(false); this.message.set({ ok: false, text: apiError(e) }); },
    });
  }

  protected remove(d: EnquiryDetail): void {
    if (!confirm(`Delete the enquiry from ${d.name} (${d.reference})? This removes it and its notes for good.`)) return;
    this.busy.set(true);
    this.api.deleteEnquiry(d.id).subscribe({
      next: () => {
        this.items.update((l) => l.filter((x) => x.id !== d.id));
        this.total.update((t) => Math.max(0, t - 1));
        this.selected.set(null);
        this.busy.set(false);
        this.counts.refresh();
      },
      error: (e) => { this.busy.set(false); this.message.set({ ok: false, text: apiError(e) }); },
    });
  }
}
