"use client";
import { createContext, useContext, useRef } from "react";
import type { PropsWithChildren } from "react";
import { useScroll  } from "motion/react";
import type {MotionValue} from "motion/react";

export type ScrollContextValue = {
  scrollY: MotionValue<number> | null;
};

const ScrollContext = createContext<ScrollContextValue>({ scrollY: null });

export function useScrollContext() {
  return useContext(ScrollContext);
}

type ScrollProviderProps = PropsWithChildren<{
  className?: string;
}>;

export default function ScrollProvider({
  className,
  children,
}: ScrollProviderProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { scrollY } = useScroll({ container: containerRef });

  return (
    <div className="flex flex-col items-center relative overflow-hidden h-screen w-full">
      <div ref={containerRef} className={className} id="scroll-container">
        <ScrollContext.Provider value={{ scrollY }}>
          {children}
        </ScrollContext.Provider>
      </div>
    </div>
  );
}
