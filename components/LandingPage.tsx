import React, { useState } from 'react';
import { SparklesIcon, MenuIcon, CloseIcon, TrendingUpIcon, ScissorsIcon, FireIcon, QuoteIcon } from './IconComponents.tsx';

interface LandingPageProps {
  onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <header className="bg-black/70 backdrop-blur sticky top-0 z-10">
        <nav className="max-w-6xl mx-auto flex justify-between items-center p-4">
          <h1 className="text-3xl font-bold text-white" style={{fontFamily:'Fira Code'}}>CineSynth</h1>
          <div className="hidden sm:flex items-center gap-6">
            <a href="#features" className="hover:text-gray-300 transition-colors">Features</a>
            <button
              className="bg-white text-black px-4 py-2 rounded-md shadow-lg hover:bg-gray-200"
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
          <div className="sm:hidden fixed inset-0 bg-black/90 backdrop-blur flex flex-col items-center justify-center space-y-6 z-50 min-h-screen">
            <a href="#features" className="text-2xl" onClick={() => setMenuOpen(false)}>Features</a>
            <button
              className="bg-white text-black px-6 py-3 rounded-md text-lg shadow-lg hover:bg-gray-200"
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
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 pt-24">
        <h2 className="text-4xl sm:text-6xl font-extrabold mb-6">
          Your Marketing Video Sidekick
        </h2>
        <p className="text-lg sm:text-2xl text-gray-300 max-w-3xl mb-8">
          Stop wasting hours editing. CineSynth turns your script into shareable videos in minutes&mdash;perfect for busy YouTubers and marketing strategists.
        </p>

        <button
          onClick={onGetStarted}
          className="bg-white text-black text-lg px-8 py-4 rounded-full shadow-xl flex items-center gap-2 hover:bg-gray-200"
        >
          <SparklesIcon className="w-6 h-6" />
          Get Started
        </button>

        <div id="features" className="flex gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible max-w-4xl mt-12 mb-8 text-left snap-x sm:snap-none">
          <div className="relative shrink-0 snap-start sm:snap-none p-6 bg-black/60 backdrop-blur-lg border border-gray-700 rounded-xl overflow-hidden group w-72 sm:w-auto">
            <div className="absolute -top-5 -right-5 w-24 h-24 bg-fuchsia-500/40 rounded-full blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-500" />
            <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <TrendingUpIcon className="relative z-10 w-8 h-8 text-white mb-3" />
            <h3 className="relative z-10 font-semibold text-white group-hover:text-fuchsia-200 transition-colors duration-500">Trend Analysis</h3>
            <p className="relative z-10 text-gray-400 group-hover:text-gray-200 text-sm mt-1 transition-colors duration-500">AI exposes your audience's deepest impulses so your content always hits the mark.</p>
          </div>
          <div className="relative shrink-0 snap-start sm:snap-none p-6 bg-black/60 backdrop-blur-lg border border-gray-700 rounded-xl overflow-hidden group w-72 sm:w-auto">
            <div className="absolute -top-5 -right-5 w-24 h-24 bg-fuchsia-500/40 rounded-full blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-500" />
            <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <ScissorsIcon className="relative z-10 w-8 h-8 text-white mb-3" />
            <h3 className="relative z-10 font-semibold text-white group-hover:text-fuchsia-200 transition-colors duration-500">No Editing Required</h3>
            <p className="relative z-10 text-gray-400 group-hover:text-gray-200 text-sm mt-1 transition-colors duration-500">Just talk. We handle visuals, timing and audio sync automatically.</p>
          </div>
          <div className="relative shrink-0 snap-start sm:snap-none p-6 bg-black/60 backdrop-blur-lg border border-gray-700 rounded-xl overflow-hidden group w-72 sm:w-auto">
            <div className="absolute -top-5 -right-5 w-24 h-24 bg-fuchsia-500/40 rounded-full blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-500" />
            <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <FireIcon className="relative z-10 w-8 h-8 text-white mb-3" />
            <h3 className="relative z-10 font-semibold text-white group-hover:text-fuchsia-200 transition-colors duration-500">Controversy Ready</h3>
            <p className="relative z-10 text-gray-400 group-hover:text-gray-200 text-sm mt-1 transition-colors duration-500">Create bold videos that spark engagement without the headaches.</p>
          </div>
        </div>

