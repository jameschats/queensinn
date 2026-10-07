import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Perm } from '../../core/models/auth.model';
import { AdminApiService, EnquirySummary } from '../../core/services/admin-api.service';
import { AuthService } from '../../core/services/auth.service';
import { EnquiryCountsService } from '../../core/services/enquiry-counts.service';

@Component({
  selector: 'qi-dashboard',
  imports: [RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-6">
      <h1 class="text-[22px] font-medium">Welcome, {{ auth.displayName() }}</h1>
      <p class="mt-0.5 text-[13.5px] text-[#6B7485]">{{ auth.currentUser()?.roles?.join(', ') }}</p>
    </header>

    @if (auth.can(perm.EnquiryManage)) {
      <section class="card mb-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <b class="font-medium">Enquiries</b>
            <p class="mt-0.5 text-[13px] text-[#6B7485]">
              @if (counts.newCount() > 0) { <b class="font-semibold text-[#93370D]">{{ counts.newCount() }} new</b> waiting for a reply · }
              {{ counts.counts()?.total ?? 0 }} in total
            </p>
          </div>
          <a routerLink="/admin/enquiries" class="abtn abtn-pri">Open inbox</a>
        </div>
        @if (latest().length) {
          <ul class="m-0 mt-4 grid list-none gap-1 border-t border-[#EEF0F3] p-0 pt-3">
            @for (e of latest(); track e.id) {
              <li class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 rounded px-1 py-1.5 text-[13.5px]">
                <span><b class="font-medium">{{ e.name }}</b> <span class="text-[#6B7485]">· {{ e.detail }}</span></span>
                <span class="text-[12px] text-[#6B7485]"><span class="pill mr-2" [class.pill-warn]="e.status === 'New'">{{ e.status }}</span>{{ e.createdAt + 'Z' | date: 'd MMM, h:mm a' }}</span>
              </li>
            }
          </ul>
        } @else {
          <p class="mt-3 text-[13px] text-[#6B7485]">Nothing yet. Enquiries sent from the website will appear here.</p>
        }
      </section>
    }

    <div class="grid gap-4 md:grid-cols-3">
      @if (auth.can(perm.CmsManage)) {
        <a routerLink="/admin/pages" class="card hover:border-accent"><b class="font-medium">Pages &amp; content</b><p class="mt-1 text-[13px] text-[#6B7485]">Headings, photos, video and search text for each page.</p></a>
      }
      @if (auth.can(perm.MediaManage)) {
        <a routerLink="/admin/gallery" class="card hover:border-accent"><b class="font-medium">Galleries</b><p class="mt-1 text-[13px] text-[#6B7485]">The sliding photo strip and the photo collage.</p></a>
      }
      @if (auth.can(perm.ThemeManage)) {
        <a routerLink="/admin/theme" class="card hover:border-accent"><b class="font-medium">Theme</b><p class="mt-1 text-[13px] text-[#6B7485]">Colours and fonts across the website.</p></a>
      }
      @if (auth.can(perm.SettingsManage)) {
        <a routerLink="/admin/settings" class="card hover:border-accent"><b class="font-medium">Site settings</b><p class="mt-1 text-[13px] text-[#6B7485]">Phones, WhatsApp, emails, address and the Reserve button.</p></a>
      }
      @if (auth.can(perm.UserManage)) {
        <a routerLink="/admin/users" class="card hover:border-accent"><b class="font-medium">Staff users</b><p class="mt-1 text-[13px] text-[#6B7485]">Who can sign in, and what they can change.</p></a>
      }
    </div>`,
})
export class DashboardComponent {
  protected readonly auth = inject(AuthService);
  protected readonly counts = inject(EnquiryCountsService);
  private readonly api = inject(AdminApiService);
  protected readonly perm = Perm;
  protected readonly latest = signal<EnquirySummary[]>([]);

  constructor() {
    if (this.auth.can(Perm.EnquiryManage)) {
      this.counts.refresh();
      this.api.enquiries({ pageSize: 5 }).subscribe({ next: (r) => this.latest.set(r.items), error: () => {} });
    }
  }
}
