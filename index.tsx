import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import LandingPage from './components/LandingPage.tsx';

const isAppSubdomain =
  typeof window !== 'undefined' &&
  (window.location.hostname.startsWith('app.') ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hash === '#app');

const redirectToSubdomain = () => {
  if (typeof window === 'undefined') return;
  if (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  ) {
    window.location.hash = '#app';
    window.location.reload();
    return;
  }

  const hostParts = window.location.host.split('.');
  if (hostParts[0] === 'app') return; // already there
  if (hostParts.length > 1) {
    hostParts[0] = 'app';
  } else {
    hostParts.unshift('app');
  }
  const newHost = hostParts.join('.');
  const url = `${window.location.protocol}//${newHost}${window.location.pathname}`;
  window.location.href = url;
};

const Root: React.FC = () => {
  if (isAppSubdomain) {
    return <App />;
  }
  return <LandingPage onGetStarted={redirectToSubdomain} />;
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
