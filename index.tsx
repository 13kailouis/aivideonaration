import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import LandingPage from './components/LandingPage.tsx';
import { LAUNCH_URL } from './constants.ts';
import { AuthProvider } from './auth/AuthContext.tsx';

const Root: React.FC = () => {
  const [started, setStarted] = useState(false);

  const handleGetStarted = () => {
    if (LAUNCH_URL) {
      window.location.href = LAUNCH_URL;
    } else {
      setStarted(true);
    }
  };

  return started ? <App /> : <LandingPage onGetStarted={handleGetStarted} />;
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <Root />
    </AuthProvider>
  </React.StrictMode>
);
