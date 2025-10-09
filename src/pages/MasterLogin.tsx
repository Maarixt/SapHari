import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Lock, KeyRound, AlertTriangle } from 'lucide-react';
import { useMasterAccount } from '@/hooks/useMasterAccount';

export default function MasterLogin() {
  const navigate = useNavigate();
  const { loginAsMaster, isLoading, error } = useMasterAccount();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [showTwoFactor, setShowTwoFactor] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const success = await loginAsMaster(email, password, twoFactorCode);
    if (success) {
      navigate('/');
    } else if (!showTwoFactor && email && password) {
      setShowTwoFactor(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <Card className="w-full max-w-md border-primary/20 shadow-2xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto p-4 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-full w-fit">
            <Shield className="h-12 w-12 text-amber-600" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              Master Account Access
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Level 0 Root Authentication Required
            </CardDescription>
          </div>
          
          {/* Security Warning */}
          <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-yellow-800 dark:text-yellow-200 text-left">
                Master accounts have full system access. All actions are logged and audited.
              </p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                Master Email
              </Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="master@saphari.com"
                className="border-primary/20 focus:border-primary"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Master Password
              </Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter master password"
                className="border-primary/20 focus:border-primary"
              />
            </div>
            
            {showTwoFactor && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <Label htmlFor="twoFactor" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  2FA Code (Optional)
                </Label>
                <Input
                  id="twoFactor"
                  type="text"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  placeholder="123456"
                  className="border-primary/20 focus:border-primary"
                  maxLength={6}
                />
                <p className="text-xs text-muted-foreground">
                  Valid codes: 123456, 654321, 111111, 789012
                </p>
              </div>
            )}

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 animate-in fade-in slide-in-from-top-2">
                <p className="text-sm text-destructive font-medium">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-semibold h-11"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Authenticating...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Access Master Panel
                </span>
              )}
            </Button>
          </form>
          
          <div className="mt-6 pt-6 border-t border-border">
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => navigate('/login')}
            >
              Back to Normal Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
