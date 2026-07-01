import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoginForm } from '../components/LoginForm';
import { TwoFactorVerify } from '../components/TwoFactorVerify';
import { useAuth } from '../hooks/useAuth';
import { SEO } from '@/shared/components/SEO';
import { Card } from '@/shared/components/Card';
import ptBR from '@/shared/i18n/pt-BR';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoggingIn, loginError, isAuthenticated } = useAuth();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const [twoFactorData, setTwoFactorData] = useState<{
    userId: string;
    email: string;
  } | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleLogin = async (credentials: { email: string; password: string }) => {
    const result = await login(credentials);
    if (result && 'twofactorRequired' in result && result.twofactorRequired) {
      setTwoFactorData({ userId: result.userId, email: result.email });
    }
  };

  const handleCancel2FA = () => {
    setTwoFactorData(null);
  };

  if (twoFactorData) {
    return (
      <>
        <SEO title="Autenticação de Dois Fatores" />
        <main id="main-content" className="flex min-h-[70vh] items-center justify-center px-4 py-12">
          <Card className="w-full max-w-md p-6">
            <TwoFactorVerify
              userId={twoFactorData.userId}
              email={twoFactorData.email}
              onVerified={() => navigate(from, { replace: true })}
              onCancel={handleCancel2FA}
            />
          </Card>
        </main>
      </>
    );
  }

  return (
    <>
      <SEO title={ptBR.auth.loginTitle} />
      <main id="main-content" className="flex min-h-[70vh] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <img
              src="/logo-cavn.png"
              alt="Logo CAVN"
              className="mx-auto mb-4 h-24 w-auto object-contain"
            />
            <h1 className="text-2xl font-bold text-text">{ptBR.auth.loginTitle}</h1>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Área restrita aos gestores do acervo.
            </p>
          </div>
          <Card className="p-6">
            <LoginForm onSubmit={handleLogin} isLoading={isLoggingIn} error={loginError} />
          </Card>
        </div>
      </main>
    </>
  );
}
