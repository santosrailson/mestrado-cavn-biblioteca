import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '@/shared/components/Header';
import { Footer } from '@/shared/components/Footer';
import { SkipLink } from '@/shared/components/SkipLink';
import { Loading } from '@/shared/components/Loading';

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      <Header />
      <div className="flex-1">
        <Suspense fallback={<Loading fullScreen />}>
          <Outlet />
        </Suspense>
      </div>
      <Footer />
    </div>
  );
}
