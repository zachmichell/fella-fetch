import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Dog, Loader2, ArrowLeft, ShoppingBag, Mail } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email address');

const ClientLogin = () => {
  const navigate = useNavigate();
  const { signIn, recoverPassword, isAuthenticated, loading: authLoading } = useClientAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoverySent, setRecoverySent] = useState(false);
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/portal');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    const emailResult = emailSchema.safeParse(loginForm.email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }

    if (!loginForm.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);

    try {
      const result = await signIn(loginForm.email, loginForm.password);
      const error = result?.error;

      if (error) {
        // Provide more helpful error messages
        let errorMessage = String(error);
        if (errorMessage.toLowerCase().includes('unidentified customer') || 
            errorMessage.toLowerCase().includes('invalid') ||
            errorMessage.toLowerCase().includes('401')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        }
        
        toast({
          title: 'Sign in failed',
          description: errorMessage,
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Welcome back!' });
        navigate('/portal');
      }
    } catch (err: any) {
      console.error('Login error caught:', err);
      toast({
        title: 'Sign in failed',
        description: 'Invalid email or password. Please check your credentials and try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailResult = emailSchema.safeParse(recoveryEmail);
    if (!emailResult.success) {
      setErrors({ recoveryEmail: emailResult.error.errors[0].message });
      return;
    }
    
    setErrors({});
    setLoading(true);

    try {
      const { error, success } = await recoverPassword(recoveryEmail);

      if (error) {
        toast({
          title: 'Error',
          description: error,
          variant: 'destructive',
        });
      } else if (success) {
        setRecoverySent(true);
        toast({
          title: 'Check your email',
          description: 'If an account exists with this email, you will receive password reset instructions.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col">
      {/* Header */}
      <header className="p-6">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm tracking-wide">Back to home</span>
        </Link>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Dog className="h-8 w-8 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-wider">
              Fella & Fetch
            </h1>
            <p className="text-muted-foreground text-sm tracking-wide mt-1">
              Client Portal
            </p>
          </div>

          <Card className="border-border/50 shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">
                {showForgotPassword ? 'Reset Password' : 'Sign In'}
              </CardTitle>
              <CardDescription>
                {showForgotPassword 
                  ? 'Enter your email to receive reset instructions'
                  : 'Use your Shopify account credentials'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {showForgotPassword ? (
                recoverySent ? (
                  <div className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-2">
                      <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      If an account exists for <strong>{recoveryEmail}</strong>, you will receive an email with instructions to reset your password.
                    </p>
                    <Button
                      variant="outline"
                      className="w-full mt-4"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setRecoverySent(false);
                        setRecoveryEmail('');
                      }}
                    >
                      Back to Sign In
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="recoveryEmail">Email</Label>
                      <Input
                        id="recoveryEmail"
                        type="email"
                        value={recoveryEmail}
                        onChange={(e) => setRecoveryEmail(e.target.value)}
                        placeholder="you@example.com"
                      />
                      {errors.recoveryEmail && (
                        <p className="text-xs text-destructive">{errors.recoveryEmail}</p>
                      )}
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Send Reset Instructions'
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setErrors({});
                      }}
                    >
                      Back to Sign In
                    </Button>
                  </form>
                )
              ) : (
                <>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                        placeholder="you@example.com"
                      />
                      {errors.email && (
                        <p className="text-xs text-destructive">{errors.email}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        <button
                          type="button"
                          className="text-xs text-primary hover:underline"
                          onClick={() => {
                            setShowForgotPassword(true);
                            setRecoveryEmail(loginForm.email);
                            setErrors({});
                          }}
                        >
                          Forgot password?
                        </button>
                      </div>
                      <Input
                        id="password"
                        type="password"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        placeholder="••••••••"
                      />
                      {errors.password && (
                        <p className="text-xs text-destructive">{errors.password}</p>
                      )}
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Sign In'
                      )}
                    </Button>
                  </form>

                  <div className="mt-6 p-4 rounded-lg bg-muted/50 text-center">
                    <ShoppingBag className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Sign in with the same email and password you use for your Shopify account.
                    </p>
                  </div>
                </>
              )}

              <div className="mt-4 pt-4 border-t border-border/50 text-center">
                <Link
                  to="/staff/login"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Staff login →
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default ClientLogin;
