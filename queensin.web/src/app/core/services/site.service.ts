import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import { ApiResponse } from '../models/api.model';
import { fontStack, googleFontsUrl } from '../models/fonts';
import { DEFAULT_SETTINGS, DEFAULT_THEME, SiteData, Theme } from '../models/site.model';

/**
 * Site settings + theme, loaded once at app start (SSR and browser). The theme is written
 * as CSS variables on <html>, so the server-rendered page already has the admin's colours
 * and there is no flash of the defaults.
 */
@Injectable({ providedIn: 'root' })
export class SiteService {
  private readonly http = inject(HttpClient);
  private readonly doc = inject(DOCUMENT);

  readonly settings = signal<Record<string, string>>({ ...DEFAULT_SETTINGS });
  readonly theme = signal<Theme>(DEFAULT_THEME);

  readonly hotelName = computed(() => this.get('HotelName'));
  readonly whatsappUrl = computed(() => this.whatsapp());

  load(): Observable<void> {
    return this.http.get<ApiResponse<SiteData>>(`${API_BASE_URL}/site`).pipe(
      tap((r) => {
        if (!r.data) return;
        const merged: Record<string, string> = { ...DEFAULT_SETTINGS };
        for (const [k, v] of Object.entries(r.data.settings)) if (v) merged[k] = v;
        this.settings.set(merged);
        this.applyTheme(r.data.theme);
      }),
      map(() => void 0),
      // The site must render even if the API is down; defaults cover everything.
      catchError(() => {
        this.applyTheme(DEFAULT_THEME);
        return of(void 0);
      }),
    );
  }

  get(key: string): string {
    return this.settings()[key] ?? '';
  }

  /** wa.me link with an optional pre-filled message. */
  whatsapp(message?: string): string {
    const text = message || this.get('WhatsAppMessage');
    return `https://wa.me/${this.get('WhatsAppNumber')}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
  }

  tel(key: 'Phone1' | 'Phone2' = 'Phone1'): string {
    return 'tel:' + this.get(key).replace(/\s/g, '');
  }

  applyTheme(theme: Theme): void {
    this.theme.set(theme);
    const style = this.doc.documentElement.style;
    style.setProperty('--color-primary', theme.primary);
    style.setProperty('--color-accent', theme.accent);
    style.setProperty('--color-surface', theme.surface);

    // Typography. --font-weight-light is Tailwind's font-light, so the many `font-light`
    // utilities follow the admin's body weight instead of staying hairline.
    style.setProperty('--font-serif', fontStack(theme.headingFont));
    style.setProperty('--font-sans', fontStack(theme.bodyFont));
    style.setProperty('--heading-weight', String(theme.headingWeight));
    style.setProperty('--body-weight', String(theme.bodyWeight));
    style.setProperty('--font-weight-light', String(theme.bodyWeight));
    style.setProperty('--base-size', `${theme.baseSize}px`);
    style.setProperty('--font-scale', String(theme.baseSize / DEFAULT_THEME.baseSize));
    this.setFontLink('qi-fonts', googleFontsUrl([
      { name: theme.headingFont, role: 'heading' },
      { name: theme.bodyFont, role: 'body' },
    ]));
  }

  /** Loads extra families so the admin can show them in previews before they are chosen. */
  preloadFonts(names: string[]): void {
    if (names.length) this.setFontLink('qi-fonts-preview', googleFontsUrl(names.map((name) => ({ name, role: 'heading' as const }))));
  }

  private setFontLink(id: string, href: string): void {
    const head = this.doc.head;
    let link = head.querySelector<HTMLLinkElement>(`link#${id}`);
    if (!link) {
      link = this.doc.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      head.appendChild(link);
    }
    if (link.getAttribute('href') !== href) link.setAttribute('href', href);
  }

  /** Called by the admin screens after a successful save. */
  patchSettings(settings: Record<string, string | null>): void {
    const merged: Record<string, string> = { ...this.settings() };
    for (const [k, v] of Object.entries(settings)) {
      if (v) merged[k] = v;
      else delete merged[k];
    }
    this.settings.set({ ...DEFAULT_SETTINGS, ...merged });
  }
}
