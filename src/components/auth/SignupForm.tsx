import { FormEvent, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { BackButton } from '@/components/nav/BackButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const signupHighlights = [
  {
    title: 'Real-time device monitoring',
    description: 'See temperature, humidity, and device health updates as they happen from any device.',
  },
  {
    title: 'Smart automation & alerts',
    description: 'Automate schedules and routines and receive proactive notifications before issues escalate.',
  },
  {
    title: 'Team-ready from day one',
    description: 'Invite team members with granular permissions to collaborate securely.',
  },
];

const RETURN_TO_KEY = 'saphari.returnTo';

export const SignupForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signup } = useAuth();
  const { toast } = useToast();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const passwordTooShort = password.length > 0 && password.length < 8;
  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const disableSubmit =
    !email ||
    !password ||
    !confirmPassword ||
    !acceptTerms ||
    passwordTooShort ||
    passwordMismatch;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!acceptTerms) {
      setFormError('Please accept the terms of service to continue.');
      return;
    }

    if (passwordMismatch) {
      setFormError('Passwords do not match.');
      return;
    }

    if (passwordTooShort) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      const { session } = await signup(email.trim(), password, {
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        company: company.trim() || undefined,
      });

      if (session) {
        const raw =
          sessionStorage.getItem(RETURN_TO_KEY) ||
          (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ||
          '/app/devices';
        sessionStorage.removeItem(RETURN_TO_KEY);
        const allowed =
          raw &&
          (raw.startsWith('/app') || raw === '/master' || raw.startsWith('/master/'));
        navigate(allowed ? raw : '/app/devices', { replace: true });
        return;
      }

      toast({
        title: 'Check your inbox',
        description: 'We\'ve sent a confirmation link to activate your SapHari account.',
      });

      setFirstName('');
      setLastName('');
      setCompany('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setAcceptTerms(false);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'We were unable to create your account. Please try again.';
      setFormError(message);
      toast({
        title: 'Unable to sign you up',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 overflow-hidden rounded-none bg-card shadow-none lg:grid-cols-2 lg:rounded-3xl lg:shadow-2xl">
        <section className="flex flex-col justify-between bg-muted/60 px-4 py-8 sm:px-8 sm:py-12 lg:px-14 lg:py-20">
          <div>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              New to SapHari?
            </span>
            <h1 className="mt-6 text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl lg:text-4xl">
              Bring clarity to every connected space
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
              Create your SapHari account to unlock real-time dashboards, smart automation, and device health alerts—for homes, farms, and businesses.
            </p>
          </div>

          <ul className="mt-10 space-y-5">
            {signupHighlights.map((item) => (
              <li key={item.title} className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm backdrop-blur">
                <CheckCircle2 className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground sm:text-base">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-10 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-5 text-sm text-primary">
            Guided onboarding is available—our specialists can help you connect your first device in minutes.
          </div>
        </section>

        <div className="flex flex-col items-center justify-center bg-background px-4 py-8 sm:px-6 sm:py-12 lg:px-10 lg:py-16">
          <BackButton
            fallback="/login"
            variant="ghost"
            size="sm"
            className="self-start mb-4 text-muted-foreground hover:text-foreground"
          >
            Back to sign in
          </BackButton>
          <Card className="w-full max-w-md border-border/80 shadow-xl">
            <CardHeader className="space-y-3 text-center">
              <CardTitle className="text-3xl font-semibold">Create your SapHari account</CardTitle>
              <CardDescription>
                A confirmation link will arrive in your inbox within a few seconds.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {formError && (
                <Alert variant="destructive" className="mb-6">
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First name</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      placeholder="Asha"
                      disabled={isLoading}
                      autoComplete="given-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      placeholder="Sharma"
                      disabled={isLoading}
                      autoComplete="family-name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company">Organization (optional)</Label>
                  <Input
                    id="company"
                    value={company}
                    onChange={(event) => setCompany(event.target.value)}
                    placeholder="SapHari Greenhouses"
                    disabled={isLoading}
                    autoComplete="organization"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Work email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="email"
                    placeholder="you@example.com"
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <PasswordInput
                      id="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      disabled={isLoading}
                      minLength={8}
                      autoComplete="new-password"
                    />
                    <p className="text-xs text-muted-foreground">Use at least 8 characters for strong security.</p>
                    {passwordTooShort && (
                      <p className="text-xs font-semibold text-destructive">Password must be at least 8 characters long.</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm password</Label>
                    <PasswordInput
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      required
                      disabled={isLoading}
                      autoComplete="new-password"
                    />
                    {passwordMismatch && (
                      <p className="text-xs font-semibold text-destructive">Passwords do not match.</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="terms"
                    checked={acceptTerms}
                    onCheckedChange={(checked) => setAcceptTerms(checked === true)}
                    disabled={isLoading}
                    className="mt-1"
                  />
                  <label htmlFor="terms" className="text-sm leading-tight text-muted-foreground">
                    I agree to the{' '}
                    <span className="font-semibold text-foreground">SapHari Terms of Service</span> and
                    {' '}<span className="font-semibold text-foreground">Privacy Policy</span>.
                  </label>
                </div>

                <Button type="submit" className="w-full" disabled={disableSubmit || isLoading}>
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Creating account...
                    </span>
                  ) : (
                    'Create account'
                  )}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Sign in instead
                </button>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
