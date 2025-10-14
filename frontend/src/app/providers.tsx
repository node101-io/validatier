'use client';
import React from 'react';
import { Next13ProgressBar } from 'next13-progressbar';

const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      {children}
      <Next13ProgressBar
        height="4px"
        color="#7c70c3"
        options={{
          showSpinner: false,
          trickleSpeed: 50,
          minimum: 0.08,
          easing: 'ease',
          speed: 220
        }}
        showOnShallow
        startPosition={0.25}
        stopDelayMs={1000}
        delay={200}
      />
    </>
  );
};

export default Providers;
