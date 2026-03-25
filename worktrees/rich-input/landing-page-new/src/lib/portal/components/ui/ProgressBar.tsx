'use client';

import React from 'react';

interface ProgressBarProps {
  progress: number; // A value between 0 and 100
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className="w-full bg-slate-700/50 rounded-full h-2.5 overflow-hidden">
      <div
        className="h-2.5 rounded-full bg-gradient-to-r from-orange-500 via-cyan-500 to-teal-500 transition-all duration-1000 ease-out"
        style={{
          width: `${clampedProgress}%`,
        }}
      ></div>
    </div>
  );
};

export default ProgressBar;

