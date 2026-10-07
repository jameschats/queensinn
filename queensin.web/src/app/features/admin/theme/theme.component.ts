import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { apiError } from '../../../core/models/api.model';
import {
  BODY_WEIGHTS, FONT_CATALOGUE, FONT_PAIRINGS, FontPairing, HEADING_WEIGHTS, TEXT_SIZES, findFont, fontStack,
} from '../../../core/models/fonts';
import { DEFAULT_THEME, THEME_PRESETS, Theme, contrast, isHex } from '../../../core/models/site.model';
import { AdminApiService } from '../../../core/services/admin-api.service';
import { SiteService } from '../../../core/services/site.service';
import { BrandComponent } from '../../../shared/brand.component';

type Key = 'primary' | 'accent' | 'surface';

/**
 * Edits the three theme colours and the typography with a live preview. Changes apply to this browser
 * immediately (so the preview and the admin chrome update); Save publishes them for every
 * visitor. Leaving without saving restores the published colours.
 */
@Component({
  selector: 'qi-theme',
  imports: [FormsModule, BrandComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './theme.component.html',
})
export class ThemeComponent {
  private readonly api = inject(AdminApiService);
  private readonly site = inject(SiteService);

  protected readonly presets = THEME_PRESETS;
  protected readonly pairings = FONT_PAIRINGS;
  protected readonly serifFonts = FONT_CATALOGUE.filter((f) => f.kind === 'serif');
  protected readonly sansFonts = FONT_CATALOGUE.filter((f) => f.kind === 'sans');
  protected readonly fontCount = FONT_CATALOGUE.length;
  protected readonly textSizes = TEXT_SIZES;
  protected readonly stack = fontStack;
  protected readonly fields: { key: Key; label: string; hint: string }[] = [
    { key: 'primary', label: 'Primary', hint: 'Header over images, dark sections, text' },
    { key: 'accent', label: 'Accent', hint: 'Fine lines, highlights and call-to-action details' },
    { key: 'surface', label: 'Surface', hint: 'Page background' },
  ];

  private readonly published = signal<Theme>(this.site.theme());
  protected readonly draft = signal<Theme>({ ...this.site.theme() });
  protected readonly saving = signal(false);
  protected readonly message = signal<{ ok: boolean; text: string } | null>(null);

  protected readonly dirty = computed(() => {
    const a = this.draft(), b = this.published();
    return (Object.keys(a) as (keyof Theme)[]).some((k) => a[k] !== b[k]);
  });

  /** Weights the chosen fonts actually have, so the list never offers a weight that would be faked. */
  protected readonly headingWeights = computed(() => this.weightsFor(this.draft().headingFont, HEADING_WEIGHTS));
  protected readonly bodyWeights = computed(() => this.weightsFor(this.draft().bodyFont, BODY_WEIGHTS));

  private readonly customRequested = signal(false);
  protected readonly matchedPairing = computed(() => {
    const d = this.draft();
    return this.pairings.find((p) => p.headingFont === d.headingFont && p.bodyFont === d.bodyFont) ?? null;
  });
  /** "Choose your own" is highlighted whenever the fonts are not one of the curated pairings. */
  protected readonly customOpen = computed(() => this.customRequested() || !this.matchedPairing());
  protected readonly textContrast = computed(() => contrast(this.draft().primary, this.draft().surface));
  protected readonly accentContrast = computed(() => contrast(this.draft().accent, this.draft().primary));

  constructor() {
    // Pairing cards render in their own fonts, so load them all for this screen.
    this.site.preloadFonts([...new Set(this.pairings.flatMap((p) => [p.headingFont, p.bodyFont]))]);
    // Unsaved changes must not leak onto the public site in this tab.
    inject(DestroyRef).onDestroy(() => this.site.applyTheme(this.published()));
  }

  protected set(key: Key, value: string): void {
    if (!isHex(value)) return;
    this.draft.update((t) => ({ ...t, [key]: value.toUpperCase() }));
    this.site.applyTheme(this.draft());
    this.message.set(null);
  }

  protected usePreset(p: Pick<Theme, 'primary' | 'accent' | 'surface'>): void {
    this.draft.update((t) => ({ ...t, primary: p.primary, accent: p.accent, surface: p.surface }));
    this.site.applyTheme(this.draft());
    this.message.set(null);
  }

  protected isPreset(p: Pick<Theme, 'primary' | 'accent' | 'surface'>): boolean {
    const d = this.draft();
    return p.primary === d.primary && p.accent === d.accent && p.surface === d.surface;
  }

  protected resetDefault(): void {
    this.customRequested.set(false);
    this.draft.set({ ...DEFAULT_THEME });
    this.site.applyTheme(this.draft());
    this.message.set(null);
  }

  // --- typography ---

  protected usePairing(p: FontPairing): void {
    this.customRequested.set(false);
    this.change({ headingFont: p.headingFont, bodyFont: p.bodyFont, headingWeight: p.headingWeight, bodyWeight: p.bodyWeight });
  }

  protected openCustom(): void {
    this.customRequested.set(true);
  }

  protected setFont(role: 'heading' | 'body', name: string): void {
    const f = findFont(name);
    if (!f) return;
    this.site.preloadFonts([name]);
    this.change(role === 'heading'
      ? { headingFont: name, headingWeight: this.nearest(f.weights, this.draft().headingWeight) }
      : { bodyFont: name, bodyWeight: this.nearest(f.weights, this.draft().bodyWeight) });
  }

  protected setWeight(role: 'heading' | 'body', value: string): void {
    this.change(role === 'heading' ? { headingWeight: +value } : { bodyWeight: +value });
  }

  protected setSize(value: string): void {
    this.change({ baseSize: +value });
  }

  private change(patch: Partial<Theme>): void {
    this.draft.update((t) => ({ ...t, ...patch }));
    this.site.applyTheme(this.draft());
    this.message.set(null);
  }

  private weightsFor(font: string, all: { value: number; label: string }[]) {
    const have = findFont(font)?.weights;
    const list = have ? all.filter((w) => have.includes(w.value)) : all;
    return list.length ? list : all;
  }

  private nearest(have: number[], target: number): number {
    return have.reduce((best, w) => (Math.abs(w - target) < Math.abs(best - target) ? w : best), have[0]);
  }

  protected discard(): void {
    this.draft.set({ ...this.published() });
    this.site.applyTheme(this.published());
  }

  protected save(): void {
    this.saving.set(true);
    this.api.saveTheme(this.draft()).subscribe({
      next: (t) => {
        this.published.set(t);
        this.draft.set({ ...t });
        this.site.applyTheme(t);
        this.saving.set(false);
        this.message.set({ ok: true, text: 'Saved. The website now uses these colours and fonts.' });
      },
      error: (e) => {
        this.saving.set(false);
        this.message.set({ ok: false, text: apiError(e) });
      },
    });
  }
}

