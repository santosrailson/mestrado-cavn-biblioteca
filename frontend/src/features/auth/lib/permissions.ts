import { Usuario, PerfilUsuario } from '@/shared/types';

export const ROLES = {
  CATALOGER: 'catalogador' as PerfilUsuario,
  CURATOR: 'curador' as PerfilUsuario,
  ADMIN: 'administrador' as PerfilUsuario,
};

function getUserRoles(user?: Usuario | null): PerfilUsuario[] {
  if (!user) return [];
  return user.perfis && user.perfis.length > 0 ? user.perfis : [user.perfil];
}

function hasAnyRole(user: Usuario | null | undefined, roles: PerfilUsuario[]): boolean {
  const userRoles = getUserRoles(user);
  return roles.some((role) => userRoles.includes(role));
}

export function canCatalog(user?: Usuario | null): boolean {
  return hasAnyRole(user, [ROLES.CATALOGER, ROLES.CURATOR, ROLES.ADMIN]);
}

export function canCurate(user?: Usuario | null): boolean {
  return hasAnyRole(user, [ROLES.CURATOR, ROLES.ADMIN]);
}

export function canAdminister(user?: Usuario | null): boolean {
  return hasAnyRole(user, [ROLES.ADMIN]);
}

export function canEdit(user?: Usuario | null): boolean {
  return canCatalog(user);
}
