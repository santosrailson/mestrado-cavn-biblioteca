import { useState } from 'react';
import api from '@/shared/lib/api';
import { useAuthStore } from '@/features/auth/stores/authStore';
import ptBR from '@/shared/i18n/pt-BR';

interface TwoFactorVerifyProps {
  userId: string;
  email: string;
  onVerified: () => void;
  onCancel: () => void;
}

export function TwoFactorVerify({ userId, email, onVerified, onCancel }: TwoFactorVerifyProps) {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleVerify = async () => {
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/2fa/login/', { user_id: userId, token });
      const me = await api.get('/auth/me/');
      setAuth(me.data);
      onVerified();
    } catch {
      setError('Código inválido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-bold text-text">Autenticação de Dois Fatores</h1>
        <p className="mt-2 text-sm text-text-muted">
          Insira o código do seu aplicativo autenticador para {email}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-danger-border bg-danger-bg p-3 text-sm text-danger-text">
          {error}
        </div>
      )}

      <div>
        <label className="label" htmlFor="2fa-token-login">
          Código 2FA
        </label>
        <input
          id="2fa-token-login"
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={token}
          onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
          className="input text-center text-2xl tracking-[0.5em]"
          placeholder="000000"
          autoFocus
        />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleVerify}
          disabled={token.length !== 6 || loading}
          className="btn-primary flex-1"
        >
          {loading ? ptBR.common.loading : 'Verificar'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary"
        >
          {ptBR.common.cancel}
        </button>
      </div>
    </div>
  );
}
