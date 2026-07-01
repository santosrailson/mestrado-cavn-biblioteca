import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X, User } from 'lucide-react';
import { AccessibilityBar } from './AccessibilityBar';
import { AdminToolbar } from '@/features/admin/components/AdminToolbar';
import { SearchForm } from './SearchForm';
import ptBR from '@/shared/i18n/pt-BR';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { clsx } from 'clsx';

const navItems = [
  { to: '/', label: ptBR.navigation.home },
  { to: '/busca', label: ptBR.navigation.collection },
  { to: '/linha-do-tempo', label: ptBR.navigation.timeline },
  { to: '/galeria', label: ptBR.navigation.gallery },
  { to: '/producao-academica', label: ptBR.navigation.academic },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <AdminToolbar />
      <AccessibilityBar />
      <header className="sticky top-0 z-40 border-b border-border bg-bg">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Link
            to="/"
            className="flex items-center gap-3 text-text no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <img
              src="/logo-cavn.png"
              alt="CAVN"
              className="h-10 w-10 rounded-full object-contain"
              width="40"
              height="40"
            />
            <div className="hidden flex-col sm:flex">
              <span className="text-sm font-bold leading-tight">{ptBR.common.siteShortName}</span>
              <span className="text-xs text-text-muted">UFPB</span>
            </div>
          </Link>

          <SearchForm className="hidden max-w-md flex-1 md:block" />

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <div className="hidden items-center gap-2 md:flex">
                <span className="text-sm text-text-muted">{user?.nome}</span>
                <Link to="/admin" className="btn-secondary text-xs">
                  {ptBR.common.accessAdmin}
                </Link>
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden items-center gap-1 btn-secondary text-xs md:inline-flex"
              >
                <User className="h-4 w-4" aria-hidden="true" />
                {ptBR.common.login}
              </Link>
            )}

            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="rounded p-2 text-text hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-focus md:hidden"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? ptBR.accessibility.closeMenu : ptBR.accessibility.openMenu}
            >
              {menuOpen ? (
                <X className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav
            id="mobile-menu"
            className="border-t border-border bg-bg p-4 md:hidden"
            aria-label={ptBR.accessibility.menu}
          >
            <SearchForm className="mb-4" onSubmit={closeMenu} />
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={closeMenu}
                    className={({ isActive }) =>
                      clsx(
                        'block rounded px-3 py-2 text-base font-medium no-underline transition-colors',
                        isActive ? 'bg-primary/10 text-primary' : 'text-text hover:bg-surface'
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
              <li className="border-t border-border pt-2">
                {isAuthenticated ? (
                  <div className="flex flex-col gap-2">
                    <Link
                      to="/admin"
                      onClick={closeMenu}
                      className="btn-secondary text-center text-sm"
                    >
                      {ptBR.common.accessAdmin}
                    </Link>
                    <button type="button" onClick={logout} className="btn-outline text-sm">
                      {ptBR.common.logout}
                    </button>
                  </div>
                ) : (
                  <Link to="/login" onClick={closeMenu} className="btn-primary text-center text-sm">
                    {ptBR.common.login}
                  </Link>
                )}
              </li>
            </ul>
          </nav>
        )}

        <nav
          className="hidden border-t border-border bg-surface md:block"
          aria-label={ptBR.accessibility.menu}
        >
          <div className="container-page">
            <ul className="flex items-center gap-1">
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      clsx(
                        'block border-b-2 px-4 py-2.5 text-sm font-medium no-underline transition-colors',
                        isActive
                          ? 'border-primary text-primary'
                          : 'border-transparent text-text hover:border-border hover:opacity-80'
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </header>
    </>
  );
}
