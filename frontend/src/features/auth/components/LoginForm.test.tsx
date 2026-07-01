import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  it('renderiza campos de e-mail e senha', () => {
    render(<LoginForm onSubmit={vi.fn()} isLoading={false} />);
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
  });

  it('exibe erro de validação para e-mail inválido', async () => {
    render(<LoginForm onSubmit={vi.fn()} isLoading={false} />);
    fireEvent.input(screen.getByLabelText(/e-mail/i), { target: { value: 'invalido' } });
    fireEvent.input(screen.getByLabelText(/senha/i), { target: { value: 'senha' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getAllByRole('alert').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('chama onSubmit com dados válidos', async () => {
    const handleSubmit = vi.fn();
    render(<LoginForm onSubmit={handleSubmit} isLoading={false} />);

    fireEvent.input(screen.getByLabelText(/e-mail/i), {
      target: { value: 'teste@ufpb.br' },
    });
    fireEvent.input(screen.getByLabelText(/senha/i), {
      target: { value: 'senha123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        { email: 'teste@ufpb.br', password: 'senha123' },
        expect.anything()
      );
    });
  });
});
