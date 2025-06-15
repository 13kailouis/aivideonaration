import React from 'react';
import { SparklesIcon } from './IconComponents.tsx';

interface LandingPageProps {
  onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white">
      <header className="p-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-teal-400">CineSynth</h1>
        <button
          className="bg-teal-500 hover:bg-teal-400 text-white px-4 py-2 rounded-md shadow-lg"
          onClick={onGetStarted}
        >
          Launch App
        </button>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4">
        <h2 className="text-4xl sm:text-6xl font-extrabold mb-6">
          AI-Powered Video Creation
        </h2>
        <p className="text-lg sm:text-2xl text-gray-300 max-w-3xl mb-8">
          Generate videos that spark conversation and challenge the norm. Cinesynth turns your narration into visuals using the latest in generative AI.
        </p>
        <button
          onClick={onGetStarted}
          className="bg-teal-500 hover:bg-teal-400 text-white text-lg px-8 py-4 rounded-full shadow-xl flex items-center gap-2"
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
