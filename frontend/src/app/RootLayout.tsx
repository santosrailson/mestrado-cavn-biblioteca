import { Suspense, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { Loading } from '@/shared/components/Loading';
import { ToastContainer } from '@/shared/components/Toast';
import { ScrollToTopButton } from '@/shared/components/ScrollToTopButton';
import { PWAUpdatePrompt } from '@/shared/components/PWAUpdatePrompt';
import { AnalyticsConsentBanner } from '@/shared/components/AnalyticsConsentBanner';
import { AppScrollRestoration } from './ScrollRestoration';

export function RootLayout() {
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  return (
    <ErrorBoundary>
      <AppScrollRestoration />
      <Suspense fallback={<Loading fullScreen />}>
        <Outlet />
      </Suspense>
      <ToastContainer />
      <ScrollToTopButton />
      <PWAUpdatePrompt />
      <AnalyticsConsentBanner />
    </ErrorBoundary>
  );
}
