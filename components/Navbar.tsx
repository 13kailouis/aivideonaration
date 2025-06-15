import React from 'react';
import { SparklesIcon } from './IconComponents.tsx';
import { APP_TITLE } from '../constants.ts';

const Navbar: React.FC = () => {
  return (
    <nav className="bg-black text-white p-4 flex justify-between items-center shadow-md">
      <div className="flex items-center space-x-2">
        <SparklesIcon className="w-6 h-6 text-fuchsia-500" />
        <span className="text-2xl font-bold" style={{fontFamily:'Fira Code'}}>{APP_TITLE}</span>
      </div>
    </nav>
  );
};

export default Navbar;
