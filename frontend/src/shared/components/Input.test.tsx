import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Input } from './Input';

describe('Input', () => {
  it('renderiza label e input', () => {
    render(<Input label="E-mail" name="email" />);
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
  });

  it('exibe mensagem de erro', () => {
    render(<Input label="Nome" name="nome" error="Campo obrigatório" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Campo obrigatório');
  });

  it('associa o input ao label via id customizado', () => {
    render(<Input label="Senha" id="senha" name="senha" type="password" />);
    const input = screen.getByLabelText(/senha/i);
    expect(input).toHaveAttribute('id', 'senha');
    expect(input).toHaveAttribute('type', 'password');
  });
});
