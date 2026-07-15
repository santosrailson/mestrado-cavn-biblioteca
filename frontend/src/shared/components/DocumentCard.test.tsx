import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DocumentCard } from './DocumentCard';
import { Documento } from '@/shared/types';

const mockDocumento: Documento = {
  id: '1',
  titulo: 'Documento de teste',
  slug: 'documento-de-teste',
  tipoDocumento: 'ata',
  status: 'publicado',
  dataPrecisao: 'dia',
  idioma: 'pt-BR',
  direitos: 'Domínio público',
  criadoPorId: '1',
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
    {children}
  </MemoryRouter>
);

describe('DocumentCard', () => {
  it('renderiza título e link para o documento', () => {
    render(<DocumentCard documento={mockDocumento} />, { wrapper });
    const links = screen.getAllByRole('link', { name: /documento de teste/i });
    expect(links.length).toBeGreaterThanOrEqual(1);
    expect(links[0]).toHaveAttribute('href', '/documentos/documento-de-teste');
  });

  it('renderiza botão de editar quando editTo e onEdit são fornecidos', () => {
    const onEdit = vi.fn();
    render(<DocumentCard documento={mockDocumento} editTo="documento-de-teste" onEdit={onEdit} />, {
      wrapper,
    });
    expect(screen.getByLabelText(/editar/i)).toBeInTheDocument();
  });
});
