import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, shareReplay, take } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import { ApiResponse } from '../models/api.model';
import { defaultText, pageDef } from '../content/page-schemas';
import { EMPTY_CONTENT, PageContent, PublicContent } from '../models/content.model';

/**
 * Hero slides, rooms, gallery, attractions and quotes for the public pages, from one cached
 * API call. Server-side rendering waits for the request, so the HTML already contains the
 * photos. If the API is unreachable the pages still render, with themed artwork in place of photos.
 */
@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly http = inject(HttpClient);

  private readonly request$ = this.http.get<ApiResponse<PublicContent>>(`${API_BASE_URL}/content`).pipe(
    map((r) => r.data ?? EMPTY_CONTENT),
    catchError(() => of(EMPTY_CONTENT)),
    shareReplay(1),
  );

  /** Emits once the content has loaded. Route resolvers use it so a page renders complete (no late layout shifts). */
  whenLoaded() {
    return this.request$.pipe(take(1));
  }

  /** Signal holding the content; empty until the response arrives. */
  readonly content = toSignal(this.request$, { initialValue: EMPTY_CONTENT });

  /** What an admin has set for a page, or undefined if nothing is stored. */
  page(slug: string): PageContent | undefined {
    return this.content().pages[slug];
  }

  /** A text field: the admin's wording if they set one, otherwise the built-in default. */
  text(page: string, section: string, field: string): string {
    return this.content().pages[page]?.sections?.[section]?.[field] ?? defaultText(page, section, field);
  }

  /** Lines of a list-style field, each split on "|" and trimmed (e.g. "Lunch | 12:30"). */
  rows(page: string, section: string, field: string): string[][] {
    return this.text(page, section, field).split('\n').map((l) => l.trim()).filter(Boolean).map((l) => l.split('|').map((p) => p.trim()));
  }

  /** Title and description for a page's search-result and sharing tags. */
  seo(slug: string): { title: string; description: string; image?: string } {
    const def = pageDef(slug)?.seoDefaults;
    const p = this.content().pages[slug];
    return {
      title: p?.metaTitle || def?.title || '',
      description: p?.metaDescription || def?.description || '',
      image: p?.ogImage ? p.ogImage.url : undefined,
    };
  }
}
