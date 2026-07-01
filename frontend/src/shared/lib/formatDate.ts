import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PrecisaoData } from '@/shared/types';

export function formatDateTimeBR(dateString: string | Date | undefined | null): string {
  if (!dateString) return '-';
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    if (Number.isNaN(date.getTime())) return '-';
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return '-';
  }
}

export function formatDateBR(dateString: string | Date | undefined | null): string {
  if (!dateString) return '-';
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    if (Number.isNaN(date.getTime())) return '-';
    return format(date, 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return '-';
  }
}

export function formatTimelineDate(dataEvento: string, dataPrecisao: PrecisaoData): string {
  const date = parseISO(dataEvento);
  const year = date.getFullYear();

  switch (dataPrecisao) {
    case 'seculo':
      return `${getRomanCentury(year)}`;
    case 'decada':
      return `Década de ${Math.floor(year / 10) * 10}`;
    case 'ano':
      return String(year);
    case 'mes':
      return format(date, "MMMM 'de' yyyy", { locale: ptBR });
    case 'dia':
    default:
      return format(date, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
  }
}

function getRomanCentury(year: number): string {
  const century = Math.ceil(year / 100);
  const roman = toRoman(century);
  return `Século ${roman}`;
}

function toRoman(num: number): string {
  const map: Record<string, number> = {
    M: 1000,
    CM: 900,
    D: 500,
    CD: 400,
    C: 100,
    XC: 90,
    L: 50,
    XL: 40,
    X: 10,
    IX: 9,
    V: 5,
    IV: 4,
    I: 1,
  };
  let result = '';
  for (const [letter, value] of Object.entries(map)) {
    while (num >= value) {
      result += letter;
      num -= value;
    }
  }
  return result;
}
