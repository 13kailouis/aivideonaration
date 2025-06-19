import React, { useEffect } from 'react';
import { GOOGLE_CLIENT_ID } from '../constants.ts';

declare global {
  interface Window {
    google?: any;
  }
}

interface GoogleLoginButtonProps {
  user: { name: string } | null;
  onLogin: (user: { name: string }) => void;
  onLogout: () => void;
}

const parseJwt = (token: string): any => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return {};
  }
};

const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({ user, onLogin, onLogout }) => {
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !window.google?.accounts?.id) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (resp: any) => {
        const info = parseJwt(resp.credential);
        if (info && info.name) {
          onLogin({ name: info.name });
        }
      },
    });
  }, []);

  const handleSignIn = () => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    }
  };

  const handleLogout = () => {
    onLogout();
    window.google?.accounts.id.disableAutoSelect?.();
  };

  return user ? (
    <div className="flex items-center space-x-2 text-sm">
      <span>{user.name}</span>
      <button onClick={handleLogout} className="px-2 py-1 bg-gray-700 rounded">Logout</button>
    </div>
  ) : (
    <button onClick={handleSignIn} className="px-3 py-1 bg-white text-black text-sm rounded">
      Sign in with Google
    </button>
  );
};

export default GoogleLoginButton;
