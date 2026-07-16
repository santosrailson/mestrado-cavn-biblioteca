import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { canEdit } from '@/features/auth/lib/permissions';
import { useLocale } from '@/shared/i18n';

interface NavLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}

function AdminNavLink({ to, icon, label }: NavLinkProps) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 leading-none text-white hover:text-brand-200"
      title={label}
    >
      {icon}
      <span className="hidden sm:inline leading-none">{label}</span>
    </Link>
  );
}

export function AdminToolbar() {
  const { logout, user } = useAuth();
  const { t } = useLocale();
  const editable = canEdit(user);
  const location = useLocation();

  if (!editable) return null;

  const isAdminRoute = location.pathname.startsWith('/admin');
  const userDisplay = `${user?.nome || user?.email || t.admin.users} (${user?.perfil || t.admin.dashboard})`;

  return (
    <div className="border-b border-brand-700 bg-brand-800 px-4 py-2 text-xs text-white shadow-md">
      <div className="container-page flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-semibold">{t.admin.mode}</span>
          <AdminNavLink
            to="/admin"
            icon={<LayoutDashboard className="h-3.5 w-3.5" aria-hidden="true" />}
            label={t.admin.dashboard}
          />
          <AdminNavLink
            to="/admin/documentos"
            icon={<FileText className="h-3.5 w-3.5" aria-hidden="true" />}
            label={t.admin.documents}
          />
          <AdminNavLink
            to="/admin/usuarios"
            icon={<Users className="h-3.5 w-3.5" aria-hidden="true" />}
            label={t.admin.users}
          />
          <AdminNavLink
            to="/admin/configuracoes"
            icon={<Settings className="h-3.5 w-3.5" aria-hidden="true" />}
            label={t.admin.settings}
          />
        </div>

        <div className="flex items-center gap-3">
          <span
            className="hidden max-w-[200px] truncate text-white sm:inline lg:max-w-[280px]"
            title={userDisplay}
          >
            {userDisplay}
          </span>
          {isAdminRoute && (
            <Link to="/" className="inline-flex items-center gap-1 text-white hover:text-brand-200">
              {t.admin.viewSite}
            </Link>
          )}
          <button
            type="button"
            onClick={() => logout()}
            className="inline-flex items-center gap-1 text-red-200 hover:text-red-100"
            title={t.common.logout}
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">{t.common.logout}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
