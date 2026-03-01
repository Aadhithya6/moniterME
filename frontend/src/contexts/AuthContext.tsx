import React, { createContext, useContext, useEffect, useState } from 'react';

type User = { id: string; name: string; email: string };

type AuthContextType = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('healthyfi_token');
    const storedUser = localStorage.getItem('healthyfi_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = (u: User, t: string) => {
    localStorage.setItem('healthyfi_token', t);
    localStorage.setItem('healthyfi_user', JSON.stringify(u));
    setUser(u);
    setToken(t);
  };

  const logout = () => {
    localStorage.removeItem('healthyfi_token');
    localStorage.removeItem('healthyfi_user');
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
