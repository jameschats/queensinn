import { Injectable, computed, inject, signal } from '@angular/core';
import { AdminApiService, EnquiryCounts } from './admin-api.service';

/** How many enquiries are waiting, shared by the sidebar badge, the dashboard and the inbox. */
@Injectable({ providedIn: 'root' })
export class EnquiryCountsService {
  private readonly api = inject(AdminApiService);
  readonly counts = signal<EnquiryCounts | null>(null);
  readonly newCount = computed(() => this.counts()?.new ?? 0);

  refresh(): void {
    this.api.enquiryCounts().subscribe({ next: (c) => this.counts.set(c), error: () => {} });
  }
}
