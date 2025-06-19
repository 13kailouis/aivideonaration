import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import LandingPage from './components/LandingPage.tsx';
import { LAUNCH_URL } from './constants.ts';

const Root: React.FC = () => {
  // Persist whether the user has launched the main app so refreshing the page
  // doesn't send them back to the landing page.
  const [started, setStarted] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('started') === 'true';
    }
    return false;
  });

  const handleGetStarted = () => {
    if (LAUNCH_URL) {
      window.location.href = LAUNCH_URL;
    } else {
      setStarted(true);
      try {
        localStorage.setItem('started', 'true');
      } catch (err) {
        // Non-critical; if storage fails we simply won't persist state
        console.warn('Unable to persist started state:', err);
      }
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
    <Root />
  </React.StrictMode>
);
