import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Shield, Smartphone, Monitor } from 'lucide-react';
import NumberPad from './NumberPad';

interface LoginScreenProps {
  type: 'app' | 'admin';
  onSuccess: () => void;
}

export default function LoginScreen({ type, onSuccess }: LoginScreenProps) {
  const [password, setPassword] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Detect if user is on a mobile device
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!password.trim()) return;

    setIsLoading(true);
    const success = await login(password, type);
    
    if (success) {
      toast({
        title: 'Login successful',
        description: `Welcome to ${type === 'admin' ? 'Admin Area' : 'Timesheet App'}`,
      });
      onSuccess();
    } else {
      toast({
        title: 'Invalid password',
        description: 'Please check your password and try again.',
        variant: 'destructive',
      });
      setPassword('');
    }
    
    setIsLoading(false);
  };

  const handleNumberPress = (number: string) => {
    if (type === 'admin' || password.length < 20) {
      setPassword(prev => prev + number);
    }
  };

  const handleBackspace = () => {
    setPassword(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPassword('');
  };

  const isAppLogin = type === 'app';
  const passwordPattern = isAppLogin ? /^\d+$/ : /.+/; // Numbers only for app, any characters for admin

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Shield className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            {type === 'admin' ? 'Admin Access' : 'Oakland Fire-Rescue'}
          </CardTitle>
          <p className="text-gray-600">
            {type === 'admin' 
              ? 'Enter admin password to access management area'
              : 'Enter your access code to continue'
            }
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Device Type Indicator */}
          <div className="flex justify-center">
            <div className="flex items-center text-sm text-gray-500">
              {isMobile ? (
                <>
                  <Smartphone className="h-4 w-4 mr-2" />
                  Mobile Device Detected
                </>
              ) : (
                <>
                  <Monitor className="h-4 w-4 mr-2" />
                  Desktop Device Detected
                </>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Password Display */}
            <div>
              <Label htmlFor="password">
                {type === 'admin' ? 'Admin Password' : 'Access Code'}
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  if (isAppLogin) {
                    // Only allow numbers for app login
                    const numericValue = e.target.value.replace(/\D/g, '');
                    setPassword(numericValue);
                  } else {
                    setPassword(e.target.value);
                  }
                }}
                placeholder={isAppLogin ? "Enter 4-digit code" : "Enter admin password"}
                className="text-center text-lg tracking-widest"
                maxLength={isAppLogin ? 10 : 50}
                autoComplete="off"
                data-testid="password-input"
                readOnly={isMobile && isAppLogin} // Make read-only on mobile for app login
              />
            </div>

            {/* Number Pad for Mobile App Login */}
            {isMobile && isAppLogin && (
              <NumberPad
                onNumberPress={handleNumberPress}
                onBackspace={handleBackspace}
                onClear={handleClear}
              />
            )}

            {/* Login Button */}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={!password.trim() || isLoading || (isAppLogin && !passwordPattern.test(password))}
              data-testid="login-button"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>

          {/* Help Text */}
          <div className="text-center text-sm text-gray-500">
            {type === 'admin' ? (
              <p>Contact IT support if you've forgotten your admin password</p>
            ) : (
              <p>Contact your supervisor if you need the access code</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}