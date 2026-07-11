import { createBrowserRouter, RouteObject } from 'react-router-dom';
import { lazy } from 'react';
import { RootLayout } from '@/app/RootLayout';
import { PublicLayout } from '@/app/PublicLayout';
import { HomePage } from '@/features/home/pages/HomePage';
import { SearchPage } from '@/features/search/pages/SearchPage';
import { DocumentDetailPage } from '@/features/documents/pages/DocumentDetailPage';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { AccessDeniedPage } from '@/features/auth/pages/AccessDeniedPage';
import {
  CatalogerRoute,
  CuratorRoute,
  AdminRoute,
} from '@/features/auth/components/ProtectedRoute';

// Rotas públicas secundárias — lazy loaded
const TimelinePage = lazy(() =>
  import('@/features/timeline/pages/TimelinePage').then((m) => ({ default: m.TimelinePage }))
);
const GalleryPage = lazy(() =>
  import('@/features/gallery/pages/GalleryPage').then((m) => ({ default: m.GalleryPage }))
);
const AcademicPage = lazy(() =>
  import('@/features/academic/pages/AcademicPage').then((m) => ({ default: m.AcademicPage }))
);
const AboutPage = lazy(() =>
  import('@/features/content/pages/AboutPage').then((m) => ({ default: m.AboutPage }))
);
const OfflinePage = lazy(() =>
  import('@/features/content/pages/OfflinePage').then((m) => ({ default: m.OfflinePage }))
);
const AccessibilityPage = lazy(() =>
  import('@/features/content/pages/AccessibilityPage').then((m) => ({
    default: m.AccessibilityPage,
  }))
);
const TermsPage = lazy(() =>
  import('@/features/content/pages/TermsPage').then((m) => ({ default: m.TermsPage }))
);
const PrivacyPage = lazy(() =>
  import('@/features/content/pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage }))
);

// Admin — lazy loaded
const AdminLayout = lazy(() =>
  import('@/features/admin/components/AdminLayout').then((m) => ({ default: m.AdminLayout }))
);
const DashboardPage = lazy(() =>
  import('@/features/admin/pages/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const DocumentsPage = lazy(() =>
  import('@/features/admin/pages/DocumentsPage').then((m) => ({ default: m.DocumentsPage }))
);
const DocumentFormPage = lazy(() =>
  import('@/features/admin/pages/DocumentFormPage').then((m) => ({ default: m.DocumentFormPage }))
);
const CategoriesPage = lazy(() =>
  import('@/features/admin/pages/CategoriesPage').then((m) => ({ default: m.CategoriesPage }))
);
const TagsPage = lazy(() =>
  import('@/features/admin/pages/TagsPage').then((m) => ({ default: m.TagsPage }))
);
const TimelineAdminPage = lazy(() =>
  import('@/features/admin/pages/TimelineAdminPage').then((m) => ({ default: m.TimelineAdminPage }))
);
const UsersPage = lazy(() =>
  import('@/features/admin/pages/UsersPage').then((m) => ({ default: m.UsersPage }))
);
const SettingsPage = lazy(() =>
  import('@/features/admin/pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);
const AuditPage = lazy(() =>
  import('@/features/admin/pages/AuditPage').then((m) => ({ default: m.AuditPage }))
);
const ProfilePage = lazy(() =>
  import('@/features/admin/pages/ProfilePage').then((m) => ({ default: m.ProfilePage }))
);
const PasswordRequestsPage = lazy(() =>
  import('@/features/admin/pages/PasswordRequestsPage').then((m) => ({
    default: m.PasswordRequestsPage,
  }))
);

const NotFoundPage = lazy(() =>
  import('@/features/content/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))
);

const publicRoutes: RouteObject[] = [
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'busca', element: <SearchPage /> },
      { path: 'documentos/:slug', element: <DocumentDetailPage /> },
      { path: 'linha-do-tempo', element: <TimelinePage /> },
      { path: 'galeria', element: <GalleryPage /> },
      { path: 'producao-academica', element: <AcademicPage /> },
      { path: 'sobre', element: <AboutPage /> },
      { path: 'acessibilidade', element: <AccessibilityPage /> },
      { path: 'termo-de-uso', element: <TermsPage /> },
      { path: 'politica-de-privacidade', element: <PrivacyPage /> },
    ],
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/acesso-negado', element: <AccessDeniedPage /> },
  { path: '/offline', element: <OfflinePage /> },
];

const adminRoutes: RouteObject[] = [
  {
    path: '/admin',
    element: (
      <CatalogerRoute>
        <AdminLayout />
      </CatalogerRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'documentos', element: <DocumentsPage /> },
      { path: 'documentos/novo', element: <DocumentFormPage /> },
      { path: 'documentos/:id/editar', element: <DocumentFormPage /> },
      {
        path: 'categorias',
        element: (
          <CuratorRoute>
            <CategoriesPage />
          </CuratorRoute>
        ),
      },
      {
        path: 'tags',
        element: (
          <CuratorRoute>
            <TagsPage />
          </CuratorRoute>
        ),
      },
      {
        path: 'linha-do-tempo',
        element: (
          <CuratorRoute>
            <TimelineAdminPage />
          </CuratorRoute>
        ),
      },
      {
        path: 'usuarios',
        element: (
          <AdminRoute>
            <UsersPage />
          </AdminRoute>
        ),
      },
      {
        path: 'configuracoes',
        element: (
          <AdminRoute>
            <SettingsPage />
          </AdminRoute>
        ),
      },
      {
        path: 'auditoria',
        element: (
          <AdminRoute>
            <AuditPage />
          </AdminRoute>
        ),
      },
      { path: 'perfil', element: <ProfilePage /> },
      {
        path: 'solicitacoes-senha',
        element: (
          <AdminRoute>
            <PasswordRequestsPage />
          </AdminRoute>
        ),
      },
    ],
  },
];

export const router = createBrowserRouter(
  [
    {
      element: <RootLayout />,
      children: [...publicRoutes, ...adminRoutes, { path: '*', element: <NotFoundPage /> }],
    },
  ],
  { future: { v7_relativeSplatPath: true } }
);
