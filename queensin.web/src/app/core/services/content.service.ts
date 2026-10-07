import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, shareReplay } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import { ApiResponse } from '../models/api.model';
import { EMPTY_CONTENT, PublicContent } from '../models/content.model';

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

  /** Signal holding the content; empty until the response arrives. */
  readonly content = toSignal(this.request$, { initialValue: EMPTY_CONTENT });
}
