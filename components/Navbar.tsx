import React, { useState } from 'react';

interface NavbarProps {
  onBack: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onBack }) => {
  const [open, setOpen] = useState(false);
  return (
    <nav className="bg-black border-b border-fuchsia-700">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-14">
          <div className="flex-shrink-0">
            <span className="text-fuchsia-500 font-mono font-bold text-xl">CineSynth</span>
          </div>
          <div className="hidden md:flex space-x-6">
            <button onClick={onBack} className="text-gray-300 hover:text-white">Home</button>
          </div>
          <div className="md:hidden flex items-center">
            <button onClick={() => setOpen(!open)} className="text-gray-300 hover:text-white focus:outline-none">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      {open && (
        <div className="md:hidden px-2 pt-2 pb-3 space-y-1 border-t border-fuchsia-700">
          <button onClick={onBack} className="block px-3 py-2 text-gray-300 hover:text-white">Home</button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
