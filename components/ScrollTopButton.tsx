import React, { useEffect, useState } from 'react';
import { UpArrowIcon } from './IconComponents.tsx';

const ScrollTopButton: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      onClick={handleClick}
      className={`fixed bottom-6 right-6 z-50 p-3 rounded-full bg-fuchsia-600 text-white shadow-lg transition-opacity duration-300 sm:hidden ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      aria-label="Back to top"
    >
      <UpArrowIcon className="w-5 h-5" />
    </button>
  );
};

export default ScrollTopButton;
