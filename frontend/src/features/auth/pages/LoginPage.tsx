import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoginForm } from '../components/LoginForm';
import { TwoFactorVerify } from '../components/TwoFactorVerify';
import { TwoFactorEnrollment } from '../components/TwoFactorEnrollment';
import { useAuth } from '../hooks/useAuth';
import { SEO } from '@/shared/components/SEO';
import { Card } from '@/shared/components/Card';
import { useLocale } from '@/shared/i18n';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoggingIn, loginError, isAuthenticated } = useAuth();
  const { t } = useLocale();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const [twoFactorData, setTwoFactorData] = useState<{
    userId?: string;
    email: string;
    enrollmentToken?: string;
    challenge?: string;
    setupRequired?: boolean;
  } | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleLogin = async (credentials: { email: string; password: string }) => {
    const result = await login(credentials);
    if (result && 'twofactorSetupRequired' in result && result.twofactorSetupRequired) {
      setTwoFactorData({
        userId: result.userId,
        email: result.email,
        enrollmentToken: result.enrollmentToken,
        setupRequired: true,
      });
    } else if (result && 'twofactorRequired' in result && result.twofactorRequired) {
      if (!result.twofactorChallenge) return;
      setTwoFactorData({
        challenge: result.twofactorChallenge,
        email: result.email,
      });
    }
  };

  const handleCancel2FA = () => {
    setTwoFactorData(null);
  };

  if (twoFactorData) {
    return (
      <>
        <SEO title={t.auth.twoFactorTitle} />
        <main
          id="main-content"
          className="flex min-h-[70vh] items-center justify-center px-4 py-12"
        >
          <Card className="w-full max-w-md p-6">
            {twoFactorData.setupRequired && twoFactorData.enrollmentToken ? (
              <TwoFactorEnrollment
                enrollmentToken={twoFactorData.enrollmentToken}
                email={twoFactorData.email}
                onCompleted={() => setTwoFactorData(null)}
              />
            ) : (
              <TwoFactorVerify
                challenge={twoFactorData.challenge!}
                email={twoFactorData.email}
                onVerified={() => navigate(from, { replace: true })}
                onCancel={handleCancel2FA}
              />
            )}
          </Card>
        </main>
      </>
    );
  }

  return (
    <>
      <SEO title={t.auth.loginTitle} />
      <main id="main-content" className="flex min-h-[70vh] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <img
              src="/logo-cavn.png"
              alt={t.auth.logoAlt}
              className="mx-auto mb-4 h-24 w-auto object-contain"
            />
            <h1 className="text-2xl font-bold text-text">{t.auth.loginTitle}</h1>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {t.auth.restrictedDescription}
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
