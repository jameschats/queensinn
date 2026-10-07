import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PAGES, POLICY_SLUGS } from '../../../core/content/page-schemas';
import { AdminApiService, PolicyEdit } from '../../../core/services/admin-api.service';
import { IconComponent } from '../../../shared/icon.component';

@Component({
  selector: 'qi-pages',
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-6">
      <h1 class="text-[22px] font-medium">Pages &amp; content</h1>
      <p class="mt-0.5 text-[13.5px] text-[#6B7485]">Choose a page to change its photos, video, headings, descriptions and search text. Changes appear on the website as soon as you save.</p>
    </header>

    <h2 class="mb-3 text-[13px] font-medium uppercase tracking-wider text-[#6B7485]">Website pages</h2>
    <ul class="m-0 mb-8 grid list-none gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3">
      @for (p of pages; track p.slug) {
        <li class="card flex flex-col !p-4">
          <b class="font-medium">{{ p.label }}</b>
          <span class="mt-0.5 text-[12.5px] text-[#6B7485]">{{ p.path }} · {{ p.hero === 'media' ? 'Photos, video & text' : 'Text' }}</span>
          <div class="mt-4 flex gap-2">
            <a [routerLink]="['/admin/pages', p.slug]" class="abtn abtn-pri"><qi-icon name="edit" [size]="15" />Edit page</a>
            <a [href]="p.path" target="_blank" rel="noopener" class="abtn"><qi-icon name="ext" [size]="15" />View</a>
          </div>
        </li>
      }
    </ul>

    <h2 class="mb-3 text-[13px] font-medium uppercase tracking-wider text-[#6B7485]">Policy pages</h2>
    <ul class="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3">
      @for (slug of policySlugs; track slug) {
        <li class="card flex flex-col !p-4">
          <b class="font-medium">{{ title(slug) }}</b>
          <span class="mt-0.5 text-[12.5px] text-[#6B7485]">/{{ slug }}@if (updated(slug); as u) { · saved {{ u }} }</span>
          <div class="mt-4 flex gap-2">
            <a [routerLink]="['/admin/policies', slug]" class="abtn abtn-pri"><qi-icon name="edit" [size]="15" />Edit text</a>
            <a [href]="'/' + slug" target="_blank" rel="noopener" class="abtn"><qi-icon name="ext" [size]="15" />View</a>
          </div>
        </li>
      }
    </ul>`,
})
export class PagesComponent {
  private readonly api = inject(AdminApiService);
  protected readonly pages = PAGES;
  protected readonly policySlugs = POLICY_SLUGS;
  private readonly policies = signal<PolicyEdit[]>([]);

  constructor() {
    this.api.policies().subscribe({ next: (p) => this.policies.set(p), error: () => {} });
  }

  protected title(slug: string): string {
    return this.policies().find((p) => p.slug === slug)?.title ?? slug.replace(/-/g, ' ');
  }

  protected updated(slug: string): string {
    const p = this.policies().find((x) => x.slug === slug);
    return p ? new Date(p.updatedAt + 'Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '';
  }
}
