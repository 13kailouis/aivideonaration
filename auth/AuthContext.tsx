import React, { createContext, useContext, useEffect, useState } from 'react';
import jwt_decode from 'jwt-decode';

interface User {
  name: string;
  email: string;
  picture?: string;
}

interface AuthContextProps {
  user: User | null;
  isPremium: boolean;
  signIn: () => void;
  signOut: () => void;
  activatePremium: () => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('auth_user');
    const storedPremium = localStorage.getItem('premium_user');
    if (storedUser) setUser(JSON.parse(storedUser));
    if (storedPremium === 'true') setIsPremium(true);
  }, []);

  const signIn = () => {
    // @ts-ignore
    if (!window.google || !import.meta.env.VITE_GOOGLE_CLIENT_ID) {
      console.error('Google client ID missing');
      return;
    }
    // @ts-ignore
    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: (resp: any) => {
        if (resp.credential) {
          const info: any = jwt_decode(resp.credential);
          const newUser: User = { name: info.name, email: info.email, picture: info.picture };
          setUser(newUser);
          localStorage.setItem('auth_user', JSON.stringify(newUser));
        }
      },
    });
    // @ts-ignore
    window.google.accounts.id.prompt();
  };

  const signOut = () => {
    setUser(null);
    setIsPremium(false);
    localStorage.removeItem('auth_user');
    localStorage.removeItem('premium_user');
  };

  const activatePremium = () => {
    setIsPremium(true);
    localStorage.setItem('premium_user', 'true');
  };

  return (
    <AuthContext.Provider value={{ user, isPremium, signIn, signOut, activatePremium }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
