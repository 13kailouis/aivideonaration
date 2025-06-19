import React, { createContext, useEffect, useState, ReactNode } from 'react';
import { GOOGLE_CLIENT_ID } from '../constants.ts';

interface User {
  name: string;
}

interface AuthContextType {
  user: User | null;
  login: () => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('authUser');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        localStorage.removeItem('authUser');
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('authUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('authUser');
    }
  }, [user]);

  const login = () => {
    const google = (window as any).google;
    if (google?.accounts?.id && GOOGLE_CLIENT_ID) {
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (resp: any) => {
          try {
            const payload = JSON.parse(atob(resp.credential.split('.')[1]));
            setUser({ name: payload.name });
          } catch {
            console.error('Failed to parse Google token');
          }
        },
      });
      google.accounts.id.prompt();
    }
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
