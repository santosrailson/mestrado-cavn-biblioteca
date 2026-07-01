import { QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { queryClient } from '@/shared/lib/queryClient';
import { useSystemConfig } from '@/shared/hooks/useSystemConfig';

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
      <QueryClientProvider client={queryClient}>
        <ConfigApplier>{children}</ConfigApplier>
      </QueryClientProvider>
    </HelmetProvider>
  );
}
