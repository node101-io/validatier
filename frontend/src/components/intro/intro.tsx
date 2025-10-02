"use client";

import Image from "next/image";
import "@/../public/css/index/intro.css";
import { motion, useTransform, MotionValue } from "motion/react";
import { useScrollContext } from "@/components/scroll/scroll-provider";
import { useState, useEffect } from "react";

export default function Intro() {
  const { scrollY } = useScrollContext();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const y = useTransform(
    scrollY || new MotionValue(0),
    [0, 500, 1000],
    isMobile ? [0, 0, 0] : [0, -1000, -1000]
  );

  return (
    <motion.div
      className="intro-main-wrapper"
      id="intro-main-wrapper"
      style={{ y }}
    >
      <div className="intro-main-background-content">
        <div className="animate-star-3d"></div>
        <div className="animate-star orbit-1"></div>
        <div className="animate-star orbit-2"></div>
        <div className="animate-star orbit-3"></div>
        <div className="animate-star orbit-4"></div>
        <div className="animate-star orbit-5"></div>
        <div className="animate-star orbit-6"></div>
        <div
          style={{
            position: "relative",
            width: "1440px",
            height: "525px",
            aspectRatio: "1440 / 525",
          }}
        >
          <Image
            src="/res/images/intro.svg"
            alt="intro"
            fill
            style={{ objectFit: "cover", objectPosition: "center" }}
            priority
          />
        </div>
      </div>
      <div className="intro-main-wrapper-title-wrapper">
        <div>THE VALIDATOR&apos;S</div>
        <div>GUIDE TO THE GALAXY</div>
      </div>
      <div className="intro-main-wrapper-description-wrapper">
        <div>
          Validatier showcases the validators&apos;behaviors,
        </div>
        <div>contributions, and impact within the Cosmos ecosystem</div>
      </div>
    </motion.div>
  );
}
