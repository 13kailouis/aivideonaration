import React, { useState, PropsWithChildren } from 'react';
import { PlusIcon, MinusIcon } from './IconComponents.tsx';

interface FeatureCardProps extends PropsWithChildren {
  title: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, Icon, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative p-6 bg-black/60 backdrop-blur-lg border border-gray-700 rounded-xl overflow-hidden group">
      <div className="absolute -top-5 -right-5 w-24 h-24 bg-fuchsia-500/40 rounded-full blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-500" />
      <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative z-10 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-8 h-8 text-white mb-1" />
          <h3 className="font-semibold text-white group-hover:text-fuchsia-200 transition-colors duration-500">{title}</h3>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="sm:hidden p-1 text-white"
          aria-expanded={open}
          aria-controls={`feature-${title.replace(/\s+/g,'-')}`}
        >
          {open ? <MinusIcon className="w-6 h-6" /> : <PlusIcon className="w-6 h-6" />}
          <span className="sr-only">{open ? 'Hide' : 'Show'} details</span>
        </button>
      </div>
      <p
        id={`feature-${title.replace(/\s+/g,'-')}`}
        className={`text-gray-400 group-hover:text-gray-200 text-sm mt-1 transition-all duration-500 overflow-hidden ${open ? 'max-h-40' : 'max-h-0 sm:max-h-none'}`}
      >
        {children}
      </p>
    </div>
  );
};

export default FeatureCard;
