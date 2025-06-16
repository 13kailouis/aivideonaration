import React, { useState } from 'react';
import { SparklesIcon, MenuIcon, CloseIcon, TrendingUpIcon, ScissorsIcon, FireIcon, QuoteIcon } from './IconComponents.tsx';
import FeatureCard from './FeatureCard.tsx';
import TypewriterText from './TypewriterText.tsx';
import FadeInSection from './FadeInSection.tsx';

interface LandingPageProps {
  onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <header className="bg-black/70 backdrop-blur sticky top-0 z-10">
        <nav className="max-w-6xl mx-auto flex justify-between items-center p-4">
          <h1
            className="glitch text-3xl font-bold text-white"
            data-text="CineSynth"
            style={{ fontFamily: 'Fira Code' }}
          >
            CineSynth
          </h1>
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
        <h2 className="text-4xl sm:text-6xl font-extrabold mb-6 bg-gradient-to-br from-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
          <TypewriterText
            phrases={[
              'Your Marketing Video Sidekick',
              'Turn Scripts into Shareable Videos',
              'AI Video Creation in Minutes',
            ]}
          />
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

        <div id="features" className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6 w-full max-w-4xl mt-12 mb-8 text-left px-2">
          <FadeInSection>
            <FeatureCard title="Trend Analysis" Icon={TrendingUpIcon}>
              AI exposes your audience's deepest impulses so your content always hits the mark.
            </FeatureCard>
          </FadeInSection>
          <FadeInSection>
            <FeatureCard title="No Editing Required" Icon={ScissorsIcon}>
              Just talk. We handle visuals, timing and audio sync automatically.
            </FeatureCard>
          </FadeInSection>
          <FadeInSection>
            <FeatureCard title="Controversy Ready" Icon={FireIcon}>
              Create bold videos that spark engagement without the headaches.
            </FeatureCard>
          </FadeInSection>
        </div>

        <section className="w-full py-12 border-t border-gray-800 mt-8">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8 items-center p-8 md:p-12">
            <div className="space-y-4">
              <h3 className="text-3xl font-bold">AI-Powered Content Creation</h3>
              <p className="text-gray-300">
                Amplify your message with smart analysis, automatic editing and seamless voice sync.
              </p>
              <ul className="space-y-3 text-left text-gray-300">
                <li className="flex items-start gap-2">
                  <SparklesIcon className="w-5 h-5 text-fuchsia-400" />
                  <span>Smart Analysis with AI behavior tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <ScissorsIcon className="w-5 h-5 text-fuchsia-400" />
                  <span>Auto Editing keeps everything in sync</span>
                </li>
                <li className="flex items-start gap-2">
                  <FireIcon className="w-5 h-5 text-fuchsia-400" />
                  <span>Engagement Boost that resonates</span>
                </li>
              </ul>
            </div>
            <div className="relative aspect-video bg-black/60 backdrop-blur-lg border border-gray-700 rounded-2xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/40 via-transparent to-transparent rounded-2xl pointer-events-none" />
              <div className="absolute inset-4 border border-dashed border-gray-600 rounded-xl pointer-events-none" />
              <div className="flex items-center justify-center h-full text-gray-500">Video Preview</div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 border-t border-gray-800">
          <h3 className="text-3xl font-bold mb-8 text-center">What Our Users Say</h3>
          <div className="grid gap-4 sm:grid-cols-3 sm:gap-6 max-w-5xl mx-auto text-left">
            <FadeInSection>
              <div className="relative p-6 bg-black/60 backdrop-blur-lg border border-gray-700 rounded-xl overflow-hidden group">
              <div className="absolute -top-5 -right-5 w-24 h-24 bg-cyan-500/40 rounded-full blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-500" />
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <QuoteIcon className="relative z-10 w-6 h-6 mb-2 text-white/80" />
              <p className="relative z-10 text-gray-300 group-hover:text-gray-200 italic text-sm mb-3">&quot;This tool supercharged our marketing videos. Nothing else compares!&quot;</p>
              <span className="relative z-10 text-white font-semibold group-hover:text-cyan-200">— Alex R.</span>
              </div>
            </FadeInSection>
            <FadeInSection>
              <div className="relative p-6 bg-black/60 backdrop-blur-lg border border-gray-700 rounded-xl overflow-hidden group">
              <div className="absolute -top-5 -right-5 w-24 h-24 bg-cyan-500/40 rounded-full blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-500" />
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <QuoteIcon className="relative z-10 w-6 h-6 mb-2 text-white/80" />
              <p className="relative z-10 text-gray-300 group-hover:text-gray-200 italic text-sm mb-3">&quot;CineSynth lets us pump out engaging content in minutes instead of hours.&quot;</p>
              <span className="relative z-10 text-white font-semibold group-hover:text-cyan-200">— Samira L.</span>
              </div>
            </FadeInSection>
            <FadeInSection>
              <div className="relative p-6 bg-black/60 backdrop-blur-lg border border-gray-700 rounded-xl overflow-hidden group">
              <div className="absolute -top-5 -right-5 w-24 h-24 bg-cyan-500/40 rounded-full blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-500" />
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <QuoteIcon className="relative z-10 w-6 h-6 mb-2 text-white/80" />
              <p className="relative z-10 text-gray-300 group-hover:text-gray-200 italic text-sm mb-3">&quot;The results blew our minds. It&#39;s like having a full editing team on call.&quot;</p>
              <span className="relative z-10 text-white font-semibold group-hover:text-cyan-200">— Jordan K.</span>
              </div>
            </FadeInSection>
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
