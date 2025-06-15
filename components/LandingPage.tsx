import React, { useState } from 'react';
import { SparklesIcon } from './IconComponents.tsx';

interface LandingPageProps {
  onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <header className="p-6">
        <nav className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-3xl font-bold text-fuchsia-500" style={{fontFamily:'Fira Code'}}>CineSynth</h1>
          <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle Menu">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <ul className="hidden md:flex space-x-6 text-sm font-medium">
            <li><a href="#features" className="hover:text-fuchsia-400">Features</a></li>
            <li><a href="#about" className="hover:text-fuchsia-400">About</a></li>
            <li><a href="#contact" className="hover:text-fuchsia-400">Contact</a></li>
          </ul>
          <div className="hidden md:block">
            <button
              className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white px-4 py-2 rounded-md shadow-lg"
              onClick={onGetStarted}
            >
              Launch App
            </button>
          </div>
        </nav>
        {open && (
          <ul className="md:hidden mt-4 space-y-2 text-sm font-medium">
            <li><a href="#features" className="block px-2" onClick={() => setOpen(false)}>Features</a></li>
            <li><a href="#about" className="block px-2" onClick={() => setOpen(false)}>About</a></li>
            <li><a href="#contact" className="block px-2" onClick={() => setOpen(false)}>Contact</a></li>
            <li>
              <button
                className="mt-2 w-full bg-fuchsia-600 hover:bg-fuchsia-500 text-white px-4 py-2 rounded-md shadow-lg"
                onClick={() => { setOpen(false); onGetStarted(); }}
              >
                Launch App
              </button>
            </li>
          </ul>
        )}
      </header>
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4">
        <h2 className="text-4xl sm:text-6xl font-extrabold mb-6">
          Your Marketing Video Sidekick
        </h2>
        <p className="text-lg sm:text-2xl text-gray-300 max-w-3xl mb-8">
          Stop wasting hours editing. CineSynth turns your script into shareable videos in minutes&mdash;perfect for busy YouTubers and marketing strategists.
        </p>

        <div className="grid gap-6 sm:grid-cols-3 max-w-4xl mb-8 text-left">
          <div>
            <h3 className="font-semibold text-white">Trend Analysis</h3>
            <p className="text-gray-400 text-sm mt-1">AI taps into viewer behavior so your content always hits the mark.</p>
          </div>
          <div>
            <h3 className="font-semibold text-white">No Editing Required</h3>
            <p className="text-gray-400 text-sm mt-1">Just talk. We handle visuals, timing and audio sync automatically.</p>
          </div>
          <div>
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
