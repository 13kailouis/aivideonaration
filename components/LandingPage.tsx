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
          <h1 className="text-3xl font-bold text-teal-500" style={{fontFamily:'Fira Code'}}>CineSynth</h1>
          <div className="hidden sm:flex items-center gap-6">
            <a href="#features" className="hover:text-teal-400 transition-colors">Features</a>
            <button
              className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-md shadow-lg"
              onClick={onGetStarted}
            >
              Launch App
            </button>
          </div>
          <button
            className="sm:hidden p-2 rounded-md hover:bg-gray-800"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <CloseIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
          </button>
        </nav>
        {menuOpen && (
          <div className="sm:hidden fixed inset-0 bg-black/90 backdrop-blur flex flex-col items-center justify-center space-y-6 z-20 relative text-center">
            <a href="#features" className="text-2xl" onClick={() => setMenuOpen(false)}>Features</a>
            <button
              className="bg-teal-600 hover:bg-teal-500 text-white px-6 py-3 rounded-md text-lg shadow-lg"
              onClick={() => { setMenuOpen(false); onGetStarted(); }}
            >
              Launch App
            </button>
            <button className="absolute top-4 right-4 p-2" onClick={() => setMenuOpen(false)}>
              <CloseIcon className="w-6 h-6" />
            </button>
          </div>
        )}
      </header>
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 pt-20">
        <h2 className="text-4xl sm:text-6xl font-extrabold mb-6">
          Your Marketing Video Sidekick
        </h2>
        <p className="text-lg sm:text-2xl text-gray-300 max-w-3xl mb-8">
          Stop wasting hours editing. CineSynth turns your script into shareable videos in minutes&mdash;perfect for busy YouTubers and marketing strategists.
        </p>

        <button
          onClick={onGetStarted}
          className="bg-teal-600 hover:bg-teal-500 text-white text-lg px-8 py-4 rounded-full shadow-xl flex items-center gap-2"
        >
          <SparklesIcon className="w-6 h-6" />
          Get Started
        </button>

        <div id="features" className="grid gap-6 sm:grid-cols-3 max-w-4xl mt-12 mb-8 text-left">
          <div className="p-6 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-lg">
            <TrendingUpIcon className="w-8 h-8 text-teal-500 mb-3" />
            <h3 className="font-semibold text-white">Trend Analysis</h3>
            <p className="text-gray-400 text-sm mt-1">AI dissects audience habits so precisely, it practically manipulates them into watching.</p>
          </div>
          <div className="p-6 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-lg">
            <ScissorsIcon className="w-8 h-8 text-teal-500 mb-3" />
            <h3 className="font-semibold text-white">No Editing Required</h3>
            <p className="text-gray-400 text-sm mt-1">Just talk. We handle visuals, timing and audio sync automatically.</p>
          </div>
          <div className="p-6 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-lg">
            <FireIcon className="w-8 h-8 text-teal-500 mb-3" />
            <h3 className="font-semibold text-white">Controversy Ready</h3>
            <p className="text-gray-400 text-sm mt-1">Create bold videos that spark engagement without the headaches.</p>
          </div>
        </div>

        <section className="w-full py-12 border-t border-gray-800 mt-8">
          <h3 className="text-3xl font-bold mb-8 text-center">Disruptive Extras</h3>
          <div className="grid gap-6 sm:grid-cols-3 max-w-5xl mx-auto text-left">
            <div className="p-6 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-lg">
              <span className="text-teal-500 font-semibold block mb-2">Echo Chamber Amplifier</span>
              <p className="text-gray-400 text-sm">Our algorithms map each tribe’s beliefs, letting you magnify the stories they already cling to.</p>
            </div>
            <div className="p-6 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-lg">
              <span className="text-teal-500 font-semibold block mb-2">Trend Jacker</span>
              <p className="text-gray-400 text-sm">We detect the hottest memes and weave them into your narrative within seconds, fueling unstoppable virality.</p>
            </div>
            <div className="p-6 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-lg">
              <span className="text-teal-500 font-semibold block mb-2">Polarizing Hook Generator</span>
              <p className="text-gray-400 text-sm">Kick off with lines engineered to divide the room and keep the comment section raging.</p>
            </div>
          </div>
        </section>
      </main>
      <footer className="p-4 text-center text-gray-500 text-sm">
        <p>&copy; {new Date().getFullYear()} CineSynth. AI that disrupts filmmaking.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
