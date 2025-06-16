import React, { useRef } from 'react';
import { TrendingUpIcon, ScissorsIcon, FireIcon } from './IconComponents.tsx';

interface Feature {
  icon: React.ReactElement;
  title: string;
  description: string;
}

const defaultFeatures: Feature[] = [
  {
    icon: <TrendingUpIcon className="w-8 h-8 text-white mb-3" />,
    title: 'Trend Analysis',
    description: "AI exposes your audience's deepest impulses so your content always hits the mark.",
  },
  {
    icon: <ScissorsIcon className="w-8 h-8 text-white mb-3" />,
    title: 'No Editing Required',
    description: 'Just talk. We handle visuals, timing and audio sync automatically.',
  },
  {
    icon: <FireIcon className="w-8 h-8 text-white mb-3" />,
    title: 'Controversy Ready',
    description: 'Create bold videos that spark engagement without the headaches.',
  },
];

interface MobileFeatureSliderProps {
  features?: Feature[];
}

const MobileFeatureSlider: React.FC<MobileFeatureSliderProps> = ({ features = defaultFeatures }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative w-full sm:hidden">
      <div
        ref={containerRef}
        className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth"
      >
        {features.map((feature, idx) => (
          <div
            key={idx}
            className="snap-center shrink-0 w-full px-4 py-6"
          >
            <div className="relative p-6 bg-black/60 backdrop-blur-lg border border-gray-700 rounded-xl overflow-hidden">
              <div className="absolute -top-5 -right-5 w-24 h-24 bg-fuchsia-500/40 rounded-full blur-2xl" />
              <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/10 to-transparent" />
              <div className="relative z-10 flex flex-col items-start">
                {feature.icon}
                <h3 className="font-semibold text-white mb-1">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MobileFeatureSlider;
