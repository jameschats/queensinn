import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { absUrl } from '../../../core/api.config';
import { apiError } from '../../../core/models/api.model';
import { AdminApiService } from '../../../core/services/admin-api.service';
import { SiteService } from '../../../core/services/site.service';

interface Field {
  key: string;
  label: string;
  hint?: string;
  type?: 'text' | 'email' | 'tel' | 'url' | 'textarea';
  wide?: boolean;
}

interface Group {
  title: string;
  fields: Field[];
}

@Component({
  selector: 'qi-settings',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-6">
      <h1 class="text-[22px] font-medium">Site settings</h1>
      <p class="mt-0.5 text-[13.5px] text-[#6B7485]">Shown in the header, footer, enquiry forms and WhatsApp buttons.</p>
    </header>

    @if (loading()) {
      <div class="card text-[#6B7485]">Loading settings…</div>
    } @else {
      <form class="grid gap-5" (ngSubmit)="save()">
        @for (g of groups; track g.title) {
          <fieldset class="card">
            <legend class="sr-only">{{ g.title }}</legend>
            <b class="mb-4 block font-medium">{{ g.title }}</b>
            <div class="grid gap-4 md:grid-cols-2">
              @for (f of g.fields; track f.key) {
                <label class="alabel" [class.md:col-span-2]="f.wide || f.type === 'textarea'">{{ f.label }}
                  @if (f.type === 'textarea') {
                    <textarea class="ainput" [name]="f.key" [(ngModel)]="values[f.key]"></textarea>
                  } @else {
                    <input class="ainput" [type]="f.type ?? 'text'" [name]="f.key" [(ngModel)]="values[f.key]" />
                  }
                  @if (f.hint) { <span class="ahint">{{ f.hint }}</span> }
                </label>
              }
            </div>
          </fieldset>
        }
        <fieldset class="card">
          <legend class="sr-only">Favicon</legend>
          <b class="mb-1 block font-medium">Favicon</b>
          <p class="ahint mb-4">The small icon in the browser tab, bookmarks and phone home screens. Upload a square PNG, JPG or WebP of at least 192 × 192 px (512 × 512 is ideal); it is cropped to a square and resized automatically.</p>
          <div class="flex flex-wrap items-center gap-5">
            <img [src]="faviconPreview()" width="64" height="64" alt="Current favicon" class="h-16 w-16 rounded-[14px] border border-[#E3E6EB] bg-[#0F243E] object-cover" />
            <div class="grid gap-2">
              <span class="text-[13px] text-[#6B7485]">{{ values['FaviconUrl'] ? 'Custom favicon in use.' : 'Using the built-in crown icon.' }}</span>
              <div class="flex flex-wrap gap-2">
                <label class="abtn cursor-pointer" [class.opacity-60]="faviconBusy()">
                  {{ faviconBusy() ? 'Working…' : 'Upload new favicon' }}
                  <input type="file" accept="image/png,image/jpeg,image/webp" class="sr-only" [disabled]="faviconBusy()" (change)="pickFavicon($event)" />
                </label>
                @if (values['FaviconUrl']) { <button type="button" class="abtn" [disabled]="faviconBusy()" (click)="resetFavicon()">Use default</button> }
              </div>
            </div>
          </div>
          @if (faviconMessage(); as m) { <p class="alert mt-4" [class.alert-ok]="m.ok" role="status">{{ m.text }}</p> }
        </fieldset>
        @if (message(); as m) { <p class="alert" [class.alert-ok]="m.ok" role="status">{{ m.text }}</p> }
        <div class="flex justify-end"><button class="abtn abtn-pri" type="submit" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save settings' }}</button></div>
      </form>
    }`,
})
export class SettingsComponent {
  private readonly api = inject(AdminApiService);
  private readonly site = inject(SiteService);

  protected values: Record<string, string | null> = {};
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly message = signal<{ ok: boolean; text: string } | null>(null);
  protected readonly faviconBusy = signal(false);
  protected readonly faviconMessage = signal<{ ok: boolean; text: string } | null>(null);
  protected readonly faviconPreview = signal('/icon-192.png');

  protected readonly groups: Group[] = [
    {
      title: 'Identity',
      fields: [
        { key: 'HotelName', label: 'Hotel name', hint: 'Shown in the logo lockup.' },
        { key: 'LocationLine', label: 'Location line', hint: 'Small line under the name.' },
      ],
    },
    {
      title: 'Contact',
      fields: [
        { key: 'Phone1', label: 'Primary phone', type: 'tel' },
        { key: 'Phone2', label: 'Second phone (events desk)', type: 'tel' },
        { key: 'WhatsAppNumber', label: 'WhatsApp number', hint: 'Digits only, with country code, e.g. 919159399988.' },
        { key: 'WhatsAppMessage', label: 'Default WhatsApp message' },
        { key: 'ReservationsEmail', label: 'Reservations email', type: 'email' },
        { key: 'SalesEmail', label: 'Sales & events email', type: 'email' },
        { key: 'Address', label: 'Address', type: 'textarea' },
        { key: 'MapUrl', label: 'Google Maps link', type: 'url', wide: true },
      ],
    },
    {
      title: 'Stay',
      fields: [
        { key: 'CheckInTime', label: 'Check-in time' },
        { key: 'CheckOutTime', label: 'Check-out time' },
      ],
    },
    {
      title: 'Social',
      fields: [
        { key: 'FacebookUrl', label: 'Facebook', type: 'url' },
        { key: 'InstagramUrl', label: 'Instagram', type: 'url' },
        { key: 'YouTubeUrl', label: 'YouTube', type: 'url' },
      ],
    },
  ];

  constructor() {
    this.api.getSettings().subscribe({
      next: (s) => {
        this.values = { ...s };
        this.syncFavicon();
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.message.set({ ok: false, text: apiError(e) });
      },
    });
  }

  private syncFavicon(): void {
    const base = this.values['FaviconUrl'];
    this.faviconPreview.set(base ? `${absUrl(base)}-192.png` : '/icon-192.png');
  }

  protected pickFavicon(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.faviconBusy.set(true);
    this.faviconMessage.set(null);
    this.api.uploadFavicon(file).subscribe({
      next: (url) => this.afterFavicon(url, 'Favicon updated. Browsers may take a moment to show the new icon.'),
      error: (e) => { this.faviconBusy.set(false); this.faviconMessage.set({ ok: false, text: apiError(e) }); },
    });
  }

  protected resetFavicon(): void {
    this.faviconBusy.set(true);
    this.faviconMessage.set(null);
    this.api.resetFavicon().subscribe({
      next: () => this.afterFavicon(null, 'Back to the built-in crown icon.'),
      error: (e) => { this.faviconBusy.set(false); this.faviconMessage.set({ ok: false, text: apiError(e) }); },
    });
  }

  private afterFavicon(url: string | null, text: string): void {
    this.values = { ...this.values, FaviconUrl: url };
    this.site.patchSettings({ FaviconUrl: url });   // updates this tab's icon immediately
    this.syncFavicon();
    this.faviconBusy.set(false);
    this.faviconMessage.set({ ok: true, text });
  }

  protected save(): void {
    this.saving.set(true);
    this.message.set(null);
    const keys = this.groups.flatMap((g) => g.fields.map((f) => f.key));
    const body = Object.fromEntries(keys.map((k) => [k, this.values[k] ?? null]));
    this.api.saveSettings(body).subscribe({
      next: (s) => {
        this.values = { ...s };
        this.site.patchSettings(s);
        this.saving.set(false);
        this.message.set({ ok: true, text: 'Settings saved. The website shows them now.' });
      },
      error: (e) => {
        this.saving.set(false);
        this.message.set({ ok: false, text: apiError(e) });
      },
    });
  }
}
