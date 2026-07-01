import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from './Modal';

describe('Modal', () => {
  it('não renderiza quando isOpen é false', () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()} title="Título">
        Conteúdo
      </Modal>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renderiza título e conteúdo quando aberto', () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Título do modal">
        Conteúdo do modal
      </Modal>
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Título do modal')).toBeInTheDocument();
    expect(screen.getByText('Conteúdo do modal')).toBeInTheDocument();
  });

  it('chama onClose ao clicar no botão de fechar', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen onClose={handleClose} title="Título">
        Conteúdo
      </Modal>
    );
    fireEvent.click(screen.getByLabelText(/fechar/i));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
