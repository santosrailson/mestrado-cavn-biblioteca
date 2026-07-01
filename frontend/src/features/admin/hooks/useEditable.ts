import { useAuth } from '@/features/auth/hooks/useAuth';
import { canEdit } from '@/features/auth/lib/permissions';

export function useEditable() {
  const { user, isAuthenticated } = useAuth();
  const editable = isAuthenticated && canEdit(user);

  return {
    canEdit: editable,
    isAuthenticated,
  };
}
