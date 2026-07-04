import { describe, it, expect } from 'vitest';
import { AxiosError } from 'axios';
import { getErrorMessage } from './getErrorMessage';

describe('getErrorMessage', () => {
  it('retorna o detail da resposta quando presente', () => {
    const error = new AxiosError('Request failed');
    error.response = {
      data: { detail: 'E-mail já cadastrado.' },
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: {} as never,
    };
    expect(getErrorMessage(error, 'Erro genérico.')).toBe('E-mail já cadastrado.');
  });

  it('retorna a primeira mensagem de erro de campo quando não há detail', () => {
    const error = new AxiosError('Request failed');
    error.response = {
      data: { email: ['Este campo já existe.'] },
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: {} as never,
    };
    expect(getErrorMessage(error, 'Erro genérico.')).toBe('Este campo já existe.');
  });

  it('retorna o fallback quando o erro não é um AxiosError com resposta', () => {
    expect(getErrorMessage(new Error('rede fora do ar'), 'Erro genérico.')).toBe(
      'Erro genérico.'
    );
  });
});