        <section className="w-full py-12 border-t border-gray-800 mt-8">
          <h3 className="text-3xl font-bold mb-8 text-center">Disruptive Extras</h3>
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 px-4">
            <article className="p-6 bg-black/60 backdrop-blur-lg border border-gray-700 rounded-xl text-center flex flex-col">
              <h4 className="text-fuchsia-400 text-sm uppercase tracking-wide mb-1">Comment Surge</h4>
              <p className="text-3xl font-bold text-white mb-2">+250%</p>
              <p className="text-gray-400 text-sm">Outrage Engine ignites minor rifts into viral showdowns.</p>
            </article>
            <article className="p-6 bg-black/60 backdrop-blur-lg border border-gray-700 rounded-xl text-center flex flex-col">
              <h4 className="text-fuchsia-400 text-sm uppercase tracking-wide mb-1">Trending Speed</h4>
              <p className="text-3xl font-bold text-white mb-2">&lt;30s</p>
              <p className="text-gray-400 text-sm">Narrative Hijacker grabs hot topics before rivals react.</p>
            </article>
            <article className="p-6 bg-black/60 backdrop-blur-lg border border-gray-700 rounded-xl text-center flex flex-col">
              <h4 className="text-fuchsia-400 text-sm uppercase tracking-wide mb-1">Return Visits</h4>
              <p className="text-3xl font-bold text-white mb-2">4x</p>
              <p className="text-gray-400 text-sm">Addiction Loop Builder keeps viewers coming back for more.</p>
            </article>
          </div>
        </section>

        <section className="w-full py-12 border-t border-gray-800">
          <h3 className="text-3xl font-bold mb-8 text-center">What Our Users Say</h3>
          <div className="grid gap-4 sm:grid-cols-3 sm:gap-6 max-w-5xl mx-auto text-left">
            <div className="relative p-6 bg-black/60 backdrop-blur-lg border border-gray-700 rounded-xl overflow-hidden group">
              <div className="absolute -top-5 -right-5 w-24 h-24 bg-cyan-500/40 rounded-full blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-500" />
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <QuoteIcon className="relative z-10 w-6 h-6 mb-2 text-white/80" />
              <p className="relative z-10 text-gray-300 group-hover:text-gray-200 italic text-sm mb-3">&quot;This tool supercharged our marketing videos. Nothing else compares!&quot;</p>
              <span className="relative z-10 text-white font-semibold group-hover:text-cyan-200">— Alex R.</span>
            </div>
            <div className="relative p-6 bg-black/60 backdrop-blur-lg border border-gray-700 rounded-xl overflow-hidden group">
              <div className="absolute -top-5 -right-5 w-24 h-24 bg-cyan-500/40 rounded-full blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-500" />
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <QuoteIcon className="relative z-10 w-6 h-6 mb-2 text-white/80" />
              <p className="relative z-10 text-gray-300 group-hover:text-gray-200 italic text-sm mb-3">&quot;CineSynth lets us pump out engaging content in minutes instead of hours.&quot;</p>
              <span className="relative z-10 text-white font-semibold group-hover:text-cyan-200">— Samira L.</span>
            </div>
            <div className="relative p-6 bg-black/60 backdrop-blur-lg border border-gray-700 rounded-xl overflow-hidden group">
              <div className="absolute -top-5 -right-5 w-24 h-24 bg-cyan-500/40 rounded-full blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-500" />
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <QuoteIcon className="relative z-10 w-6 h-6 mb-2 text-white/80" />
              <p className="relative z-10 text-gray-300 group-hover:text-gray-200 italic text-sm mb-3">&quot;The results blew our minds. It&#39;s like having a full editing team on call.&quot;</p>
              <span className="relative z-10 text-white font-semibold group-hover:text-cyan-200">— Jordan K.</span>
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
