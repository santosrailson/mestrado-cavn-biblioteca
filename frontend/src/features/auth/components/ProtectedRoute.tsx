import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { canAdminister, canCurate, canEdit } from '../lib/permissions';
import { PerfilUsuario } from '@/shared/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: PerfilUsuario[];
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRoles && requiredRoles.length > 0) {
    const userRoles = user?.perfis && user.perfis.length > 0 ? user.perfis : [user?.perfil];
    const hasRequiredRole = userRoles.some((role): role is PerfilUsuario =>
      requiredRoles.includes(role as PerfilUsuario)
    );
    if (!hasRequiredRole) {
      return <Navigate to="/acesso-negado" replace />;
    }
  }

  return <>{children}</>;
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return canAdminister(user) ? <>{children}</> : <Navigate to="/acesso-negado" replace />;
}

export function CuratorRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return canCurate(user) ? <>{children}</> : <Navigate to="/acesso-negado" replace />;
}

export function CatalogerRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return canEdit(user) ? <>{children}</> : <Navigate to="/acesso-negado" replace />;
}
