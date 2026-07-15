import api from './api';
import { hasAnalyticsConsent } from './analyticsConsent';

type AnalyticsProperties = Record<string, string | number | boolean | undefined>;

const ENDPOINT = '/analytics/events/';

export function trackEvent(name: string, properties: AnalyticsProperties = {}) {
  if (!hasAnalyticsConsent()) return;
  const body = JSON.stringify({ name, properties, path: window.location.pathname });
  try {
    if (navigator.sendBeacon) {
      const apiBase = api.defaults.baseURL ?? '';
      navigator.sendBeacon(`${apiBase}${ENDPOINT}`, new Blob([body], { type: 'application/json' }));
      return;
    }
    void api.post(ENDPOINT, JSON.parse(body)).catch(() => {});
  } catch {
    // Telemetria nunca deve interromper a experiência do usuário.
  }
}
