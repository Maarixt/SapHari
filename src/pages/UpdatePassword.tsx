import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PasswordInput } from '@/components/ui/password-input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { BetaBadge } from '@/components/beta/BetaBadge';
import { BackButton } from '@/components/nav/BackButton';

export default function UpdatePassword() {
  const { isPasswordRecovery } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { setRecoveryHandled } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password !== confirm) {
      toast({
        title: 'Passwords do not match',
        description: 'Please enter the same password in both fields.',
        variant: 'destructive',
      });
      return;
    }
    if (password.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Use at least 6 characters.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setRecoveryHandled();
      toast({
        title: 'Password updated',
        description: 'You can now sign in with your new password.',
      });
      navigate('/login', { replace: true });
    } catch (err: unknown) {
      toast({
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Something went wrong. Try the reset link again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isPasswordRecovery) {
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
            <CardDescription>Set new password</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              Use the link from your password reset email to set a new password on this page.
            </p>
            <div className="mt-4 text-center">
              <Button variant="link" onClick={() => navigate('/login')} className="text-teal-600 dark:text-teal-400">
                Back to sign in
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <CardDescription>Choose a new password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={6}
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <PasswordInput
                id="confirm"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                disabled={isLoading}
                minLength={6}
                className="bg-background/50"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white shadow-lg"
              disabled={isLoading}
            >
              {isLoading ? 'Updating…' : 'Update password'}
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
