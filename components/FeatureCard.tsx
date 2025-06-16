import React from 'react';
import FadeInSection from './FadeInSection.tsx';

interface FeatureCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon: Icon, title, description }) => (
  <FadeInSection>
    <div className="relative p-6 bg-black/60 backdrop-blur-lg border border-gray-700 rounded-xl overflow-hidden group transition-transform duration-300 hover:scale-105 active:scale-95">
      <div className="absolute -top-5 -right-5 w-24 h-24 bg-fuchsia-500/40 rounded-full blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-500" />
      <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <Icon className="relative z-10 w-8 h-8 text-white mb-3" />
      <h3 className="relative z-10 font-semibold text-white group-hover:text-fuchsia-200 transition-colors duration-500">{title}</h3>
      <p className="relative z-10 text-gray-400 group-hover:text-gray-200 text-sm mt-1 transition-colors duration-500">{description}</p>
    </div>
  </FadeInSection>
);

export default FeatureCard;
