import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Dog, Loader2, ArrowLeft, Mail } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const nameSchema = z.string().min(1, 'This field is required');

const ClientLogin = () => {
  const navigate = useNavigate();
  const { signIn, signUp, isAuthenticated, loading: authLoading, user } = useClientAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  });
  const [signupForm, setSignupForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/portal');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const validateLoginForm = () => {
    const newErrors: Record<string, string> = {};

    const emailResult = emailSchema.safeParse(loginForm.email);
    if (!emailResult.success) {
      newErrors.loginEmail = emailResult.error.errors[0].message;
    }

    const passwordResult = z.string().min(1, 'Password is required').safeParse(loginForm.password);
    if (!passwordResult.success) {
      newErrors.loginPassword = passwordResult.error.errors[0].message;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateSignupForm = () => {
    const newErrors: Record<string, string> = {};

    const firstNameResult = nameSchema.safeParse(signupForm.firstName);
    if (!firstNameResult.success) {
      newErrors.firstName = firstNameResult.error.errors[0].message;
    }

    const lastNameResult = nameSchema.safeParse(signupForm.lastName);
    if (!lastNameResult.success) {
      newErrors.lastName = lastNameResult.error.errors[0].message;
    }

    const emailResult = emailSchema.safeParse(signupForm.email);
    if (!emailResult.success) {
      newErrors.signupEmail = emailResult.error.errors[0].message;
    }

    const passwordResult = passwordSchema.safeParse(signupForm.password);
    if (!passwordResult.success) {
      newErrors.signupPassword = passwordResult.error.errors[0].message;
    }

    if (signupForm.password !== signupForm.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateLoginForm()) return;

    setLoading(true);

    try {
      const { error } = await signIn(loginForm.email, loginForm.password);

      if (error) {
        toast({
          title: 'Sign in failed',
          description: error,
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Welcome back!' });
        navigate('/portal');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateSignupForm()) return;

    setLoading(true);

    try {
      const { error } = await signUp(
        signupForm.email, 
        signupForm.password,
        signupForm.firstName,
        signupForm.lastName
      );

      if (error) {
        toast({
          title: 'Sign up failed',
          description: error,
          variant: 'destructive',
        });
      } else {
        toast({ 
          title: 'Account created!',
          description: 'You can now sign in to access your portal.',
        });
        setActiveTab('signin');
        setLoginForm({ email: signupForm.email, password: '' });
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
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <CardHeader className="pb-2">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent>
                <TabsContent value="signin" className="mt-0">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                        placeholder="you@example.com"
                      />
                      {errors.loginEmail && (
                        <p className="text-xs text-destructive">{errors.loginEmail}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <Input
                        id="login-password"
                        type="password"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        placeholder="••••••••"
                      />
                      {errors.loginPassword && (
                        <p className="text-xs text-destructive">{errors.loginPassword}</p>
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
                </TabsContent>

                <TabsContent value="signup" className="mt-0">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={signupForm.firstName}
                          onChange={(e) => setSignupForm({ ...signupForm, firstName: e.target.value })}
                          placeholder="John"
                        />
                        {errors.firstName && (
                          <p className="text-xs text-destructive">{errors.firstName}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={signupForm.lastName}
                          onChange={(e) => setSignupForm({ ...signupForm, lastName: e.target.value })}
                          placeholder="Doe"
                        />
                        {errors.lastName && (
                          <p className="text-xs text-destructive">{errors.lastName}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        value={signupForm.email}
                        onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                        placeholder="you@example.com"
                      />
                      {errors.signupEmail && (
                        <p className="text-xs text-destructive">{errors.signupEmail}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        value={signupForm.password}
                        onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                        placeholder="••••••••"
                      />
                      {errors.signupPassword && (
                        <p className="text-xs text-destructive">{errors.signupPassword}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={signupForm.confirmPassword}
                        onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                        placeholder="••••••••"
                      />
                      {errors.confirmPassword && (
                        <p className="text-xs text-destructive">{errors.confirmPassword}</p>
                      )}
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Create Account'
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <div className="mt-6 p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-sm text-muted-foreground">
                    <Mail className="h-4 w-4 inline mr-1" />
                    Use the same email as your Shopify account to view your purchase history.
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-border/50 text-center">
                  <Link
                    to="/staff/login"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Staff login →
                  </Link>
                </div>
              </CardContent>
            </Tabs>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default ClientLogin;
