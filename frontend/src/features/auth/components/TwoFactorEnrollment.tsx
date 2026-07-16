import { useEffect, useState } from 'react';
import api from '@/shared/lib/api';
import { useLocale } from '@/shared/i18n';

function svgToDataUrl(svg: string): string {
  const base64 = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${base64}`;
}

interface TwoFactorEnrollmentProps {
  enrollmentToken: string;
  email: string;
  onCompleted: () => void;
}

interface EnrollmentData {
  provisioningUri: string;
  qrCodeSvg: string;
  deviceId: string;
}

export function TwoFactorEnrollment({
  enrollmentToken,
  email,
  onCompleted,
}: TwoFactorEnrollmentProps) {
  const { t } = useLocale();
  const [data, setData] = useState<EnrollmentData | null>(null);
  const [token, setToken] = useState('');
  const [codes, setCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .post('/auth/2fa/enroll/setup/', { enrollmentToken })
      .then((response) => setData(response.data))
      .catch(() => setError(t.auth.twoFactorEnrollmentExpired))
      .finally(() => setLoading(false));
  }, [enrollmentToken, t.auth.twoFactorEnrollmentExpired]);

  const verify = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/auth/2fa/enroll/verify/', {
        enrollmentToken,
        deviceId: data?.deviceId,
        token,
      });
      setCodes(response.data.codigosRecuperacao ?? []);
    } catch {
      setError(t.auth.twoFactorInvalid);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) return <p role="status">{t.common.loading}</p>;

  if (codes.length > 0) {
    return (
      <div className="space-y-5">
        <h1 className="text-xl font-bold text-text">{t.auth.twoFactorRecoveryCodesTitle}</h1>
        <p className="text-sm text-text-muted">{t.auth.twoFactorRecoveryCodesWarning}</p>
        <ul
          className="grid grid-cols-2 gap-2 rounded-lg bg-surface p-4 font-mono text-sm"
          aria-label={t.auth.twoFactorRecoveryCodesTitle}
        >
          {codes.map((code) => (
            <li key={code}>{code}</li>
          ))}
        </ul>
        <button type="button" className="btn-primary w-full" onClick={onCompleted}>
          {t.auth.twoFactorContinue}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-text">{t.auth.twoFactorSetupRequired}</h1>
        <p className="mt-2 text-sm text-text-muted">{t.auth.twoFactorSetupDescription}</p>
        <p className="mt-2 text-sm text-text-muted">{t.auth.twoFactorSetupInstructions}</p>
        <p className="mt-1 text-xs text-text-muted">{email}</p>
      </div>
      {error && (
        <p className="rounded-lg bg-danger-bg p-3 text-sm text-danger-text" role="alert">
          {error}
        </p>
      )}
      {data && (
        <>
          <img
            src={svgToDataUrl(data.qrCodeSvg)}
            alt={t.auth.twoFactorSetupRequired}
            className="mx-auto w-56"
          />
          <label className="label" htmlFor="enrollment-2fa-token">
            {t.auth.twoFactorCode}
          </label>
          <input
            id="enrollment-2fa-token"
            className="input text-center text-2xl tracking-[0.5em]"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={token}
            onChange={(event) => setToken(event.target.value.replace(/\D/g, ''))}
          />
          <button
            type="button"
            className="btn-primary w-full"
            disabled={loading || token.length !== 6}
            onClick={verify}
          >
            {t.auth.twoFactorVerify}
          </button>
        </>
      )}
    </div>
  );
}
