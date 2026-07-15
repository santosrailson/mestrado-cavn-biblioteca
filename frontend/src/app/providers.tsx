import { QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { queryClient } from '@/shared/lib/queryClient';
import { useSystemConfig } from '@/shared/hooks/useSystemConfig';
import { LocaleProvider } from '@/shared/i18n';

interface ProvidersProps {
  children: React.ReactNode;
}

function ConfigApplier({ children }: { children: React.ReactNode }) {
  useSystemConfig();
  return <>{children}</>;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <HelmetProvider>
      <LocaleProvider>
        <QueryClientProvider client={queryClient}>
          <ConfigApplier>{children}</ConfigApplier>
        </QueryClientProvider>
      </LocaleProvider>
    </HelmetProvider>
  );
}
