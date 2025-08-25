import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  isAppAuthenticated: boolean;
  isAdminAuthenticated: boolean;
  login: (password: string, type: 'app' | 'admin') => Promise<boolean>;
  logout: (type?: 'app' | 'admin') => void;
  checkSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAppAuthenticated, setIsAppAuthenticated] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  // Check session on app load
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = () => {
    const appAuth = localStorage.getItem('app_auth');
    const adminAuth = localStorage.getItem('admin_auth');
    
    if (appAuth) {
      const appAuthData = JSON.parse(appAuth);
      // Check if session is still valid (24 hours)
      if (Date.now() - appAuthData.timestamp < 24 * 60 * 60 * 1000) {
        setIsAppAuthenticated(true);
      } else {
        localStorage.removeItem('app_auth');
      }
    }
    
    if (adminAuth) {
      const adminAuthData = JSON.parse(adminAuth);
      // Check if session is still valid (24 hours)
      if (Date.now() - adminAuthData.timestamp < 24 * 60 * 60 * 1000) {
        setIsAdminAuthenticated(true);
      } else {
        localStorage.removeItem('admin_auth');
      }
    }
  };

  const login = async (password: string, type: 'app' | 'admin'): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, type }),
      });

      if (response.ok) {
        const authData = { timestamp: Date.now() };
        
        if (type === 'app') {
          setIsAppAuthenticated(true);
          localStorage.setItem('app_auth', JSON.stringify(authData));
        } else {
          setIsAdminAuthenticated(true);
          localStorage.setItem('admin_auth', JSON.stringify(authData));
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = (type?: 'app' | 'admin') => {
    if (!type || type === 'app') {
      setIsAppAuthenticated(false);
      localStorage.removeItem('app_auth');
    }
    
    if (!type || type === 'admin') {
      setIsAdminAuthenticated(false);
      localStorage.removeItem('admin_auth');
    }
  };

  return (
    <AuthContext.Provider value={{
      isAppAuthenticated,
      isAdminAuthenticated,
      login,
      logout,
      checkSession,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };