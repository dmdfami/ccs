/**
 * Login Page - Dashboard authentication form
 * Supports both password and Google OAuth authentication methods.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  Command,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  MonitorSmartphone,
  Moon,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useTranslation } from 'react-i18next';
import { getAuthMethod, type AuthMethod } from '@/lib/auth-api';

export function LoginPage() {
  const { t } = useTranslation();
  const { isDark, setTheme } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [authMethod, setAuthMethod] = useState<AuthMethod>('password');

  const { login, authRequired, isAuthenticated, loading, accessMode, authEnabled } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isSetupState = accessMode === 'setup';
  const heroLabel = isSetupState ? t('auth.remoteGuardLabel') : t('auth.protectedAccessLabel');
  const heroDescription = isSetupState
    ? authEnabled
      ? t('auth.incompleteSetupDescription')
      : t('auth.remoteSetupDescription')
    : authMethod === 'google-oauth'
      ? t('auth.googleLoginDescription')
      : t('auth.loginDescription');

  // Get redirect destination (default to home)
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  // Fetch auth method to determine which login UI to show
  useEffect(() => {
    getAuthMethod()
      .then((res) => setAuthMethod(res.method))
      .catch(() => setAuthMethod('password')); // Fallback to password on error
  }, []);

  // Check for OAuth error params in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get('auth_error');
    if (authError) {
      const errorMap: Record<string, string> = {
        access_denied: t('auth.oauthErrorAccessDenied'),
        email_not_allowed: t('auth.oauthErrorEmailNotAllowed'),
        oauth_failed: t('auth.oauthErrorFailed'),
        missing_code: t('auth.oauthErrorFailed'),
        no_id_token: t('auth.oauthErrorFailed'),
        invalid_token: t('auth.oauthErrorFailed'),
        session_error: t('auth.oauthErrorFailed'),
      };
      setError(errorMap[authError] ?? t('auth.oauthErrorFailed'));
      // Clean up the URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [t]);

  // Redirect if already authenticated or auth not required (via useEffect to avoid render side effects)
  useEffect(() => {
    if (loading) {
      return;
    }
    if (isAuthenticated || !authRequired) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, authRequired, loading, navigate, from]);

  // Show nothing while redirecting
  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
        <div className="flex items-center gap-3 rounded-full border border-border/80 bg-card/90 px-5 py-3 text-sm text-muted-foreground shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('auth.loading')}
        </div>
      </div>
    );
  }

  if (isAuthenticated || !authRequired) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.loginFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(167,85,52,0.16),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(39,39,42,0.12),transparent_48%)]" />
      <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(127,117,107,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(127,117,107,0.14)_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="relative mx-auto flex min-h-[100dvh] max-w-6xl items-center px-4 py-8 sm:px-6">
        <div className="grid w-full items-stretch gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,430px)]">
          <section className="flex flex-col justify-between rounded-[28px] border border-border/70 bg-card/85 p-6 shadow-[0_24px_80px_-48px_rgba(68,48,34,0.55)] backdrop-blur sm:p-8">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border/70 bg-background/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                  {heroLabel}
                </span>

                <div className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/75 p-1 shadow-sm backdrop-blur">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'rounded-full px-3 text-xs font-semibold',
                      !isDark && 'bg-card text-foreground shadow-sm'
                    )}
                    aria-pressed={!isDark}
                    onClick={() => setTheme('light')}
                  >
                    <Sun className="h-3.5 w-3.5" />
                    {t('auth.lightMode')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'rounded-full px-3 text-xs font-semibold',
                      isDark && 'bg-card text-foreground shadow-sm'
                    )}
                    aria-pressed={isDark}
                    onClick={() => setTheme('dark')}
                  >
                    <Moon className="h-3.5 w-3.5" />
                    {t('auth.darkMode')}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <h1 className="max-w-xl text-4xl font-semibold tracking-[-0.04em] text-balance text-foreground sm:text-5xl">
                  {isSetupState ? t('auth.remoteSetupTitle') : t('auth.dashboardTitle')}
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                  {heroDescription}
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <MonitorSmartphone className="mb-3 h-4 w-4 text-accent" />
                <p>{t('auth.safetyNoteRemote')}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <Lock className="mb-3 h-4 w-4 text-accent" />
                <p>{t('auth.safetyNoteLocal')}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <ShieldCheck className="mb-3 h-4 w-4 text-accent" />
                <p>{t('auth.safetyNoteSession')}</p>
              </div>
            </div>
          </section>

          <Card className="justify-center rounded-[28px] border-border/70 bg-card/95 py-0 shadow-[0_24px_90px_-54px_rgba(34,24,16,0.62)]">
            <CardHeader className="space-y-3 border-b border-border/70 px-6 py-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10">
                {isSetupState ? (
                  <MonitorSmartphone className="h-5 w-5 text-accent" />
                ) : (
                  <Lock className="h-5 w-5 text-accent" />
                )}
              </div>
              <div className="space-y-1.5">
                <CardTitle className="text-2xl tracking-[-0.03em]">
                  {isSetupState ? t('auth.remoteSetupTitle') : t('auth.dashboardTitle')}
                </CardTitle>
                <CardDescription className="text-sm leading-6 text-muted-foreground">
                  {isSetupState ? heroDescription : t('auth.credentialsHint')}
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-5 px-6 py-6">
              {isSetupState ? (
                <>
                  <Alert
                    variant="warning"
                    className="rounded-2xl border-yellow-300/70 bg-yellow-50/80"
                  >
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{t('auth.noDefaultCredentials')}</AlertTitle>
                    <AlertDescription>{t('auth.credentialsHint')}</AlertDescription>
                  </Alert>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-border/70 bg-background/75 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Command className="h-4 w-4 text-accent" />
                        {t('auth.hostStepTitle')}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {t('auth.hostStepDescription')}
                      </p>
                      <code className="mt-4 block rounded-xl border border-border/70 bg-muted/60 px-3 py-2 font-mono text-[13px] text-foreground">
                        ccs config auth setup
                      </code>
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-background/75 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <ShieldCheck className="h-4 w-4 text-accent" />
                        {t('auth.localStepTitle')}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {t('auth.localStepDescription')}
                      </p>
                    </div>
                  </div>
                </>
              ) : authMethod === 'google-oauth' ? (
                <div className="space-y-4">
                  {error && (
                    <Alert variant="destructive" className="rounded-2xl">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Alert variant="info" className="rounded-2xl border-blue-200/80 bg-blue-50/80">
                    <ShieldCheck className="h-4 w-4" />
                    <AlertTitle>{t('auth.googleWhitelistTitle')}</AlertTitle>
                    <AlertDescription>{t('auth.googleWhitelistDescription')}</AlertDescription>
                  </Alert>

                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 w-full rounded-2xl text-sm font-semibold"
                    onClick={() => {
                      window.location.href = '/api/auth/google';
                    }}
                  >
                    <svg
                      className="mr-2 h-4 w-4"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    {t('auth.signInWithGoogle')}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <Alert variant="destructive" className="rounded-2xl">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Alert variant="info" className="rounded-2xl border-blue-200/80 bg-blue-50/80">
                    <ShieldCheck className="h-4 w-4" />
                    <AlertTitle>{t('auth.noDefaultCredentials')}</AlertTitle>
                    <AlertDescription>{t('auth.credentialsHint')}</AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm font-semibold">
                      {t('auth.username')}
                    </Label>
                    <Input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={t('auth.usernamePlaceholder')}
                      autoComplete="username"
                      className="h-12 rounded-2xl border-border/80 bg-background/85 px-4 text-base md:text-base"
                      disabled={submitting}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-semibold">
                      {t('auth.password')}
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t('auth.passwordPlaceholder')}
                        autoComplete="current-password"
                        className="h-12 rounded-2xl border-border/80 bg-background/85 px-4 pr-14 text-base md:text-base"
                        disabled={submitting}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute inset-y-1 right-1 h-auto rounded-xl px-3 text-muted-foreground hover:text-foreground"
                        aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                        aria-pressed={showPassword}
                        onClick={() => setShowPassword((value) => !value)}
                        disabled={submitting}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="h-12 w-full rounded-2xl text-sm font-semibold"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('auth.signingIn')}
                      </>
                    ) : (
                      t('auth.signIn')
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
