import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { TwoFactorSetup } from '@/features/auth/components/TwoFactorSetup';
import { Card } from '@/shared/components/Card';
import { SectionHeader } from '@/shared/components/Section';
import { Breadcrumb } from '@/shared/components/Breadcrumb';
import { canCatalog, canAdminister } from '@/features/auth/lib/permissions';
import adminApi from '../api/adminApi';
import { useQuery } from '@tanstack/react-query';
import { useLocale } from '@/shared/i18n';
import api from '@/shared/lib/api';

function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  const { t } = useLocale();
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input pr-10"
          placeholder={placeholder ?? '••••••••'}
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
          aria-label={show ? t.accessibility.hidePassword : t.accessibility.showPassword}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function AdminPasswordForm() {
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { t } = useLocale();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (novaSenha !== confirmar) {
      setError(t.admin.passwordMismatch);
      return;
    }
    if (novaSenha.length < 8) {
      setError(t.admin.passwordMinLength);
      return;
    }
    setLoading(true);
    try {
      await adminApi.alterarSenha({ senhaAtual, novaSenha });
      setSuccess(t.admin.passwordChanged);
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmar('');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setError(axiosError?.response?.data?.detail ?? t.admin.passwordChangeError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-base font-semibold text-slate-800">{t.admin.changePassword}</h2>
      {error && (
        <p className="rounded-lg border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger-text">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg border border-success-border bg-success-bg px-3 py-2 text-sm text-success-text">
          {success}
        </p>
      )}
      <PasswordField
        id="senha-atual"
        label={t.admin.currentPassword}
        value={senhaAtual}
        onChange={setSenhaAtual}
      />
      <PasswordField
        id="nova-senha"
        label={t.admin.newPassword}
        value={novaSenha}
        onChange={setNovaSenha}
      />
      <PasswordField
        id="confirmar-senha"
        label={t.admin.confirmNewPassword}
        value={confirmar}
        onChange={setConfirmar}
      />
      <button
        type="submit"
        disabled={loading || !senhaAtual || !novaSenha || !confirmar}
        className="btn-primary w-full"
      >
        {loading ? t.admin.saving : t.admin.changePassword}
      </button>
    </form>
  );
}

function UserPasswordRequestForm() {
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { t } = useLocale();

  const { data: statusData, refetch } = useQuery({
    queryKey: ['status-solicitacao-senha'],
    queryFn: adminApi.statusSolicitacaoSenha,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (novaSenha !== confirmar) {
      setError(t.admin.passwordMismatch);
      return;
    }
    if (novaSenha.length < 8) {
      setError(t.admin.passwordMinLength);
      return;
    }
    setLoading(true);
    try {
      await adminApi.solicitarSenha(novaSenha);
      setSuccess(t.admin.passwordRequestSent);
      setNovaSenha('');
      setConfirmar('');
      refetch();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setError(axiosError?.response?.data?.detail ?? t.admin.passwordRequestError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-slate-800">{t.admin.changePassword}</h2>

      {statusData?.status === 'pendente' && (
        <div className="rounded-lg border border-warning-border bg-warning-bg px-3 py-2 text-sm text-warning-text">
          {t.admin.pendingPasswordDescription}
        </div>
      )}
      {statusData?.status === 'aprovada' && (
        <div className="rounded-lg border border-success-border bg-success-bg px-3 py-2 text-sm text-success-text">
          {t.admin.approvedPasswordMessage}
        </div>
      )}
      {statusData?.status === 'rejeitada' && (
        <div className="rounded-lg border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger-text">
          {t.admin.rejectedPasswordMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-text-muted">{t.admin.passwordRequestInstructions}</p>
        {error && (
          <p className="rounded-lg border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger-text">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-lg border border-success-border bg-success-bg px-3 py-2 text-sm text-success-text">
            {success}
          </p>
        )}
        <PasswordField
          id="nova-senha-req"
          label={t.admin.requestedPassword}
          value={novaSenha}
          onChange={setNovaSenha}
        />
        <PasswordField
          id="confirmar-senha-req"
          label={t.admin.confirmNewPassword}
          value={confirmar}
          onChange={setConfirmar}
        />
        <button
          type="submit"
          disabled={loading || !novaSenha || !confirmar}
          className="btn-primary w-full"
        >
          {loading ? t.admin.sending : t.admin.requestPassword}
        </button>
      </form>
    </div>
  );
}

function PrivacyRightsPanel() {
  const { t } = useLocale();
  const [type, setType] = useState('acesso');
  const [description, setDescription] = useState('');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { data, refetch } = useQuery({
    queryKey: ['privacy-requests'],
    queryFn: async () => (await api.get('/auth/privacy/requests/')).data,
  });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setFeedback('');
    setError('');
    try {
      await api.post('/auth/privacy/requests/', { tipo: type, descricao: description });
      setDescription('');
      setFeedback(t.legal.privacyRequestSuccess);
      await refetch();
    } catch (requestError: unknown) {
      const detail = (requestError as { response?: { data?: { detail?: string } } })?.response?.data
        ?.detail;
      setError(detail ?? t.legal.privacyRequestError);
    } finally {
      setLoading(false);
    }
  };

  const download = async () => {
    try {
      const response = await api.get('/auth/privacy/export/', { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'cavn-dados-pessoais.json';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(t.legal.privacyExportError);
    }
  };

  return (
    <Card className="lg:col-span-2">
      <h2 className="mb-2 text-base font-semibold text-text">{t.legal.privacyCenterTitle}</h2>
      <p className="mb-5 text-sm text-text-muted">{t.legal.privacyCenterDescription}</p>
      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label" htmlFor="privacy-request-type">
              {t.legal.privacyRequestType}
            </label>
            <select
              id="privacy-request-type"
              className="input"
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              {Object.entries(t.legal.privacyTypes).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="privacy-request-description">
              {t.legal.privacyRequestDescription}
            </label>
            <textarea
              id="privacy-request-description"
              className="input min-h-28"
              required
              minLength={10}
              maxLength={4000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          {feedback && (
            <p
              className="rounded-lg border border-success-border bg-success-bg px-3 py-2 text-sm text-success-text"
              role="status"
            >
              {feedback}
            </p>
          )}
          {error && (
            <p
              className="rounded-lg border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger-text"
              role="alert"
            >
              {error}
            </p>
          )}
          <button
            className="btn-primary"
            type="submit"
            disabled={loading || description.trim().length < 10}
          >
            {t.legal.privacyRequestSubmit}
          </button>
        </form>
        <div className="space-y-4">
          <button className="btn-outline" type="button" onClick={download}>
            {t.legal.privacyExport}
          </button>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-text">{t.legal.privacyRequestsTitle}</h3>
            {data?.length ? (
              <ul className="space-y-2 text-sm">
                {data.map((item: { id: string; tipoLabel: string; statusLabel: string }) => (
                  <li key={item.id} className="rounded border border-border p-2">
                    <span className="font-medium">{item.tipoLabel}</span> — {item.statusLabel}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-text-muted">{t.legal.privacyNoRequests}</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function ProfilePage() {
  const { user } = useAuth();
  const isAdmin = canAdminister(user);
  const { t } = useLocale();

  return (
    <>
      <Breadcrumb items={[{ label: t.admin.profile }]} className="mb-6" />
      <SectionHeader
        title={t.admin.profile}
        titleId="profile-title"
        subtitle={t.admin.accountData}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-base font-semibold text-slate-800">{t.admin.accountData}</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 font-medium text-slate-500">{t.admin.name}</dt>
              <dd className="text-slate-900">{user?.nome ?? '—'}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 font-medium text-slate-500">{t.auth.email}</dt>
              <dd className="text-slate-900">{user?.email ?? '—'}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 font-medium text-slate-500">{t.admin.profile}</dt>
              <dd className="text-slate-900">
                {user?.perfil ? (t.admin.profiles[user.perfil] ?? user.perfil) : '—'}
              </dd>
            </div>
          </dl>
        </Card>

        <Card>{isAdmin ? <AdminPasswordForm /> : <UserPasswordRequestForm />}</Card>

        {canCatalog(user) && (
          <Card>
            <TwoFactorSetup />
          </Card>
        )}

        <PrivacyRightsPanel />
      </div>
    </>
  );
}
