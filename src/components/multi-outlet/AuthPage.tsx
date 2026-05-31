import React, { useState } from 'react';
import { useSession } from '../../application/context/SessionContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Shield, KeyRound, Mail, AlertCircle, Sparkles, Eye, EyeOff } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const { login, users } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setError('');

    // Simulate network delay
    setTimeout(() => {
      const success = login(email, password);
      setIsLoading(false);
      if (!success) {
        setError('Invalid credentials. Incorrect password or no matching email.');
      }
    }, 600);
  };

  const handleQuickLogin = (demoEmail: string) => {
    const matchedUser = users.find(u => u.email.toLowerCase() === demoEmail.toLowerCase());
    const pass = matchedUser?.password || 'password123';
    setEmail(demoEmail);
    setPassword(pass);
    setIsLoading(true);
    setError('');

    setTimeout(() => {
      login(demoEmail, pass);
      setIsLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans select-none relative overflow-hidden">
      
      {/* Decorative medical-themed background elements */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 rounded-full bg-blue-400/5 blur-3xl" />
      <div className="absolute bottom-[-15%] left-[-15%] w-96 h-96 rounded-full bg-indigo-400/5 blur-3xl" />

      <div className="w-full max-w-4xl grid gap-6 md:grid-cols-5 items-start">
        
        {/* Main Login Card */}
        <Card className="border border-border bg-card shadow-lg md:col-span-3 p-2">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/10 mb-3">
              <span className="text-2xl">🏥</span>
            </div>
            <div className="flex items-center justify-center gap-1.5">
              <CardTitle className="text-xl font-black text-slate-900 tracking-tight">
                PharmCare Pro
              </CardTitle>
              <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5 text-[9px] uppercase font-mono py-0 px-1">
                Enterprise
              </Badge>
            </div>
            <CardDescription className="text-xxs uppercase tracking-wider text-muted-foreground mt-1">
              Secure Staff Gateway & Governance Hub
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 pt-2">
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xxs text-destructive font-medium">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground">
                  Staff Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground/60" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. ceo@pharmcare.com"
                    className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 transition"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xxs font-bold uppercase tracking-wider text-muted-foreground">
                  Security Passcode
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground/60" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-10 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 transition"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-3 top-2.5 text-muted-foreground/60 hover:text-primary transition duration-150"
                    aria-label={showPassword ? "Hide passcode" : "Show passcode"}
                  >
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full h-10 text-xs font-bold uppercase tracking-wider mt-2 shadow-md shadow-primary/10"
                disabled={isLoading}
              >
                {isLoading ? 'Verifying Credentials...' : 'Authenticate & Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Demo Accounts Panel */}
        <div className="md:col-span-2 space-y-4">
          <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-md">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5 mb-2">
              <Sparkles className="h-4.5 w-4.5 text-primary" />
              Demo Roles Evaluator
            </h3>
            <p className="text-xxs text-muted-foreground leading-normal mb-4">
              Click any of the registered accounts below to automatically log in and evaluate their respective scopes.
            </p>

            <div className="space-y-2">
              {users.slice(0, 5).map((user) => {
                let badgeVariant: 'destructive' | 'info' | 'primary' | 'success' | 'secondary' = 'primary';
                if (user.role === 'SUPER_ADMIN') badgeVariant = 'destructive';
                else if (user.role === 'REGIONAL_MANAGER') badgeVariant = 'info';
                else if (user.role === 'ADMIN') badgeVariant = 'success';

                return (
                  <button
                    key={user.id}
                    onClick={() => handleQuickLogin(user.email)}
                    disabled={isLoading}
                    className="w-full text-left p-2.5 rounded-xl border border-border/60 hover:border-primary hover:bg-slate-50/50 transition duration-200 flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xxs text-slate-800 group-hover:text-primary transition truncate">
                          {user.name.split(' (')[0]}
                        </span>
                        <Badge variant={badgeVariant} className="text-[7px] py-0 px-1 shrink-0 font-mono tracking-tighter scale-90">
                          {user.role.replace('_', ' ')}
                        </Badge>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono block truncate">
                        {user.email}
                      </span>
                    </div>
                    <Shield className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
