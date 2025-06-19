import React, { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext.tsx';

const GoogleLoginButton: React.FC = () => {
  const { user, login, logout } = useContext(AuthContext);

  return user ? (
    <button onClick={logout} className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-500">
      Logout ({user.name})
    </button>
  ) : (
    <button onClick={login} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-500">
      Sign in with Google
    </button>
  );
};

export default GoogleLoginButton;
