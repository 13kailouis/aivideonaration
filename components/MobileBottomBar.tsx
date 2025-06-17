import React, { useEffect, useState } from 'react';
import { SparklesIcon, UpArrowIcon } from './IconComponents.tsx';

interface MobileBottomBarProps {
  onGetStarted: () => void;
}

const MobileBottomBar: React.FC<MobileBottomBarProps> = ({ onGetStarted }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 200);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <div
      className={`sm:hidden fixed inset-x-0 bottom-0 p-3 transition-transform duration-300 ${
        visible ? 'translate-y-0' : 'translate-y-full'
      } pointer-events-none`}
    >
      <div className="pointer-events-auto flex justify-center gap-3 bg-black/80 backdrop-blur rounded-full py-2">
        <button
          onClick={scrollTop}
          className="p-2 rounded-full bg-neutral-800 text-white hover:bg-neutral-700 transition"
          aria-label="Scroll to top"
        >
          <UpArrowIcon className="w-5 h-5" />
        </button>
        <button
          onClick={onGetStarted}
          className="flex items-center gap-1 px-4 py-2 rounded-full bg-white text-black hover:bg-gray-200 transition"
        >
          <SparklesIcon className="w-5 h-5" />
          Launch
        </button>
      </div>
    </div>
  );
};

export default MobileBottomBar;
