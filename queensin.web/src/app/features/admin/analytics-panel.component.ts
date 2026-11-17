import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Analytics, AdminApiService } from '../../core/services/admin-api.service';

type Preset = 'today' | '7' | '30' | '90' | '365' | 'custom';

const DAY = 86_400_000;
/** Today's date in India (the hotel's calendar), as yyyy-mm-dd. */
const istToday = (): string => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
const shift = (iso: string, days: number): string => new Date(Date.parse(iso + 'T00:00:00Z') + days * DAY).toISOString().slice(0, 10);

/**
 * Website traffic for the admin dashboard: page views and visitors for today, 7, 30, 90 days, 12 months or any dates,
 * compared with the period just before. Counted by our own server without cookies, so there is no consent banner.
 */
@Component({
  selector: 'qi-analytics-panel',
  imports: [DecimalPipe, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card mb-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <b class="font-medium">Website traffic</b>
          <p class="mt-0.5 text-[13px] text-[#6B7485]">{{ rangeText() }}</p>
        </div>
        <div class="flex flex-wrap gap-1.5" role="group" aria-label="Period">
          @for (p of presets; track p.key) {
            <button type="button" class="abtn" [class.abtn-pri]="preset() === p.key" (click)="choose(p.key)">{{ p.label }}</button>
          }
        </div>
      </div>

      @if (preset() === 'custom') {
        <div class="mt-3 flex flex-wrap items-end gap-3">
          <label class="text-[13px] text-[#6B7485]">From<input type="date" class="mt-1 block" [(ngModel)]="customFrom" [max]="today" /></label>
          <label class="text-[13px] text-[#6B7485]">To<input type="date" class="mt-1 block" [(ngModel)]="customTo" [max]="today" /></label>
          <button type="button" class="abtn abtn-pri" [disabled]="!customFrom || !customTo" (click)="load()">Show</button>
        </div>
      }

      @if (error()) {
        <p class="mt-4 text-[13px] text-[#B42318]">{{ error() }}</p>
      } @else if (data(); as d) {
        <div class="mt-4 grid grid-cols-2 gap-3 md:max-w-[520px]">
          <div class="rounded-lg border border-[#EEF0F3] p-3">
            <div class="text-[12px] uppercase tracking-[.08em] text-[#6B7485]">Page views</div>
            <div class="mt-1 text-[26px] font-medium leading-none">{{ d.current.views | number }}</div>
            <div class="mt-1.5 text-[12.5px]" [class]="deltaClass(d.current.views, d.previous.views)">{{ delta(d.current.views, d.previous.views) }}</div>
          </div>
          <div class="rounded-lg border border-[#EEF0F3] p-3">
            <div class="text-[12px] uppercase tracking-[.08em] text-[#6B7485]">Visitors</div>
            <div class="mt-1 text-[26px] font-medium leading-none">{{ d.current.visitors | number }}</div>
            <div class="mt-1.5 text-[12.5px]" [class]="deltaClass(d.current.visitors, d.previous.visitors)">{{ delta(d.current.visitors, d.previous.visitors) }}</div>
          </div>
        </div>

        @if (d.current.views === 0) {
          <p class="mt-4 text-[13px] text-[#6B7485]">No visits counted in this period yet. Counting started when this feature went live, and your own visits while signed in are not counted.</p>
        } @else {
          <figure class="m-0 mt-5">
            <svg class="block h-[170px] w-full" viewBox="0 0 600 170" preserveAspectRatio="none" role="img" aria-label="Page views and visitors over time">
              @for (g of grid(); track g.y) {
                <line x1="0" x2="600" [attr.y1]="g.y" [attr.y2]="g.y" stroke="#EEF0F3" stroke-width="1" vector-effect="non-scaling-stroke" />
              }
              @for (b of bars(); track b.i) {
                <g>
                  <title>{{ b.tip }}</title>
                  <rect [attr.x]="b.x" [attr.y]="b.yViews" [attr.width]="b.w" [attr.height]="b.hViews" fill="var(--color-accent, #C9A24B)" opacity=".45" />
                  <rect [attr.x]="b.x" [attr.y]="b.yVisitors" [attr.width]="b.w" [attr.height]="b.hVisitors" fill="var(--color-primary, #1F3A5F)" />
                </g>
              }
            </svg>
            <div class="mt-1 flex justify-between text-[11.5px] text-[#6B7485]">
              @for (t of ticks(); track $index) { <span>{{ t }}</span> }
            </div>
            <figcaption class="mt-2 flex flex-wrap gap-4 text-[12px] text-[#6B7485]">
              <span><i class="mr-1.5 inline-block h-2.5 w-2.5 align-baseline" style="background:var(--color-accent,#C9A24B);opacity:.45"></i>Page views</span>
              <span><i class="mr-1.5 inline-block h-2.5 w-2.5 align-baseline" style="background:var(--color-primary,#1F3A5F)"></i>Visitors</span>
              <span>Peak {{ peak() | number }} views in one {{ d.bucket }}</span>
            </figcaption>
          </figure>

          <div class="mt-5 grid gap-5 md:grid-cols-3">
            <div>
              <h3 class="mb-2 text-[12px] font-medium uppercase tracking-[.1em] text-[#6B7485]">Top pages</h3>
              @for (r of d.topPages; track r.label) {
                <div class="flex justify-between gap-3 border-t border-[#EEF0F3] py-1.5 text-[13.5px]"><span class="min-w-0 truncate">{{ r.label === '/' ? 'Home (/)' : r.label }}</span><b class="font-medium">{{ r.views | number }}</b></div>
              }
            </div>
            <div>
              <h3 class="mb-2 text-[12px] font-medium uppercase tracking-[.1em] text-[#6B7485]">Where visitors came from</h3>
              @for (r of d.referrers; track r.label) {
                <div class="flex justify-between gap-3 border-t border-[#EEF0F3] py-1.5 text-[13.5px]"><span class="min-w-0 truncate">{{ r.label || 'Direct or unknown' }}</span><b class="font-medium">{{ r.views | number }}</b></div>
              }
            </div>
            <div>
              <h3 class="mb-2 text-[12px] font-medium uppercase tracking-[.1em] text-[#6B7485]">Devices</h3>
              @for (r of d.devices; track r.label) {
                <div class="flex justify-between gap-3 border-t border-[#EEF0F3] py-1.5 text-[13.5px]"><span>{{ r.label }} <span class="text-[#6B7485]">· {{ share(r.views, d.current.views) }}%</span></span><b class="font-medium">{{ r.views | number }}</b></div>
              }
            </div>
          </div>
        }
        <p class="mt-4 text-[12px] text-[#6B7485]">Visitors are counted per day without cookies or personal details, so someone who returns on another day counts again. Search-engine crawlers and signed-in staff are left out. Dates follow India time.</p>
      } @else {
        <p class="mt-4 text-[13px] text-[#6B7485]">Loading…</p>
      }
    </section>`,
})
export class AnalyticsPanelComponent {
  private readonly api = inject(AdminApiService);

  protected readonly presets: { key: Preset; label: string }[] = [
    { key: 'today', label: 'Today' }, { key: '7', label: '7 days' }, { key: '30', label: '30 days' },
    { key: '90', label: '90 days' }, { key: '365', label: '12 months' }, { key: 'custom', label: 'Custom' },
  ];
  protected readonly today = istToday();
  protected readonly preset = signal<Preset>('30');
  protected readonly data = signal<Analytics | null>(null);
  protected readonly error = signal('');
  protected customFrom = shift(istToday(), -29);
  protected customTo = istToday();

  protected readonly rangeText = computed(() => {
    const d = this.data();
    if (!d) return '';
    const f = (s: string) => new Date(s + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
    return d.from === d.to ? f(d.from) : `${f(d.from)} to ${f(d.to)}`;
  });

  protected readonly peak = computed(() => Math.max(0, ...(this.data()?.series.map((s) => s.views) ?? [])));

  private readonly geometry = computed(() => {
    const s = this.data()?.series ?? [];
    const max = Math.max(1, ...s.map((p) => p.views));
    const slot = 600 / Math.max(1, s.length);
    const w = Math.max(1, slot * 0.72);
    const h = 160;
    return s.map((p, i) => {
      const hViews = (p.views / max) * h;
      const hVisitors = (p.visitors / max) * h;
      return {
        i, x: i * slot + (slot - w) / 2, w, hViews, hVisitors, yViews: 165 - hViews, yVisitors: 165 - hVisitors,
        tip: `${this.labelFor(p.label)}: ${p.views} views, ${p.visitors} visitors`,
      };
    });
  });
  protected readonly bars = this.geometry;
  protected readonly grid = computed(() => [5, 45, 85, 125, 165].map((y) => ({ y })));
  protected readonly ticks = computed(() => {
    const s = this.data()?.series ?? [];
    if (s.length === 0) return [];
    const n = Math.min(s.length, 6);
    return Array.from({ length: n }, (_, k) => this.labelFor(s[Math.round((k * (s.length - 1)) / Math.max(1, n - 1))].label, true));
  });

  constructor() { this.load(); }

  protected choose(p: Preset): void {
    this.preset.set(p);
    if (p !== 'custom') this.load();
  }

  protected load(): void {
    const t = istToday();
    let from = t, to = t;
    switch (this.preset()) {
      case 'today': break;
      case 'custom': from = this.customFrom; to = this.customTo; break;
      default: from = shift(t, -(Number(this.preset()) - 1));
    }
    this.error.set('');
    this.api.analytics(from, to).subscribe({
      next: (d) => this.data.set(d),
      error: (e) => this.error.set(e?.error?.message ?? 'The traffic figures could not be loaded.'),
    });
  }

  protected share(part: number, total: number): number { return total ? Math.round((part / total) * 100) : 0; }

  protected delta(now: number, before: number): string {
    if (before === 0) return now === 0 ? 'No change' : 'New: nothing in the period before';
    const pct = Math.round(((now - before) / before) * 100);
    return `${pct > 0 ? '▲' : pct < 0 ? '▼' : ''} ${Math.abs(pct)}% vs the period before (${before.toLocaleString('en-IN')})`;
  }

  protected deltaClass(now: number, before: number): string {
    return now > before ? 'text-[#067647]' : now < before ? 'text-[#B42318]' : 'text-[#6B7485]';
  }

  private labelFor(label: string, short = false): string {
    if (label.length === 7) return new Date(label + '-01T00:00:00Z').toLocaleDateString('en-GB', { month: 'short', year: short ? '2-digit' : 'numeric', timeZone: 'UTC' });
    return new Date(label + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  }
}
