import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, shareReplay } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import { ApiResponse } from '../models/api.model';

export interface Policy {
  slug: string;
  title: string;
  /** Already sanitised on the server (headings, paragraphs, lists, links, bold and italic only). */
  bodyHtml: string;
}

/** Terms, cancellation and privacy text for the public pages. Null if the API has none. */
@Injectable({ providedIn: 'root' })
export class PolicyService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, Observable<Policy | null>>();

  get(slug: string): Observable<Policy | null> {
    let req = this.cache.get(slug);
    if (!req) {
      req = this.http.get<ApiResponse<Policy>>(`${API_BASE_URL}/policies/${slug}`).pipe(
        map((r) => r.data ?? null),
        catchError(() => of(null)),
        shareReplay(1),
      );
      this.cache.set(slug, req);
    }
    return req;
  }
}
