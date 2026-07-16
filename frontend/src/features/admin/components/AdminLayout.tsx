import { Suspense, useRef } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Loading } from '@/shared/components/Loading';
import { ScrollToTopButton } from '@/shared/components/ScrollToTopButton';
import {
  LayoutDashboard,
  FileText,
  Tags,
  Calendar,
  Users,
  Settings,
  ClipboardList,
  Menu,
  X,
  LogOut,
  ExternalLink,
  UserCircle,
  KeyRound,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useLocale } from '@/shared/i18n';
import { clsx } from 'clsx';

const adminNavItems = (t: ReturnType<typeof useLocale>['t']) => [
  {
    to: '/admin',
    label: t.admin.dashboard,
    icon: LayoutDashboard,
    roles: ['catalogador', 'curador', 'administrador'],
  },
  {
    to: '/admin/documentos',
    label: t.admin.documents,
    icon: FileText,
    roles: ['catalogador', 'curador', 'administrador'],
  },
  {
    to: '/admin/categorias',
    label: t.admin.categories,
    icon: Tags,
    roles: ['curador', 'administrador'],
  },
  {
    to: '/admin/linha-do-tempo',
    label: t.admin.timeline,
    icon: Calendar,
    roles: ['curador', 'administrador'],
  },
  { to: '/admin/usuarios', label: t.admin.users, icon: Users, roles: ['administrador'] },
  {
    to: '/admin/solicitacoes-senha',
    label: t.admin.passwordRequests,
    icon: KeyRound,
    roles: ['administrador'],
  },
  {
    to: '/admin/configuracoes',
    label: t.admin.settings,
    icon: Settings,
    roles: ['administrador'],
  },
  {
    to: '/admin/auditoria',
    label: t.admin.audit,
    icon: ClipboardList,
    roles: ['administrador'],
  },
];

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const { t } = useLocale();
  const navigate = useNavigate();
  const mainRef = useRef<HTMLElement>(null);
  const navItems = adminNavItems(t);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        className="flex items-center gap-2 bg-ufpb-blue p-4 text-white md:hidden"
        aria-label={t.admin.openAdminMenu}
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
        {t.common.accessAdmin}
      </button>

      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 flex w-64 transform flex-col bg-ufpb-blue text-white transition-transform md:static md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label={t.admin.adminMenu}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-4">
          <span className="font-bold">{t.common.siteShortName}</span>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded p-1 hover:bg-white/10 md:hidden"
            aria-label={t.common.close}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-1">
            <li className="border-b border-white/10 pb-3">
              <div className="mb-2 px-3 text-sm">
                <p className="font-medium">{user?.nome}</p>
                <p className="text-xs text-white/70">{user?.perfil}</p>
              </div>
              <NavLink
                to="/admin/perfil"
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  clsx(
                    'mb-1 flex items-center gap-3 rounded px-3 py-2 text-sm font-medium no-underline transition-colors',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  )
                }
              >
                <UserCircle className="h-5 w-5" aria-hidden="true" />
                {t.admin.profile}
              </NavLink>
              <a
                href="/"
                onClick={() => setSidebarOpen(false)}
                className="mb-1 flex items-center gap-3 rounded px-3 py-2 text-sm font-medium text-white/80 no-underline hover:bg-white/10 hover:text-white"
              >
                <ExternalLink className="h-5 w-5" aria-hidden="true" />
                {t.admin.viewSite}
              </a>
              <button
                type="button"
                onClick={() => {
                  setSidebarOpen(false);
                  handleLogout();
                }}
                className="flex w-full items-center gap-3 rounded px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-5 w-5" aria-hidden="true" />
                {t.common.logout}
              </button>
            </li>

            {navItems
              .filter(
                (item) =>
                  user?.perfis?.some((role) => item.roles.includes(role)) ||
                  item.roles.includes(user?.perfil || '')
              )
              .map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/admin'}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center gap-3 rounded px-3 py-2 text-sm font-medium no-underline transition-colors',
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      )
                    }
                  >
                    <item.icon className="h-5 w-5" aria-hidden="true" />
                    {item.label}
                  </NavLink>
                </li>
              ))}
          </ul>
        </nav>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <main
        ref={mainRef}
        id="main-content"
        className="flex-1 overflow-auto bg-[var(--color-bg)] p-4 md:p-8"
      >
        <Suspense fallback={<Loading fullScreen />}>
          <Outlet />
        </Suspense>
      </main>
      <ScrollToTopButton containerRef={mainRef} />
    </div>
  );
}
