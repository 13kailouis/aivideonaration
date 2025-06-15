import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import LandingPage from './components/LandingPage.tsx';

const Root: React.FC = () => {
  const [started, setStarted] = useState(false);
  return started ? <App /> : <LandingPage onGetStarted={() => setStarted(true)} />;
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
