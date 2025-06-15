import React, { useState } from 'react';
import { SparklesIcon } from './IconComponents.tsx';

interface NavbarProps {
  brand?: string;
  rightButtonText?: string;
  onRightButtonClick?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({
  brand = 'CineSynth',
  rightButtonText,
  onRightButtonClick,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="bg-black text-white border-b border-gray-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <SparklesIcon className="w-6 h-6 text-fuchsia-400 mr-2" />
            <span className="font-bold text-xl" style={{ fontFamily: 'Fira Code' }}>{brand}</span>
          </div>
          <div className="flex items-center">
            {rightButtonText && (
              <button
                onClick={onRightButtonClick}
                className="hidden sm:inline-flex bg-fuchsia-600 hover:bg-fuchsia-500 text-white px-4 py-2 rounded-md shadow"
              >
                {rightButtonText}
              </button>
            )}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="sm:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-fuchsia-500 ml-2"
            >
              <span className="sr-only">Open main menu</span>
              <svg
                className="block h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M3.75 5.25h16.5m-16.5 6h16.5m-16.5 6h16.5'}
                />
              </svg>
            </button>
          </div>
        </div>
        {rightButtonText && menuOpen && (
          <div className="sm:hidden pb-3">
            <button
              onClick={onRightButtonClick}
              className="block w-full text-left px-3 py-2 rounded-md text-base font-medium bg-fuchsia-600 hover:bg-fuchsia-500"
            >
              {rightButtonText}
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
