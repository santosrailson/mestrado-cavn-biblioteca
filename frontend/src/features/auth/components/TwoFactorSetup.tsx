import { useState, useEffect } from 'react';
import api from '@/shared/lib/api';
import { useLocale } from '@/shared/i18n';

function svgToBase64PngUrl(svg: string): string {
  // O backend já gera SVG seguro, mas nunca confiamos em HTML injetado.
  // Convertemos para uma URL de dados base64, que o navegador trata como imagem,
  // eliminando a superfície de XSS do dangerouslySetInnerHTML.
  const base64 = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${base64}`;
}

interface TwoFactorData {
  twofactorAtiva: boolean;
  provisioningUri?: string;
  qrCodeSvg?: string;
  deviceId?: string;
}

export function TwoFactorSetup() {
  const { t } = useLocale();
  const [data, setData] = useState<TwoFactorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  useEffect(() => {
    api
      .get('/auth/2fa/status/')
      .then((res) => setData(res.data))
      .catch(() => setError(t.auth.twoFactorStatusError))
      .finally(() => setLoading(false));
  }, [t.auth.twoFactorStatusError]);

  const handleSetup = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/2fa/setup/');
      setData((prev) => ({
        ...prev!,
        provisioningUri: res.data.provisioningUri,
        qrCodeSvg: res.data.qrCodeSvg,
        deviceId: res.data.deviceId,
        twofactorAtiva: false,
      }));
    } catch {
      setError(t.auth.twoFactorSetupError);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError('');
    try {
      const response = await api.post('/auth/2fa/verify-setup/', { token });
      setData((prev) => ({ ...prev!, twofactorAtiva: true }));
      setRecoveryCodes(response.data.codigosRecuperacao ?? []);
      setSuccess(t.auth.twoFactorSuccess);
      setToken('');
    } catch {
      setError(t.auth.twoFactorInvalid);
    }
  };

  const handleDisable = async () => {
    setError('');
    try {
      await api.post('/auth/2fa/disable/');
      setData({ twofactorAtiva: false });
      setSuccess(t.auth.twoFactorDisabled);
    } catch {
      setError(t.auth.twoFactorDisableError);
    }
  };

  if (loading) return <p className="text-sm text-text-muted">{t.common.loading}</p>;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-text">{t.auth.twoFactorTitle}</h3>

      {error && (
        <div className="rounded-lg border border-danger-border bg-danger-bg p-3 text-sm text-danger-text">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-success-border bg-success-bg p-3 text-sm text-success-text">
          {success}
        </div>
      )}

      {recoveryCodes.length > 0 && (
        <div
          className="space-y-3 rounded-lg border border-warning-border bg-warning-bg p-4 text-sm"
          role="alert"
        >
          <h4 className="font-semibold text-warning-text">{t.auth.twoFactorRecoveryCodesTitle}</h4>
          <p className="text-warning-text">{t.auth.twoFactorRecoveryCodesWarning}</p>
          <ul
            className="grid gap-1 font-mono sm:grid-cols-2"
            aria-label={t.auth.twoFactorRecoveryCode}
          >
            {recoveryCodes.map((code) => (
              <li key={code}>{code}</li>
            ))}
          </ul>
        </div>
      )}

      {data.twofactorAtiva ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-success" />
            <span className="text-sm text-text">{t.auth.twoFactorActive}</span>
          </div>
          <button type="button" onClick={handleDisable} className="btn-secondary text-sm">
            {t.auth.twoFactorDisable}
          </button>
        </div>
      ) : data.qrCodeSvg ? (
        <div className="space-y-4">
          <p className="text-sm text-text-muted">{t.auth.twoFactorScanInstructions}</p>
          <img
            src={svgToBase64PngUrl(data.qrCodeSvg)}
            alt={t.auth.twoFactorSetupInstructions}
            className="mx-auto w-56"
          />
          <div>
            <label className="label" htmlFor="2fa-token">
              {t.auth.twoFactorVerificationCode}
            </label>
            <input
              id="2fa-token"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
              className="input w-40 text-center text-lg tracking-widest"
              placeholder="000000"
            />
          </div>
          <button
            type="button"
            onClick={handleVerify}
            disabled={token.length !== 6}
            className="btn-primary"
          >
            {t.auth.twoFactorVerifyAndActivate}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-text-muted">{t.auth.twoFactorProtectDescription}</p>
          <button type="button" onClick={handleSetup} className="btn-primary">
            {t.auth.twoFactorConfigure}
          </button>
        </div>
      )}
    </div>
  );
}
