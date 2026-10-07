import { inject } from '@angular/core';
import { Route, Routes } from '@angular/router';
import { Perm } from './core/models/auth.model';
import { adminGuard, guestGuard, permissionGuard, signedInGuard, unsavedChangesGuard } from './core/guards/admin.guards';
import { ContentService } from './core/services/content.service';
import { PolicyService } from './core/services/policy.service';
import { ContentPageData } from './features/public/content-page.component';
import { PublicLayoutComponent } from './layout/public-layout.component';

/** Wait for photos/rooms before showing a page, so anchor scrolls land correctly and nothing jumps in later. */
const withContent = { content: () => inject(ContentService).whenLoaded() };

const lazyPage = () => import('./features/public/content-page.component').then((m) => m.ContentPageComponent);

/** A page whose wording, hero and SEO come from Pages & content (defaults live in core/content/page-schemas.ts). */
const contentRoute = (path: string, data: ContentPageData): Route => ({
  path,
  resolve: withContent,
  loadComponent: lazyPage,
  data: { page: data, solidHeader: data.plain === true },
});

/** Terms, cancellation and privacy: the text is loaded with the route so it is in the server-rendered HTML. */
const policyRoute = (slug: string, title: string): Route => ({
  path: slug,
  resolve: { ...withContent, policy: () => inject(PolicyService).get(slug) },
  loadComponent: lazyPage,
  data: { page: { slug, path: '/' + slug, plain: true, policy: slug, title } satisfies ContentPageData, solidHeader: true },
});

/**
 * Every URL from the Wix site is preserved exactly (design doc §3); /kvr-mahal is new.
 * Unknown paths render a real 404.
 */
export const routes: Routes = [
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', resolve: withContent, loadComponent: () => import('./features/public/home.component').then((m) => m.HomeComponent) },
      {
        path: 'bookroom',
        resolve: withContent,
        loadComponent: () => import('./features/public/stay.component').then((m) => m.StayComponent),
      },
      contentRoute('kvr-mahal', { slug: 'kvr-mahal', path: '/kvr-mahal', art: 'mandap', anchors: ['mahal-enquiry'] }),
      contentRoute('about-us', { slug: 'about-us', path: '/about-us', art: 'arch' }),
      contentRoute('activities', { slug: 'activities', path: '/activities', art: 'sea' }),
      {
        path: 'contact',
        resolve: withContent,
        loadComponent: () => import('./features/public/contact.component').then((m) => m.ContactComponent),
      },
      policyRoute('terms-conditions', 'Terms & conditions'),
      policyRoute('cancellation-policy', 'Cancellation & refund'),
      policyRoute('privacy-policy', 'Privacy policy'),
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
        path: 'pages',
        canActivate: [permissionGuard(Perm.CmsManage)],
        loadComponent: () => import('./features/admin/pages/pages.component').then((m) => m.PagesComponent),
      },
      {
        path: 'pages/:slug',
        canActivate: [permissionGuard(Perm.CmsManage)],
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () => import('./features/admin/pages/page-editor.component').then((m) => m.PageEditorComponent),
      },
      {
        path: 'policies/:slug',
        canActivate: [permissionGuard(Perm.CmsManage)],
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () => import('./features/admin/pages/policy-editor.component').then((m) => m.PolicyEditorComponent),
      },
      {
        path: 'rooms',
        canActivate: [permissionGuard(Perm.RoomManage)],
        loadComponent: () => import('./features/admin/rooms/rooms.component').then((m) => m.RoomsAdminComponent),
      },
      {
        path: 'rooms/:id',
        canActivate: [permissionGuard(Perm.RoomManage)],
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () => import('./features/admin/rooms/room-editor.component').then((m) => m.RoomEditorComponent),
      },
      {
        path: 'enquiries',
        canActivate: [permissionGuard(Perm.EnquiryManage)],
        loadComponent: () => import('./features/admin/enquiries/enquiries.component').then((m) => m.EnquiriesComponent),
      },
      {
        path: 'gallery',
        canActivate: [permissionGuard(Perm.MediaManage)],
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () => import('./features/admin/gallery/gallery-admin.component').then((m) => m.GalleryAdminComponent),
      },
      {
        path: 'media',
        canActivate: [permissionGuard(Perm.MediaManage)],
        loadComponent: () => import('./features/admin/media/media.component').then((m) => m.MediaComponent),
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
