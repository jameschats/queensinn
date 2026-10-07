import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Perm } from '../../core/models/auth.model';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'qi-dashboard',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-6">
      <h1 class="text-[22px] font-medium">Welcome, {{ auth.displayName() }}</h1>
      <p class="mt-0.5 text-[13.5px] text-[#6B7485]">{{ auth.currentUser()?.roles?.join(', ') }}</p>
    </header>

    <div class="grid gap-4 md:grid-cols-3">
      @if (auth.can(perm.ThemeManage)) {
        <a routerLink="/admin/theme" class="card hover:border-accent"><b class="font-medium">Theme</b><p class="mt-1 text-[13px] text-[#6B7485]">Change the three website colours.</p></a>
      }
      @if (auth.can(perm.SettingsManage)) {
        <a routerLink="/admin/settings" class="card hover:border-accent"><b class="font-medium">Site settings</b><p class="mt-1 text-[13px] text-[#6B7485]">Phones, WhatsApp, emails and address.</p></a>
      }
      @if (auth.can(perm.UserManage)) {
        <a routerLink="/admin/users" class="card hover:border-accent"><b class="font-medium">Staff users</b><p class="mt-1 text-[13px] text-[#6B7485]">Who can sign in, and what they can change.</p></a>
      }
    </div>

    <div class="card mt-4">
      <b class="font-medium">Coming next</b>
      <p class="mt-1 text-[13px] text-[#6B7485]">Enquiry counts and the latest enquiries appear here once the enquiry inbox is built (stage 6).</p>
    </div>`,
})
export class DashboardComponent {
  protected readonly auth = inject(AuthService);
  protected readonly perm = Perm;
}
