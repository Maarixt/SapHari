/**
 * Forgot password: sends a reset email via Supabase.
 * - Redirect URL for the reset link must be allowed in Supabase Dashboard → Authentication → URL Configuration
 *   (e.g. https://saphari-connect.com/update-password and http://localhost:5173/update-password).
 * - Email template in Dashboard should use {{ .ConfirmationURL }} for the reset link.
 */
import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BetaBadge } from '@/components/beta/BetaBadge';
import { BackButton } from '@/components/nav/BackButton';

const COOLDOWN_SECONDS = 10;

export default function ForgotPassword() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
  const redirectTo = `${baseUrl}/update-password`;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isLoading || cooldownLeft > 0) return;

      setIsLoading(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo,
        });
        if (error) throw error;

        toast({
          title: 'Check your email',
          description:
            'If that email exists in our system, we sent a reset link. Check spam if you don’t see it.',
        });
        setCooldownLeft(COOLDOWN_SECONDS);
      } catch (err: unknown) {
        // Same message for security: don't reveal whether the email exists
        toast({
          title: 'Check your email',
          description:
            'If that email exists in our system, we sent a reset link. Check spam if you don’t see it.',
        });
        setCooldownLeft(COOLDOWN_SECONDS);
      } finally {
        setIsLoading(false);
      }
    },
    [email, isLoading, cooldownLeft, redirectTo, toast]
  );

  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const t = setInterval(() => {
      setCooldownLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [cooldownLeft]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4 pt-14">
      <div className="absolute left-4 top-4">
        <BackButton fallback="/login" variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" />
      </div>
      <Card className="w-full max-w-md bg-card/80 backdrop-blur-md border-border/50 shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl bg-gradient-to-r from-teal-600 to-cyan-600 dark:from-teal-400 dark:to-cyan-400 bg-clip-text text-transparent flex items-center justify-center gap-2">
            🌐 SapHari Dashboard
            <BetaBadge size="md" />
          </CardTitle>
          <CardDescription>Reset your password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading || cooldownLeft > 0}
                placeholder="you@example.com"
                className="bg-background/50"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white shadow-lg"
              disabled={isLoading || cooldownLeft > 0}
            >
              {isLoading
                ? 'Sending…'
                : cooldownLeft > 0
                  ? `Resend in ${cooldownLeft}s`
                  : 'Send reset link'}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Button
              variant="link"
              onClick={() => navigate('/login')}
              disabled={isLoading}
              className="text-teal-600 dark:text-teal-400"
            >
              Back to sign in
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
