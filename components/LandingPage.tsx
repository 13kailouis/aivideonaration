import React, { useState } from 'react';
import { SparklesIcon, MenuIcon, CloseIcon, TrendingUpIcon, ScissorsIcon, FireIcon } from './IconComponents.tsx';

interface LandingPageProps {
  onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <header className="bg-black/70 backdrop-blur sticky top-0 z-10">
        <nav className="max-w-6xl mx-auto flex justify-between items-center p-4">
          <h1 className="text-3xl font-bold text-fuchsia-500" style={{fontFamily:'Fira Code'}}>CineSynth</h1>
          <div className="hidden sm:flex items-center gap-6">
            <a href="#features" className="hover:text-fuchsia-400 transition-colors">Features</a>
            <button
              className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white px-4 py-2 rounded-md shadow-lg"
              onClick={onGetStarted}
            >
              Launch App
            </button>
          </div>
          <button
            className="sm:hidden p-2 rounded-md hover:bg-gray-900"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <CloseIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
          </button>
        </nav>
        {menuOpen && (
          <div className="sm:hidden px-4 pb-4 space-y-2">
            <a href="#features" className="block py-2" onClick={() => setMenuOpen(false)}>Features</a>
            <button
              className="w-full bg-fuchsia-600 hover:bg-fuchsia-500 text-white px-4 py-2 rounded-md shadow-lg"
              onClick={() => { setMenuOpen(false); onGetStarted(); }}
            >
              Launch App
            </button>
          </div>
        )}
      </header>
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4">
        <h2 className="text-4xl sm:text-6xl font-extrabold mb-6">
          Your Marketing Video Sidekick
        </h2>
        <p className="text-lg sm:text-2xl text-gray-300 max-w-3xl mb-8">
          Stop wasting hours editing. CineSynth turns your script into shareable videos in minutes&mdash;perfect for busy YouTubers and marketing strategists.
        </p>

        <div id="features" className="grid gap-6 sm:grid-cols-3 max-w-4xl mb-8 text-left">
          <div className="p-6 bg-gray-900 rounded-xl shadow-lg">
            <TrendingUpIcon className="w-8 h-8 text-fuchsia-500 mb-3" />
            <h3 className="font-semibold text-white">Trend Analysis</h3>
            <p className="text-gray-400 text-sm mt-1">AI taps into viewer behavior so your content always hits the mark.</p>
          </div>
          <div className="p-6 bg-gray-900 rounded-xl shadow-lg">
            <ScissorsIcon className="w-8 h-8 text-fuchsia-500 mb-3" />
            <h3 className="font-semibold text-white">No Editing Required</h3>
            <p className="text-gray-400 text-sm mt-1">Just talk. We handle visuals, timing and audio sync automatically.</p>
          </div>
          <div className="p-6 bg-gray-900 rounded-xl shadow-lg">
            <FireIcon className="w-8 h-8 text-fuchsia-500 mb-3" />
            <h3 className="font-semibold text-white">Controversy Ready</h3>
            <p className="text-gray-400 text-sm mt-1">Create bold videos that spark engagement without the headaches.</p>
          </div>
        </div>

        <button
          onClick={onGetStarted}
          className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-lg px-8 py-4 rounded-full shadow-xl flex items-center gap-2"
        >
          <SparklesIcon className="w-6 h-6" />
          Get Started
        </button>
      </main>
      <footer className="p-4 text-center text-gray-500 text-sm">
        <p>&copy; {new Date().getFullYear()} CineSynth. AI that disrupts filmmaking.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
