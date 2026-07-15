export type AnalyticsConsent = 'granted' | 'denied';

const STORAGE_KEY = 'cavn:analytics-consent';

export function getAnalyticsConsent(): AnalyticsConsent | null {
  const value = localStorage.getItem(STORAGE_KEY);
  return value === 'granted' || value === 'denied' ? value : null;
}

export function setAnalyticsConsent(value: AnalyticsConsent) {
  localStorage.setItem(STORAGE_KEY, value);
  window.dispatchEvent(new CustomEvent('cavn:analytics-consent', { detail: value }));
}

export function hasAnalyticsConsent() {
  return getAnalyticsConsent() === 'granted';
}
