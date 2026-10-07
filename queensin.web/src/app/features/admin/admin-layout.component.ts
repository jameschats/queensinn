import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { Perm } from '../../core/models/auth.model';
import { AuthService } from '../../core/services/auth.service';
import { EnquiryCountsService } from '../../core/services/enquiry-counts.service';
import { BrandComponent } from '../../shared/brand.component';
import { IconComponent } from '../../shared/icon.component';

interface AdminNav {
  link: string;
  label: string;
  icon: string;
  perm?: string;
  /** Show the number of new enquiries beside this item. */
  badge?: boolean;
  /** Screens that arrive in later stages are listed (so staff see the plan) but disabled. */
  stage?: number;
}

@Component({
  selector: 'qi-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, BrandComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="adm md:grid md:grid-cols-[248px_1fr]">
      <aside class="fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-primary px-4 py-6 text-on-primary transition-transform duration-300 md:sticky md:top-0 md:h-svh md:w-auto md:translate-x-0"
             [class.-translate-x-full]="!navOpen()">
        <div class="px-2 pb-7"><qi-brand link="/admin" [showPlace]="false" /></div>
        <nav class="grid gap-0.5" aria-label="Admin">
          @for (item of nav(); track item.link) {
            @if (item.stage) {
              <span class="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-on-primary-muted/60" [title]="'Arrives in stage ' + item.stage">
                <qi-icon [name]="item.icon" [size]="18" />{{ item.label }}
                <span class="ml-auto text-[10px] uppercase tracking-wider opacity-70">Soon</span>
              </span>
            } @else {
              <a [routerLink]="item.link" routerLinkActive="!bg-accent !text-primary" [routerLinkActiveOptions]="{ exact: item.link === '/admin' }"
                 class="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-on-primary-muted hover:bg-white/5 hover:text-on-primary">
                <qi-icon [name]="item.icon" [size]="18" />{{ item.label }}
                @if (item.badge && enquiries.newCount() > 0) { <span class="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-primary" [attr.aria-label]="enquiries.newCount() + ' new'">{{ enquiries.newCount() }}</span> }
              </a>
            }
          }
        </nav>
        <div class="mt-auto grid gap-0.5 border-t border-white/10 pt-4 text-sm">
          <span class="px-3 pb-2 text-xs text-on-primary-muted">Signed in as<br /><b class="font-medium text-on-primary">{{ auth.displayName() }}</b></span>
          <a routerLink="/admin/change-password" class="flex items-center gap-3 rounded-md px-3 py-2.5 text-on-primary-muted hover:bg-white/5 hover:text-on-primary"><qi-icon name="key" [size]="18" />Change password</a>
          <a href="/" class="flex items-center gap-3 rounded-md px-3 py-2.5 text-on-primary-muted hover:bg-white/5 hover:text-on-primary"><qi-icon name="arrowL" [size]="18" />View website</a>
          <button type="button" (click)="signOut()" class="flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-on-primary-muted hover:bg-white/5 hover:text-on-primary"><qi-icon name="out" [size]="18" />Sign out</button>
        </div>
      </aside>
      @if (navOpen()) { <button type="button" class="fixed inset-0 z-40 bg-black/40 md:hidden" aria-label="Close menu" (click)="navOpen.set(false)"></button> }

      <main class="min-w-0 px-[clamp(16px,3vw,40px)] pb-16 pt-7">
        <div class="mb-4 flex items-center md:hidden">
          <button type="button" class="abtn" (click)="navOpen.set(true)"><qi-icon name="menu" [size]="16" />Menu</button>
        </div>
        <router-outlet />
      </main>
    </div>`,
})
export class AdminLayoutComponent {
  protected readonly auth = inject(AuthService);
  protected readonly enquiries = inject(EnquiryCountsService);
  private readonly router = inject(Router);
  protected readonly navOpen = signal(false);

  private readonly all: AdminNav[] = [
    { link: '/admin', label: 'Dashboard', icon: 'dash' },
    { link: '/admin/enquiries', label: 'Enquiries', icon: 'inbox', perm: Perm.EnquiryManage, badge: true },
    { link: '/admin/rooms', label: 'Rooms', icon: 'bed', perm: Perm.RoomManage },
    { link: '/admin/media', label: 'Media library', icon: 'image', perm: Perm.MediaManage },
    { link: '/admin/attractions', label: 'Experiences', icon: 'pin', perm: Perm.CmsManage },
    { link: '/admin/testimonials', label: 'Guest quotes', icon: 'quote', perm: Perm.CmsManage },
    { link: '/admin/gallery', label: 'Galleries', icon: 'grid', perm: Perm.MediaManage },
    { link: '/admin/pages', label: 'Pages & content', icon: 'doc', perm: Perm.CmsManage },
    { link: '/admin/theme', label: 'Theme', icon: 'palette', perm: Perm.ThemeManage },
    { link: '/admin/settings', label: 'Site settings', icon: 'cog', perm: Perm.SettingsManage },
    { link: '/admin/users', label: 'Staff users', icon: 'users', perm: Perm.UserManage },
  ];

  protected readonly nav = computed(() => this.all.filter((n) => !n.perm || this.auth.can(n.perm)));

  constructor() {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => this.navOpen.set(false));
    // Pick up role changes made by another admin since this session started.
    this.auth.me().subscribe({ error: () => {} });
    if (this.auth.can(Perm.EnquiryManage)) {
      this.enquiries.refresh();
      // new enquiries arrive while staff have the admin open: look again every few minutes
      const timer = setInterval(() => this.enquiries.refresh(), 180_000);
      inject(DestroyRef).onDestroy(() => clearInterval(timer));
    }
  }

  protected signOut(): void {
    this.auth.logout();
    this.router.navigate(['/admin/login']);
  }
}
