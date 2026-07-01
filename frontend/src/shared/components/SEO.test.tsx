import { describe, it, expect } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SEO } from './SEO';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </HelmetProvider>
);

describe('SEO', () => {
  it('renderiza title e meta description', async () => {
    render(<SEO title="Página de teste" description="Descrição de teste" />, { wrapper });

    await waitFor(() => {
      expect(document.title).toBe('Página de teste | Repositório Digital CAVN');
    });

    const metaDescription = document.querySelector('meta[name="description"]');
    expect(metaDescription).toHaveAttribute('content', 'Descrição de teste');
  });

  it('renderiza tags Open Graph', async () => {
    render(<SEO title="Teste" pathname="/teste" />, { wrapper });

    await waitFor(() => {
      const ogTitle = document.querySelector('meta[property="og:title"]');
      expect(ogTitle).toHaveAttribute('content', 'Teste | Repositório Digital CAVN');
    });
  });
});
