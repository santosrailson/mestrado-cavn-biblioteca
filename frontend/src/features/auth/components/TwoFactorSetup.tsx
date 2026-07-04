import { useState, useEffect } from 'react';
import api from '@/shared/lib/api';
import ptBR from '@/shared/i18n/pt-BR';

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
  const [data, setData] = useState<TwoFactorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.get('/auth/2fa/status/')
      .then((res) => setData(res.data))
      .catch(() => setError('Erro ao carregar status 2FA'))
      .finally(() => setLoading(false));
  }, []);

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
      setError('Erro ao gerar chave 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError('');
    try {
      await api.post('/auth/2fa/verify-setup/', { token });
      setData((prev) => ({ ...prev!, twofactorAtiva: true }));
      setSuccess('2FA ativado com sucesso!');
      setToken('');
    } catch {
      setError('Token inválido. Tente novamente.');
    }
  };

  const handleDisable = async () => {
    setError('');
    try {
      await api.post('/auth/2fa/disable/');
      setData({ twofactorAtiva: false });
      setSuccess('2FA desativado.');
    } catch {
      setError('Erro ao desativar 2FA');
    }
  };

  if (loading) return <p className="text-sm text-text-muted">{ptBR.common.loading}</p>;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-text">
        Autenticação de Dois Fatores (2FA)
      </h3>

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

      {data.twofactorAtiva ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-success" />
            <span className="text-sm text-text">2FA está ativo</span>
          </div>
          <button
            type="button"
            onClick={handleDisable}
            className="btn-secondary text-sm"
          >
            Desativar 2FA
          </button>
        </div>
      ) : data.qrCodeSvg ? (
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            Escaneie o QR code com seu aplicativo autenticador (Google Authenticator, Authy, etc.)
          </p>
          <img
            src={svgToBase64PngUrl(data.qrCodeSvg)}
            alt="QR code para configurar autenticação de dois fatores"
            className="mx-auto w-56"
          />
          <div>
            <label className="label" htmlFor="2fa-token">
              Código de verificação
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
            Verificar e ativar
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            Proteja sua conta com autenticação de dois fatores.
          </p>
          <button
            type="button"
            onClick={handleSetup}
            className="btn-primary"
          >
            Configurar 2FA
          </button>
        </div>
      )}
    </div>
  );
}
