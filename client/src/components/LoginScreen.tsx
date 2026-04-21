import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Shield, Smartphone, Monitor } from 'lucide-react';

interface LoginScreenProps {
  type: 'app' | 'admin';
  onSuccess: () => void;
}

export default function LoginScreen({ type, onSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);

  const { login, registerSetup } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const checkSetupStatus = async () => {
      try {
        const res = await fetch('/api/setup-status');
        if (res.ok) {
          const data = await res.json();
          setNeedsSetup(data.needsSetup);
        }
      } catch (err) {
        console.error("Failed to check setup status", err);
      }
    };
    checkSetupStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim() || isLoading) return;

    setIsLoading(true);
    
    try {
      if (needsSetup) {
        const success = await registerSetup(username, password);
        if (success) {
          toast({
            title: 'Setup successful',
            description: 'Admin account created successfully.',
          });
          onSuccess();
        } else {
          toast({
            title: 'Setup failed',
            description: 'Could not create admin account.',
            variant: 'destructive',
          });
        }
      } else {
        const success = await login(username, password);

        if (success) {
          toast({
            title: 'Login successful',
            description: `Welcome to ${type === 'admin' ? 'Admin Area' : 'Timesheet App'}`,
          });
          onSuccess();
        } else {
          toast({
            title: 'Invalid credentials',
            description: 'Please check your username and password and try again.',
            variant: 'destructive',
          });
          setPassword('');
        }
      }
    } catch (error) {
      toast({
        title: needsSetup ? 'Setup error' : 'Login error',
        description: 'An error occurred. Please try again.',
        variant: 'destructive',
      });
      setPassword('');
    }
    
    setIsLoading(false);
  };

  if (needsSetup === null) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const title = needsSetup
    ? 'Initial Admin Setup'
    : (type === 'admin' ? 'Admin Access' : 'Oakland Fire-Rescue');

  const subtitle = needsSetup
    ? 'Create the first admin account'
    : (type === 'admin' ? 'Enter admin credentials' : 'Enter your credentials to continue');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Shield className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <p className="text-gray-600">{subtitle}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <div className="flex items-center text-sm text-gray-500">
              {isMobile ? (
                <><Smartphone className="h-4 w-4 mr-2" /> Mobile Device Detected</>
              ) : (
                <><Monitor className="h-4 w-4 mr-2" /> Desktop Device Detected</>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full"
                  autoComplete="username"
                  data-testid="username-input"
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={needsSetup ? "Create admin password" : "Enter password"}
                  className="w-full"
                  autoComplete={needsSetup ? "new-password" : "current-password"}
                  data-testid="password-input"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={!username.trim() || !password.trim() || isLoading}
              data-testid="login-button"
            >
              {isLoading
                ? (needsSetup ? 'Creating Account...' : 'Signing In...')
                : (needsSetup ? 'Create Admin Account' : 'Sign In')}
            </Button>
          </form>

          {!needsSetup && (
            <div className="text-center text-sm text-gray-500">
              <p>Contact your supervisor if you need access</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
