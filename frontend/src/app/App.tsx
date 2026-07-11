import { RouterProvider } from 'react-router-dom';
import { router } from '@/app/router';
import { Providers } from '@/app/providers';
import { useAuthSync } from '@/features/auth/hooks/useAuth';

function AuthSync() {
  useAuthSync();
  return null;
}

export function App() {
  return (
    <Providers>
      <AuthSync />
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    </Providers>
  );
}
