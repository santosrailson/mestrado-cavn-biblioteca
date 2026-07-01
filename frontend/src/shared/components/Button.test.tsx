import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renderiza o texto do botão', () => {
    render(<Button>Clique aqui</Button>);
    expect(screen.getByRole('button', { name: /clique aqui/i })).toBeInTheDocument();
  });

  it('desabilita o botão quando isLoading é true', () => {
    render(<Button isLoading>Salvando</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });

  it('chama onClick ao clicar', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Clique</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('não chama onClick quando desabilitado', () => {
    const handleClick = vi.fn();
    render(
      <Button disabled onClick={handleClick}>
        Clique
      </Button>
    );
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });
});
