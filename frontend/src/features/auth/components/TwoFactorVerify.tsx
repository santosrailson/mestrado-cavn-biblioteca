import { useState } from 'react';
import api from '@/shared/lib/api';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useLocale } from '@/shared/i18n';

interface TwoFactorVerifyProps {
  challenge: string;
  email: string;
  onVerified: () => void;
  onCancel: () => void;
}

export function TwoFactorVerify({ challenge, email, onVerified, onCancel }: TwoFactorVerifyProps) {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [useRecovery, setUseRecovery] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const { t } = useLocale();

  const handleVerify = async () => {
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/2fa/login/', {
        twofactorChallenge: challenge,
        ...(useRecovery ? { recoveryCode: token } : { token }),
      });
      const me = await api.get('/auth/me/');
      setAuth(me.data);
      onVerified();
    } catch {
      setError(t.auth.twoFactorInvalid);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-bold text-text">{t.auth.twoFactorTitle}</h1>
        <p className="mt-2 text-sm text-text-muted">
          {t.auth.twoFactorDescription.replace('{email}', email)}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-danger-border bg-danger-bg p-3 text-sm text-danger-text">
          {error}
        </div>
      )}

      <div>
        <label className="label" htmlFor="2fa-token-login">
          {useRecovery ? t.auth.twoFactorRecoveryCode : t.auth.twoFactorCode}
        </label>
        <input
          id="2fa-token-login"
          type="text"
          inputMode={useRecovery ? 'text' : 'numeric'}
          maxLength={useRecovery ? 11 : 6}
          autoComplete="one-time-code"
          value={token}
          onChange={(e) =>
            setToken(
              useRecovery
                ? e.target.value.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase()
                : e.target.value.replace(/\D/g, '')
            )
          }
          className="input text-center text-2xl tracking-[0.5em]"
          placeholder={useRecovery ? t.auth.twoFactorRecoveryPlaceholder : '000000'}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
        />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleVerify}
          disabled={loading || (useRecovery ? token.length < 8 : token.length !== 6)}
          className="btn-primary flex-1"
        >
          {loading ? t.common.loading : t.auth.twoFactorVerify}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          {t.common.cancel}
        </button>
      </div>
      <button
        type="button"
        className="text-sm text-primary underline"
        onClick={() => {
          setUseRecovery((value) => !value);
          setToken('');
        }}
      >
        {useRecovery ? t.auth.twoFactorUseAuthenticator : t.auth.twoFactorUseRecovery}
      </button>
    </div>
  );
}
