import type { Metric } from 'web-vitals';
import api from './api';

const VITALS_ENDPOINT = '/analytics/vitals/';
const VITALS_SAMPLE_RATE = Number(import.meta.env.VITE_WEB_VITALS_SAMPLE_RATE ?? '0.1');

function shouldReportVitals() {
  return Number.isFinite(VITALS_SAMPLE_RATE) && Math.random() < Math.max(0, Math.min(1, VITALS_SAMPLE_RATE));
}

function sendToBackend(metric: Metric) {
  const body = {
    name: metric.name,
    value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
    rating: metric.rating,
    path: window.location.pathname,
    navigationType: metric.navigationType,
  };

  if (navigator.sendBeacon) {
    const apiBase = api.defaults.baseURL ?? '';
    try {
      navigator.sendBeacon(
        `${apiBase}${VITALS_ENDPOINT}`,
        new Blob([JSON.stringify(body)], { type: 'application/json' })
      );
    } catch {
      // Métricas nunca devem impactar a navegação.
    }
  } else {
    api.post(VITALS_ENDPOINT, body).catch(() => {});
  }
}

export async function reportWebVitals() {
  if (!shouldReportVitals()) return;

  const { onCLS, onFCP, onLCP, onTTFB, onINP } = await import('web-vitals');
  onCLS(sendToBackend);
  onFCP(sendToBackend);
  onLCP(sendToBackend);
  onTTFB(sendToBackend);
  onINP(sendToBackend);
}
