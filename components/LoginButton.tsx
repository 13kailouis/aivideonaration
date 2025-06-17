import React from 'react';
import { useAuth } from '../auth/AuthContext.tsx';

const LoginButton: React.FC = () => {
  const { user, signIn, signOut, isPremium, activatePremium } = useAuth();

  if (user) {
    return (
      <div className="flex items-center space-x-2 text-sm">
        {user.picture && <img src={user.picture} className="w-6 h-6 rounded-full" alt="avatar" />}
        <span>{user.name}{isPremium ? ' (Premium)' : ''}</span>
        {!isPremium && (
          <button
            onClick={activatePremium}
            className="px-2 py-1 bg-yellow-500 text-black rounded-md text-xs"
          >
            Activate Premium
          </button>
        )}
        <button onClick={signOut} className="text-red-400 text-xs">Sign Out</button>
      </div>
    );
  }

  return (
    <button onClick={signIn} className="text-sm hover:text-gray-300">
      Sign In with Google
    </button>
  );
};

export default LoginButton;
