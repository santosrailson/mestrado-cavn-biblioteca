import { useEffect, useState } from 'react';
import { useLocale } from '@/shared/i18n';
import { getAnalyticsConsent, setAnalyticsConsent } from '@/shared/lib/analyticsConsent';

export function AnalyticsConsentBanner() {
  const { t } = useLocale();
  const [visible, setVisible] = useState(() => getAnalyticsConsent() === null);

  useEffect(() => {
    const refresh = () => setVisible(getAnalyticsConsent() === null);
    window.addEventListener('cavn:analytics-consent', refresh);
    return () => window.removeEventListener('cavn:analytics-consent', refresh);
  }, []);

  if (!visible) return null;

  const choose = (value: 'granted' | 'denied') => {
    setAnalyticsConsent(value);
    setVisible(false);
  };

  return (
    <aside
      className="fixed inset-x-4 bottom-4 z-[90] mx-auto max-w-2xl rounded-xl border border-border bg-bg p-4 shadow-md"
      role="dialog"
      aria-labelledby="analytics-consent-title"
    >
      <h2 id="analytics-consent-title" className="font-semibold text-text">
        {t.analytics.consentTitle}
      </h2>
      <p className="mt-1 text-sm text-text-muted">{t.analytics.consentDescription}</p>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={() => choose('denied')}>
          {t.analytics.deny}
        </button>
        <button type="button" className="btn-primary" onClick={() => choose('granted')}>
          {t.analytics.allow}
        </button>
      </div>
    </aside>
  );
}
