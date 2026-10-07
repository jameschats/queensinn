import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HasUnsavedChanges } from '../../../core/guards/admin.guards';
import { apiError } from '../../../core/models/api.model';
import { AdminApiService } from '../../../core/services/admin-api.service';

/**
 * Edits a policy page's text. Staff type plain text or use the buttons to add headings, bold, lists and links;
 * the server keeps only that small set of formatting, so pasted-in scripts or styles are removed on save.
 */
@Component({
  selector: 'qi-policy-editor',
  imports: [FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div>
        <a routerLink="/admin/pages" class="text-[13px] text-[#6B7485] hover:underline">← All pages</a>
        <h1 class="mt-1 text-[22px] font-medium">{{ title || 'Policy page' }}</h1>
        <p class="mt-0.5 text-[13.5px] text-[#6B7485]">Website address: <b class="font-medium text-[#1D2430]">/{{ slug }}</b></p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        @if (dirty()) { <span class="pill pill-warn">Unsaved changes</span> }
        <a [href]="'/' + slug" target="_blank" rel="noopener" class="abtn">View page</a>
        <button type="button" class="abtn abtn-pri" [disabled]="saving() || loading() || !dirty()" (click)="save()">{{ saving() ? 'Saving…' : 'Save changes' }}</button>
      </div>
    </header>

    @if (message(); as m) { <p class="alert mb-4" [class.alert-ok]="m.ok" role="status">{{ m.text }}</p> }

    @if (loading()) {
      <div class="card text-[#6B7485]">Loading…</div>
    } @else {
      <div class="grid gap-5 xl:grid-cols-2">
        <section class="card">
          <label class="alabel">Page heading
            <input class="ainput" [(ngModel)]="title" (ngModelChange)="touch()" maxlength="150" name="title" />
          </label>
          <div class="mb-2 mt-4 flex flex-wrap gap-1.5" role="toolbar" aria-label="Formatting">
            <button type="button" class="abtn abtn-sm" (click)="wrap('<h2>', '</h2>')">Heading</button>
            <button type="button" class="abtn abtn-sm" (click)="wrap('<h3>', '</h3>')">Subheading</button>
            <button type="button" class="abtn abtn-sm font-bold" (click)="wrap('<strong>', '</strong>')">Bold</button>
            <button type="button" class="abtn abtn-sm italic" (click)="wrap('<em>', '</em>')">Italic</button>
            <button type="button" class="abtn abtn-sm" (click)="list()">Bullet list</button>
            <button type="button" class="abtn abtn-sm" (click)="link()">Link</button>
          </div>
          <textarea #box class="ainput font-mono !text-[13px]" rows="22" [(ngModel)]="body" (ngModelChange)="touch()" name="body" aria-label="Page text"></textarea>
          <p class="ahint mt-2">Select some text, then use a button to format it. Paragraphs are written as &lt;p&gt;…&lt;/p&gt;. Only headings, paragraphs, lists, links, bold and italic are kept.</p>
        </section>

        <section class="card">
          <b class="mb-3 block font-medium">Preview</b>
          <h2 class="mb-4 text-[24px]">{{ title }}</h2>
          <div class="policy-body" [innerHTML]="body"></div>
        </section>
      </div>
    }`,
})
export class PolicyEditorComponent implements HasUnsavedChanges {
  private readonly api = inject(AdminApiService);
  protected readonly slug = inject(ActivatedRoute).snapshot.paramMap.get('slug') ?? '';
  private readonly box = viewChild<ElementRef<HTMLTextAreaElement>>('box');

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly dirty = signal(false);
  protected readonly message = signal<{ ok: boolean; text: string } | null>(null);
  protected title = '';
  protected body = '';

  constructor() {
    this.api.policies().subscribe({
      next: (list) => {
        const p = list.find((x) => x.slug === this.slug);
        if (p) { this.title = p.title; this.body = p.bodyHtml; }
        else this.message.set({ ok: false, text: 'That policy page was not found.' });
        this.loading.set(false);
      },
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

  protected touch(): void {
    this.dirty.set(true);
    this.message.set(null);
  }

  protected save(): void {
    this.saving.set(true);
    this.message.set(null);
    this.api.savePolicy(this.slug, { title: this.title, bodyHtml: this.body }).subscribe({
      next: (p) => {
        this.title = p.title;
        this.body = p.bodyHtml;          // what the server kept after cleaning
        this.dirty.set(false);
        this.saving.set(false);
        this.message.set({ ok: true, text: 'Saved. The website shows this text now.' });
      },
      error: (e) => { this.saving.set(false); this.message.set({ ok: false, text: apiError(e) }); },
    });
  }

  // --- formatting helpers: wrap the selected text in tags ---

  protected wrap(open: string, close: string): void {
    this.edit((sel) => `${open}${sel || 'text'}${close}`);
  }

  protected list(): void {
    this.edit((sel) => {
      const items = (sel || 'First item\nSecond item').split('\n').map((l) => l.trim()).filter(Boolean);
      return `<ul>\n${items.map((i) => `  <li>${i}</li>`).join('\n')}\n</ul>`;
    });
  }

  protected link(): void {
    const url = prompt('Where should the link go? (https://…, mailto:…, or tel:…)');
    if (url) this.edit((sel) => `<a href="${url.replace(/"/g, '')}">${sel || 'link text'}</a>`);
  }

  private edit(transform: (selected: string) => string): void {
    const el = this.box()?.nativeElement;
    if (!el) return;
    const [a, b] = [el.selectionStart, el.selectionEnd];
    this.body = this.body.slice(0, a) + transform(this.body.slice(a, b)) + this.body.slice(b);
    this.touch();
  }
}
