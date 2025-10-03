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
          speed: 200
        }}
        showOnShallow
        startPosition={0.3}
        stopDelayMs={1500}
        delay={0}
      />
    </>
  );
};

export default Providers;
