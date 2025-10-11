"use client";

import Image from "next/image";
import "@/../public/css/index/intro.css";
import { motion, useTransform, MotionValue, AnimatePresence } from "motion/react";
import { useScrollContext } from "@/components/scroll/scroll-provider";
import { useState, useEffect } from "react";
import IntroBackgroundSVG from "./intro-background";

export default function Intro() {
  const { scrollY } = useScrollContext();
  const [isMobile, setIsMobile] = useState(false);
  const [mobileNormal, setMobileNormal] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // No initial effect to prevent first paint animation; CSS controls default state.
  useEffect(() => {
    if (!isMobile) return;
    const container = document.getElementById("scroll-container");
    if (!container) return;
    if (!mobileNormal) {
      const prevOverflow = container.style.overflow;
      const prevTouchAction = container.style.touchAction as string;
      container.style.overflowY = "hidden";
      container.style.touchAction = "none";
      return () => {
        container.style.overflowY = prevOverflow || "auto";
        container.style.touchAction = prevTouchAction;
      };
    } else {
      container.style.overflowY = "auto";
      container.style.touchAction = "auto";
    }
  }, [isMobile, mobileNormal]);

  const y = useTransform(
    scrollY || new MotionValue(0),
    [0, 500, 1000],
    isMobile ? [0, 0, 0] : [0, -1000, -1000]
  );

  return (
    <motion.div
      className={`intro-main-wrapper ${isMobile && mobileNormal ? "intro-mobile-normal" : ""}`}
      id="intro-main-wrapper"
      style={{ y }}
    >
      <div className="intro-main-background-content">
        <div className="intro-visual">
          <div className="animate-star-3d"></div>
          <div className="animate-star orbit-1"></div>
          <div className="animate-star orbit-2"></div>
          <div className="animate-star orbit-3"></div>
          <div className="animate-star orbit-4"></div>
          <div className="animate-star orbit-5"></div>
          <div className="animate-star orbit-6"></div>
          <div
            className="intro-image-wrapper"
            style={{
              position: "relative",
              width: "calc(40dvh * 1440 / 525)",
              height: "calc(40dvh)",
              aspectRatio: "1440 / 525",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            <IntroBackgroundSVG />
          </div>
        </div>
      </div>
      <div className="intro-main-wrapper-title-wrapper">
        <div>THE VALIDATOR&apos;S</div>
        <div>GUIDE TO THE GALAXY</div>
      </div>
      <div className="intro-main-wrapper-description-wrapper">
        <div>Validatier showcases the validators&apos; behaviors,</div>
        <div>contributions, and impact within the Cosmos ecosystem</div>
      </div>
      <AnimatePresence initial={false}>
        {!mobileNormal && (
          <motion.div
            key="intro-continue"
            layout
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 0 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: "hidden" }}
          >
            <button
              type="button"
              className="intro-continue-button"
              onClick={() => setMobileNormal(true)}
            >
              Start
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
