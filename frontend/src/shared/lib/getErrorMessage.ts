import { AxiosError } from 'axios';

interface DrfErrorBody {
  detail?: string;
  [field: string]: string | string[] | undefined;
}

/** Extrai uma mensagem de erro legível de um erro do Axios vindo da API DRF. */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof AxiosError) || !error.response) {
    return fallback;
  }

  const data = error.response.data as DrfErrorBody | undefined;
  if (!data) {
    return fallback;
  }

  if (typeof data.detail === 'string' && data.detail) {
    return data.detail;
  }

  for (const value of Object.values(data)) {
    if (Array.isArray(value) && typeof value[0] === 'string') {
      return value[0];
    }
    if (typeof value === 'string' && value) {
      return value;
    }
  }

  return fallback;
}
