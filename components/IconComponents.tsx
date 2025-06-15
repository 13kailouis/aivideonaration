
import React from 'react';

export const PlayIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

export const PauseIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
);

export const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
  </svg>
);

export const LandscapeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 10H3V8h18v8z"/>
  </svg>
);

export const PortraitIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
     <path d="M18 4H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H6V6h12v12z"/>
  </svg>
);

export const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L1.25 9l2.846-.813a4.5 4.5 0 003.09-3.09L9 1.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 9l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.25 10.5l1.562-1.563a1.875 1.875 0 00-2.652-2.652L15.75 7.5a1.875 1.875 0 002.5 3zm-3.75 2.25l1.563-1.562a1.875 1.875 0 00-2.652-2.652L10.5 12.75a1.875 1.875 0 002.5 3.001z" />
  </svg>
);

export const MenuIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 6H20M4 12H20M4 18H20" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const TrendingUpIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M13 7h8v8M21 7l-8 8-4-4-6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ScissorsIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14.121 14.121L19 19M12 12l7-7M12 12l-2.879 2.879M12 12L9.121 9.121M9.121 14.879A3 3 0 1 1 7 14a3 3 0 0 1 2.121.879ZM9.121 9.121A3 3 0 1 0 7 10a3 3 0 0 0 2.121-.879Z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const FireIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.657 18.657A7.5 7.5 0 0 1 6.343 18.657C4.781 17.095 4 15.047 4 13c0-2.048.781-4.095 2.343-5.657 0 0 .657 1.657 2.657 2.657 0-2 0.5-5 2.986-7 2 2 2.778 3.778 4.343 5.343A7.5 7.5 0 0 1 20 13c0 2.047-.781 4.095-2.343 5.657Z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9.879 16.121a3 3 0 0 0 4.242 0c.586-.586.879-1.354.879-2.121s-.293-1.535-.879-2.121C13.539 11.296 12.778 11 12 11v3l-2 .001c0 .768.293 1.536.879 2.12Z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const EyeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ShieldIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2l7 4v5c0 5.523-3.806 10.74-7 11-3.194-.26-7-5.477-7-11V6l7-4Z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 11v5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 14h6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const BoltIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M13 2L3 14h7v8l10-12h-7l0-8Z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
