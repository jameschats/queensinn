import { ChangeDetectionStrategy, Component, ElementRef, forwardRef, input, signal, viewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IconComponent } from './icon.component';

/**
 * A date box that reads and shows day/month/year (31/12/2026), which is how guests here write dates; the browser's own date box follows
 * the device language and often shows month first. The form value stays yyyy-mm-dd, so nothing changes for the server.
 * The calendar button opens the browser's picker. Incomplete, impossible or too-early dates give an empty value, so a `required` field stays invalid.
 */
@Component({
  selector: 'qi-date',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DateFieldComponent), multi: true }],
  template: `
    <span class="relative block">
      <input type="text" inputmode="numeric" autocomplete="off" placeholder="dd/mm/yyyy" maxlength="10" class="w-full pr-9"
             [attr.name]="name()" [attr.aria-invalid]="bad() ? 'true' : null" [value]="text()"
             (input)="typed($any($event.target).value)" (blur)="touched()" />
      <button type="button" class="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-ink" aria-label="Choose from calendar" (click)="openPicker()">
        <qi-icon name="cal" [size]="18" />
      </button>
      <input #pick type="date" class="pointer-events-none absolute bottom-0 right-0 h-0 w-0 opacity-0" tabindex="-1" aria-hidden="true"
             [attr.min]="min() || null" [value]="iso()" (change)="picked($any($event.target).value)" />
    </span>
    @if (bad()) { <small class="mt-1 block text-[13px] text-[#B42318]">{{ bad() }}</small> }`,
})
export class DateFieldComponent implements ControlValueAccessor {
  readonly name = input('');
  /** Earliest allowed date, yyyy-mm-dd. */
  readonly min = input('');

  protected readonly text = signal('');
  protected readonly iso = signal('');
  protected readonly bad = signal('');
  private readonly pick = viewChild<ElementRef<HTMLInputElement>>('pick');
  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(v: string | null): void {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v ?? '');
    this.iso.set(m ? v! : '');
    this.text.set(m ? `${m[3]}/${m[2]}/${m[1]}` : '');
    this.bad.set('');
  }
  registerOnChange(fn: (v: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }

  protected touched(): void { this.onTouched(); }

  protected typed(raw: string): void {
    // Keep only digits and add the slashes as the guest types.
    const d = raw.replace(/\D/g, '').slice(0, 8);
    const shown = d.length > 4 ? `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}` : d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
    this.text.set(shown);
    if (d.length < 8) { this.set('', ''); return; }
    const day = +d.slice(0, 2), month = +d.slice(2, 4), year = +d.slice(4);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) { this.set('', 'That date does not exist.'); return; }
    const iso = `${d.slice(4)}-${d.slice(2, 4)}-${d.slice(0, 2)}`;
    if (this.min() && iso < this.min()) { this.set('', 'Please choose today or a later date.'); return; }
    this.set(iso, '');
  }

  protected picked(iso: string): void {
    if (!iso) return;
    this.text.set(`${iso.slice(8)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`);
    this.set(iso, '');
  }

  protected openPicker(): void {
    const el = this.pick()?.nativeElement;
    if (!el) return;
    try { el.showPicker(); } catch { el.focus(); }
  }

  private set(iso: string, bad: string): void {
    this.iso.set(iso);
    this.bad.set(bad);
    this.onChange(iso);
  }
}
