import { Routes } from '@angular/router';
import { Perm } from './core/models/auth.model';
import { adminGuard, guestGuard, permissionGuard, signedInGuard } from './core/guards/admin.guards';
import { ContentPageData } from './features/public/content-page.component';
import { PublicLayoutComponent } from './layout/public-layout.component';

const page = (data: ContentPageData) => ({ page: data, solidHeader: data.plain === true });

/**
 * Every URL from the Wix site is preserved exactly (design doc §3); /kvr-mahal is new.
 * Unknown paths render a real 404.
 */
export const routes: Routes = [
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', loadComponent: () => import('./features/public/home.component').then((m) => m.HomeComponent) },
      {
        path: 'bookroom',
        loadComponent: () => import('./features/public/content-page.component').then((m) => m.ContentPageComponent),
        data: page({
          path: '/bookroom', kicker: 'Stay with us', title: 'Rooms & suites',
          lede: 'Fifty-one air-conditioned rooms in four categories, set around three acres of garden.',
          metaTitle: "Rooms & Tariffs | Hotel Queen's Inn, Velankanni",
          metaDescription: "Deluxe, Executive Triple, Family and Queen's Suite rooms near the Velankanni Basilica. Send a reservation enquiry or WhatsApp the front desk.",
          anchors: ['reserve'],
        }),
      },
      {
        path: 'kvr-mahal',
        loadComponent: () => import('./features/public/content-page.component').then((m) => m.ContentPageComponent),
        data: page({
          path: '/kvr-mahal', kicker: 'KVR Mahal', title: 'Where sacred vows meet timeless hospitality',
          lede: "Velankanni's grandest air-conditioned ceremonial mandapam, with a dining pavilion and luxury rooms on the same gated campus.",
          metaTitle: 'KVR Mahal | Wedding & Reception Hall in Velankanni',
          metaDescription: "Velankanni's grandest air-conditioned mandapam for 500–1,000 guests, with a 300-seat dining pavilion and 51 hotel rooms on one campus.",
          anchors: ['mahal-enquiry'],
        }),
      },
      {
        path: 'about-us',
        loadComponent: () => import('./features/public/content-page.component').then((m) => m.ContentPageComponent),
        data: page({
          path: '/about-us', kicker: 'Our story', title: 'A quiet house near a sacred shore',
          lede: 'Welcoming pilgrims, families and celebrations to Velankanni since October 2017.',
          metaTitle: "About Us | Hotel Queen's Inn, Velankanni",
          metaDescription: 'Welcoming pilgrims, families and celebrations to Velankanni since 2017, on ECR Main Road near the Shrine Basilica.',
        }),
      },
      {
        path: 'activities',
        loadComponent: () => import('./features/public/content-page.component').then((m) => m.ContentPageComponent),
        data: page({
          path: '/activities', kicker: 'Experiences', title: 'Pilgrim trails and coastal days',
          lede: 'A gentle base for the sacred sites and wild coast of the Cauvery delta.',
          metaTitle: "Things to Do Near Velankanni | Hotel Queen's Inn",
          metaDescription: 'Velankanni Basilica, Nagore Dargah, Thirunallar, Point Calimere, Muthupet mangroves and Tranquebar, with distances from the hotel.',
        }),
      },
      {
        path: 'contact',
        loadComponent: () => import('./features/public/content-page.component').then((m) => m.ContentPageComponent),
        data: page({
          path: '/contact', kicker: 'Contact', title: "We're a call away", plain: true,
          metaTitle: "Contact | Hotel Queen's Inn, Velankanni",
          metaDescription: "Call, WhatsApp or email Hotel Queen's Inn, ECR Main Road, Velankanni 611 111.",
        }),
      },
      {
        path: 'terms-conditions',
        loadComponent: () => import('./features/public/content-page.component').then((m) => m.ContentPageComponent),
        data: page({ path: '/terms-conditions', title: 'Terms & conditions', plain: true, metaTitle: "Terms & Conditions | Hotel Queen's Inn" }),
      },
      {
        path: 'cancellation-policy',
        loadComponent: () => import('./features/public/content-page.component').then((m) => m.ContentPageComponent),
        data: page({ path: '/cancellation-policy', title: 'Cancellation & refund', plain: true, metaTitle: "Cancellation & Refund Policy | Hotel Queen's Inn" }),
      },
      {
        path: 'privacy-policy',
        loadComponent: () => import('./features/public/content-page.component').then((m) => m.ContentPageComponent),
        data: page({ path: '/privacy-policy', title: 'Privacy policy', plain: true, metaTitle: "Privacy Policy | Hotel Queen's Inn" }),
      },
    ],
  },

  // ---------------- admin ----------------
  {
    path: 'admin/login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/admin/auth/admin-login.component').then((m) => m.AdminLoginComponent),
  },
  {
    path: 'admin/change-password',
    canActivate: [signedInGuard],
    loadComponent: () => import('./features/admin/auth/change-password.component').then((m) => m.ChangePasswordComponent),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/admin-layout.component').then((m) => m.AdminLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', loadComponent: () => import('./features/admin/dashboard.component').then((m) => m.DashboardComponent) },
      {
        path: 'theme',
        canActivate: [permissionGuard(Perm.ThemeManage)],
        loadComponent: () => import('./features/admin/theme/theme.component').then((m) => m.ThemeComponent),
      },
      {
        path: 'settings',
        canActivate: [permissionGuard(Perm.SettingsManage)],
        loadComponent: () => import('./features/admin/settings/settings.component').then((m) => m.SettingsComponent),
      },
      {
        path: 'users',
        canActivate: [permissionGuard(Perm.UserManage)],
        loadComponent: () => import('./features/admin/users/users.component').then((m) => m.UsersComponent),
      },
    ],
  },

  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      {
        path: '**',
        loadComponent: () => import('./features/public/not-found.component').then((m) => m.NotFoundComponent),
        data: { solidHeader: true },
      },
    ],
  },
];
