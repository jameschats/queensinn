import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Thin-line icon set (24px grid, 1.25 stroke) shared by the site and admin. */
const PATHS: Record<string, string> = {
  bell: 'M4 18h16M5.5 18a6.5 6.5 0 0 1 13 0M12 9.5V8M10 7.5h4',
  wifi: 'M2.5 9a14 14 0 0 1 19 0M5.5 12.4a9.5 9.5 0 0 1 13 0M8.6 15.7a5 5 0 0 1 6.8 0M12 19.2v.01',
  snow: 'M12 2.5v19M4 7l16 10M4 17L20 7M9.5 4l2.5 2 2.5-2M9.5 20l2.5-2 2.5 2',
  bolt: 'M13 2.5 5 13.5h6l-1 8 8-11h-6z',
  car: 'M4 16.5V12l2-5h12l2 5v4.5zM4 12h16M7 16.5V19M17 16.5V19M7.5 14.2h.01M16.5 14.2h.01',
  bed: 'M3 19V7M3 14h18v5M21 14a3.5 3.5 0 0 0-3.5-3.5H11V14M7 12.2a1.6 1.6 0 1 0 0-.01',
  shield: 'M12 3l7.5 3v6c0 4.8-3.3 8-7.5 9-4.2-1-7.5-4.2-7.5-9V6zM9 12l2 2 4-4',
  phone: 'M5 3.5h3.5l1.5 4.5-2.2 1.4a11 11 0 0 0 6.8 6.8l1.4-2.2 4.5 1.5V19a1.5 1.5 0 0 1-1.6 1.5C10.6 20 4 13.4 3.5 5.1A1.5 1.5 0 0 1 5 3.5z',
  wa: 'M20 11.6a8.4 8.4 0 0 1-12.4 7.4L3.5 20.5l1.4-4A8.4 8.4 0 1 1 20 11.6zM9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-.9-.9 1a4.6 4.6 0 0 1-2.6-2.6l1-.9-.9-2z',
  mail: 'M3.5 6h17v12h-17zM3.5 6.5l8.5 6.5 8.5-6.5',
  pin: 'M12 21s7-6.3 7-11.5a7 7 0 0 0-14 0C5 14.7 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  dash: 'M4 4h7v8H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 14h7v6H4z',
  inbox: 'M3.5 13.5 6 5h12l2.5 8.5V19h-17zM3.5 13.5H9l1.2 2h3.6l1.2-2h5.5',
  image: 'M3.5 5h17v14h-17zM3.5 15.5l5-5 4 4 2.5-2.5 5.5 5.5M15.5 9.5h.01',
  palette: 'M12 3.5a8.5 8.5 0 0 0 0 17c1.2 0 1.6-.9 1.2-1.8-.5-1.1.2-2.2 1.4-2.2H17a3.5 3.5 0 0 0 3.5-3.5C20.5 7.2 16.7 3.5 12 3.5zM7.5 11h.01M10 7.5h.01M14.5 7.5h.01',
  cog: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 13.5l1.6 1.2-2 3.4-1.9-.7a7 7 0 0 1-2.1 1.2L14.7 21h-4l-.4-2.4a7 7 0 0 1-2.1-1.2l-1.9.7-2-3.4 1.6-1.2a7 7 0 0 1 0-2.4L4.3 9.9l2-3.4 1.9.7a7 7 0 0 1 2.1-1.2l.4-2.4h4l.4 2.4a7 7 0 0 1 2.1 1.2l1.9-.7 2 3.4-1.6 1.2a7 7 0 0 1 0 2.4z',
  users: 'M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 10a2.5 2.5 0 1 0 0-5M3 20a5.5 5.5 0 0 1 11 0M15.5 14.5A5 5 0 0 1 21 19.5',
  doc: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7',
  ext: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  out: 'M15 4h5v16h-5M10 8l-4 4 4 4M6 12h10',
  plus: 'M12 5v14M5 12h14',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  key: 'M14.5 9.5a4 4 0 1 1-1.2-2.8M13.3 6.7 20 13.5l-2 2-1.5-1.5-1.5 1.5-1.5-1.5M7.5 12a1 1 0 1 0 0-.01',
  tray: 'M3 18.5h18M5 18.5a7 7 0 0 1 14 0M12 9.5V7.5M10.5 7.5h3',
  people: 'M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 10a2.5 2.5 0 1 0 0-5M3 20a5.5 5.5 0 0 1 11 0M15.5 14.5A5 5 0 0 1 21 19.5',
  leaf: 'M5 19.5C5 10.5 11 5 20 4c-1 9-6 15.5-15 15.5zM5 19.5l8.5-8.5',
  sqft: 'M4 4h16v16H4zM4 9h5M15 4v5M9 20v-5',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 14.8a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6z',
  guest: 'M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM5 20a7 7 0 0 1 14 0',
  drop: 'M12 3.5s6 6.4 6 10.8a6 6 0 0 1-12 0C6 9.9 12 3.5 12 3.5z',
  quote: 'M10 7c-3 1-5 3.5-5 7v3h5v-5H7.5c0-2 1-3.5 3-4.3zM19 7c-3 1-5 3.5-5 7v3h5v-5h-2.5c0-2 1-3.5 3-4.3z',
  arrowL: 'M15 5l-7 7 7 7',
  arrowR: 'M9 5l7 7-7 7',
  up: 'M12 19V5M6 11l6-6 6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  stage: 'M3 20h18M5 20v-6h14v6M7 14V8a5 5 0 0 1 10 0v6',
  ac: 'M3 5h18v7H3zM6 9h12M7 15c0 2 2 2 2 4M12 15c0 2 2 2 2 4M17 15c0 2 2 2 2 4',
  sound: 'M4 9.5h3.5L12 5.5v13l-4.5-4H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11',
  pot: 'M4 10h16v3a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6zM2.5 10h19M9 4.5c0 1.5 1.5 1.5 1.5 3M13.5 4.5c0 1.5 1.5 1.5 1.5 3',
  flow: 'M4 7h12M13 4l3 3-3 3M20 17H8M11 14l-3 3 3 3',
  play: 'M8 5.5v13l11-6.5z',
  cal: 'M4 6h16v14H4zM4 10.5h16M8 3.5v4M16 3.5v4',
  menu: 'M4 7h16M4 12h16M4 17h16',
  x: 'M5 5l14 14M19 5L5 19',
};

@Component({
  selector: 'qi-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="d()" /></svg>`,
  styles: `:host { display: inline-flex; flex: none; }`,
})
export class IconComponent {
  readonly name = input.required<string>();
  readonly size = input(20);
  protected readonly d = computed(() => PATHS[this.name()] ?? '');
}

/** The crown mark used in the logo lockup. */
@Component({
  selector: 'qi-crown',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true">
    <path d="M7 29h26M8.5 29 6 13l8.5 7L20 8l5.5 12L34 13l-2.5 16" /><circle cx="6" cy="12" r="1.6" /><circle cx="20" cy="7" r="1.6" />
    <circle cx="34" cy="12" r="1.6" /><path d="M10 33h20" /></svg>`,
  styles: `:host { display: inline-flex; color: var(--color-accent); }`,
})
export class CrownComponent {
  readonly size = input(30);
}
