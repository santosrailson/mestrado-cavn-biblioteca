import { describe, it, expect } from 'vitest';
import { canCatalog, canCurate, canAdminister, canEdit } from './permissions';
import { Usuario } from '@/shared/types';

const createUser = (perfil: Usuario['perfil'], perfis?: Usuario['perfil'][]): Usuario => ({
  id: '1',
  nome: 'Test',
  email: 'test@example.com',
  perfil,
  perfis,
  ativo: true,
  createdAt: '',
  updatedAt: '',
});

describe('permissions', () => {
  it('catalogador pode editar mas não curador nem administrar', () => {
    const user = createUser('catalogador');
    expect(canEdit(user)).toBe(true);
    expect(canCatalog(user)).toBe(true);
    expect(canCurate(user)).toBe(false);
    expect(canAdminister(user)).toBe(false);
  });

  it('curador pode editar, catalogar e curador mas não administrar', () => {
    const user = createUser('curador');
    expect(canEdit(user)).toBe(true);
    expect(canCatalog(user)).toBe(true);
    expect(canCurate(user)).toBe(true);
    expect(canAdminister(user)).toBe(false);
  });

  it('administrador possui todas as permissões', () => {
    const user = createUser('administrador');
    expect(canEdit(user)).toBe(true);
    expect(canCatalog(user)).toBe(true);
    expect(canCurate(user)).toBe(true);
    expect(canAdminister(user)).toBe(true);
  });

  it('usuário nulo não possui permissões', () => {
    expect(canEdit(null)).toBe(false);
    expect(canCatalog(null)).toBe(false);
    expect(canCurate(null)).toBe(false);
    expect(canAdminister(null)).toBe(false);
  });

  it('respeita array de perfis quando presente', () => {
    const user = createUser('catalogador', ['curador', 'administrador']);
    expect(canCurate(user)).toBe(true);
    expect(canAdminister(user)).toBe(true);
  });
});
