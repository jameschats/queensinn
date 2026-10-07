import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FieldDef, PageDef, SectionDef, pageDef } from '../../../core/content/page-schemas';
import { HasUnsavedChanges } from '../../../core/guards/admin.guards';
import { fileUrl, thumbUrl } from '../../../core/media-url';
import { apiError } from '../../../core/models/api.model';
import { MediaItem } from '../../../core/models/content.model';
import { AdminApiService, PageEdit } from '../../../core/services/admin-api.service';
import { IconComponent } from '../../../shared/icon.component';
import { MediaPickerComponent } from '../media/media-picker.component';

type Tab = 'hero' | 'content' | 'photos' | 'seo';

interface PickerRequest {
  kind: 'image' | 'video';
  title: string;
  apply: (m: MediaItem) => void;
}

/**
 * Edits one page: hero (photos, video, text), the page's text blocks, its in-page photos and its search/sharing
 * text. The fields come from core/content/page-schemas.ts; an empty field means "use the built-in wording",
 * which is shown as the placeholder so the editor always sees what visitors will read.
 */
@Component({
  selector: 'qi-page-editor',
  imports: [FormsModule, RouterLink, IconComponent, MediaPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './page-editor.component.html',
})
export class PageEditorComponent implements HasUnsavedChanges {
  private readonly api = inject(AdminApiService);
  private readonly route = inject(ActivatedRoute);

  protected readonly slug = this.route.snapshot.paramMap.get('slug') ?? '';
  protected readonly def: PageDef | undefined = pageDef(this.slug);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly message = signal<{ ok: boolean; text: string } | null>(null);
  protected readonly dirty = signal(false);
  protected readonly tab = signal<Tab>('hero');
  protected readonly picker = signal<PickerRequest | null>(null);

  // edit state
  protected values: Record<string, Record<string, string>> = {};
  protected metaTitle = '';
  protected metaDescription = '';
  protected readonly heroPhotos = signal<MediaItem[]>([]);
  protected readonly heroVideo = signal<MediaItem | null>(null);
  protected readonly ogImage = signal<MediaItem | null>(null);
  protected readonly slots = signal<Record<string, MediaItem | null>>({});

  protected readonly heroSection = computed(() => this.def?.sections.find((s) => s.key === 'hero'));
  protected readonly contentSections = computed(() => this.def?.sections.filter((s) => s.key !== 'hero') ?? []);
  protected readonly tabs = computed(() => {
    const d = this.def;
    if (!d) return [];
    return [
      { id: 'hero' as Tab, label: 'Hero' },
      ...(this.contentSections().length ? [{ id: 'content' as Tab, label: 'Page text' }] : []),
      ...(d.slots.length ? [{ id: 'photos' as Tab, label: 'Photos' }] : []),
      { id: 'seo' as Tab, label: 'Search & sharing' },
    ];
  });

  constructor() {
    if (!this.def) { this.loading.set(false); return; }
    this.api.page(this.slug).subscribe({
      next: (p) => { this.load(p); this.loading.set(false); },
      error: (e) => { this.loading.set(false); this.message.set({ ok: false, text: apiError(e) }); },
    });
  }

  hasUnsavedChanges(): boolean {
    return this.dirty();
  }

  @HostListener('window:beforeunload', ['$event'])
  protected onUnload(e: BeforeUnloadEvent): void {
    if (this.dirty()) e.preventDefault();
  }

  // --- loading / saving ---

  private load(p: PageEdit): void {
    const v: Record<string, Record<string, string>> = {};
    for (const s of this.def!.sections) {
      v[s.key] = {};
      for (const f of s.fields) v[s.key][f.key] = p.sections[s.key]?.[f.key] ?? '';
    }
    this.values = v;
    this.metaTitle = p.metaTitle ?? '';
    this.metaDescription = p.metaDescription ?? '';
    this.heroPhotos.set(p.heroPhotos);
    this.heroVideo.set(p.heroVideo);
    this.ogImage.set(p.ogImage);
    this.slots.set(Object.fromEntries(this.def!.slots.map((s) => [s.key, p.slots[s.key] ?? null])));
    this.dirty.set(false);
  }

  protected save(): void {
    const d = this.def!;
    const sections: Record<string, Record<string, string>> = {};
    for (const s of d.sections) sections[s.key] = { ...this.values[s.key] };
    // the hero video is stored beside the hero text
    if (d.hero === 'media') sections['hero']['videoMediaId'] = this.heroVideo() ? String(this.heroVideo()!.id) : '';

    this.saving.set(true);
    this.message.set(null);
    this.api.savePage(this.slug, {
      metaTitle: this.metaTitle,
      metaDescription: this.metaDescription,
      ogMediaId: this.ogImage()?.id ?? null,
      sections,
      heroMediaIds: d.hero === 'media' ? this.heroPhotos().map((m) => m.id) : undefined,
      slots: d.slots.length ? Object.fromEntries(Object.entries(this.slots()).map(([k, m]) => [k, m?.id ?? null])) : undefined,
    }).subscribe({
      next: (p) => {
        this.load(p);
        this.saving.set(false);
        this.message.set({ ok: true, text: 'Saved. The website shows these changes now.' });
      },
      error: (e) => {
        this.saving.set(false);
        this.message.set({ ok: false, text: apiError(e) });
      },
    });
  }

  protected touch(): void {
    this.dirty.set(true);
    this.message.set(null);
  }

  // --- field helpers ---

  protected reset(section: SectionDef, field: FieldDef): void {
    this.values[section.key][field.key] = '';
    this.touch();
  }

  protected isCustom(section: SectionDef, field: FieldDef): boolean {
    return (this.values[section.key]?.[field.key] ?? '') !== '';
  }

  // --- hero photos ---

  protected addHeroPhoto(): void {
    this.picker.set({
      kind: 'image', title: 'Add a hero photo',
      apply: (m) => { if (!this.heroPhotos().some((x) => x.id === m.id)) this.heroPhotos.update((l) => [...l, m]); this.touch(); },
    });
  }

  protected moveHeroPhoto(i: number, d: -1 | 1): void {
    this.heroPhotos.update((l) => {
      const j = i + d;
      if (j < 0 || j >= l.length) return l;
      const c = [...l];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });
    this.touch();
  }

  protected removeHeroPhoto(i: number): void {
    this.heroPhotos.update((l) => l.filter((_, k) => k !== i));
    this.touch();
  }

  // --- hero video ---

  protected chooseVideo(): void {
    this.picker.set({ kind: 'video', title: this.heroVideo() ? 'Replace the hero video' : 'Choose a hero video', apply: (m) => { this.heroVideo.set(m); this.touch(); } });
  }

  protected removeVideo(): void {
    this.heroVideo.set(null);
    this.touch();
  }

  // --- in-page photos / share image ---

  protected chooseSlot(key: string, label: string): void {
    this.picker.set({ kind: 'image', title: `Choose a photo — ${label}`, apply: (m) => { this.slots.update((s) => ({ ...s, [key]: m })); this.touch(); } });
  }

  protected clearSlot(key: string): void {
    this.slots.update((s) => ({ ...s, [key]: null }));
    this.touch();
  }

  protected chooseShare(): void {
    this.picker.set({ kind: 'image', title: 'Choose the sharing picture', apply: (m) => { this.ogImage.set(m); this.touch(); } });
  }

  protected clearShare(): void {
    this.ogImage.set(null);
    this.touch();
  }

  protected pick(m: MediaItem): void {
    this.picker()?.apply(m);
    this.picker.set(null);
  }

  // --- display ---

  protected thumb(m: MediaItem, w = 480): string { return thumbUrl(m, w); }
  protected file(m: MediaItem): string { return fileUrl(m); }
  protected slotImage(key: string): MediaItem | null { return this.slots()[key] ?? null; }
}
