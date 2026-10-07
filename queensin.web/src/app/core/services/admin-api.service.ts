import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import { ApiResponse } from '../models/api.model';
import { MediaItem } from '../models/content.model';
import { Theme } from '../models/site.model';

export interface StaffUser {
  userId: number;
  email: string;
  fullName?: string | null;
  phoneNumber?: string | null;
  roleId?: number | null;
  roleName?: string | null;
  isActive: boolean;
  allowGoogleSignIn: boolean;
  mustChangePassword: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
}

export interface Role {
  roleId: number;
  name: string;
  description?: string | null;
  permissions: string[];
}

/** Admin endpoints for Stage 2: settings, theme, staff users. */
@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/admin`;

  getSettings(): Observable<Record<string, string | null>> {
    return this.http.get<ApiResponse<Record<string, string | null>>>(`${this.base}/settings`).pipe(map((r) => r.data!));
  }

  saveSettings(settings: Record<string, string | null>): Observable<Record<string, string | null>> {
    return this.http.put<ApiResponse<Record<string, string | null>>>(`${this.base}/settings`, { settings }).pipe(map((r) => r.data!));
  }

  /** Upload a favicon image; the server crops it square and makes every size. Returns the stored base path. */
  uploadFavicon(file: File): Observable<string> {
    const body = new FormData();
    body.append('file', file);
    return this.http.post<ApiResponse<{ url: string }>>(`${this.base}/settings/favicon`, body).pipe(map((r) => r.data!.url));
  }

  resetFavicon(): Observable<void> {
    return this.http.delete<ApiResponse<unknown>>(`${this.base}/settings/favicon`).pipe(map(() => void 0));
  }

  // --- media library ---

  mediaList(p: { kind?: string; category?: string; q?: string; page?: number; pageSize?: number }): Observable<{ items: MediaItem[]; totalCount: number; page: number; pageSize: number }> {
    const params: Record<string, string> = {};
    for (const [k, v] of Object.entries(p)) if (v !== undefined && v !== '') params[k] = String(v);
    return this.http.get<ApiResponse<{ items: MediaItem[]; totalCount: number; page: number; pageSize: number }>>(`${this.base}/media`, { params }).pipe(map((r) => r.data!));
  }

  mediaCategories(): Observable<string[]> {
    return this.http.get<ApiResponse<string[]>>(`${this.base}/media/categories`).pipe(map((r) => r.data ?? []));
  }

  /** Photos go through the WebP pipeline; MP4/WebM videos are stored as uploaded. */
  uploadMedia(file: File, opts: { category?: string; altText?: string } = {}): Observable<MediaItem> {
    const body = new FormData();
    body.append('file', file);
    if (opts.category) body.append('category', opts.category);
    if (opts.altText) body.append('altText', opts.altText);
    const path = file.type.startsWith('video/') ? 'media/video' : 'media';
    return this.http.post<ApiResponse<MediaItem>>(`${this.base}/${path}`, body).pipe(map((r) => r.data!));
  }

  updateMedia(id: number, body: { altText: string; caption: string; category: string }): Observable<MediaItem> {
    return this.http.put<ApiResponse<MediaItem>>(`${this.base}/media/${id}`, body).pipe(map((r) => r.data!));
  }

  deleteMedia(id: number): Observable<void> {
    return this.http.delete<ApiResponse<unknown>>(`${this.base}/media/${id}`).pipe(map(() => void 0));
  }

  saveTheme(theme: Theme): Observable<Theme> {
    return this.http.put<ApiResponse<Theme>>(`${this.base}/theme`, theme).pipe(map((r) => r.data!));
  }

  users(): Observable<StaffUser[]> {
    return this.http.get<ApiResponse<StaffUser[]>>(`${this.base}/users`).pipe(map((r) => r.data ?? []));
  }

  roles(): Observable<Role[]> {
    return this.http.get<ApiResponse<Role[]>>(`${this.base}/roles`).pipe(map((r) => r.data ?? []));
  }

  createUser(body: { email: string; fullName: string; phoneNumber: string; roleId: number; temporaryPassword: string; allowGoogleSignIn: boolean }): Observable<StaffUser> {
    return this.http.post<ApiResponse<StaffUser>>(`${this.base}/users`, body).pipe(map((r) => r.data!));
  }

  updateUser(id: number, body: { fullName: string; phoneNumber: string; roleId: number; isActive: boolean; allowGoogleSignIn: boolean }): Observable<StaffUser> {
    return this.http.put<ApiResponse<StaffUser>>(`${this.base}/users/${id}`, body).pipe(map((r) => r.data!));
  }

  resetPassword(id: number, temporaryPassword: string): Observable<void> {
    return this.http.post(`${this.base}/users/${id}/reset-password`, { temporaryPassword }).pipe(map(() => void 0));
  }
}
