"use client";

import {
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { useEffect, useRef, useState } from "react";

export default function Showreel() {
  const section = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [playbackFailed, setPlaybackFailed] = useState(false);
  const [manuallyStarted, setManuallyStarted] = useState(false);
  const reduced = useReducedMotion();
  const visible = useInView(section, { margin: "150px" });
  const { scrollYProgress } = useScroll({
    target: section,
    offset: ["start start", "end end"],
  });
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 75,
    damping: 25,
    mass: 0.7,
  });
  const progress = useTransform(smoothProgress, (value) => {
    const p = Math.min(1, Math.max(0, value));
    // Reference power4.inOut: slow departure, broad middle, soft landing.
    return p < 0.5 ? 16 * p ** 5 : 1 - (-2 * p + 2) ** 5 / 2;
  });
  const width = useTransform(
    progress,
    (p) => `calc(${100 * (1 - p)}% + var(--reel-end-width) * ${p})`,
  );
  const height = useTransform(
    progress,
    (p) => `calc(${100 * (1 - p)}% + var(--reel-end-height) * ${p})`,
  );
  const copyOpacity = useTransform(progress, [0.35, 0.8], [0, 1]);
  const copyY = useTransform(progress, [0.35, 1], [35, 0]);
  const playbackWanted = !paused && (!reduced || manuallyStarted);

  useEffect(() => {
    const media = video.current;
    if (!media) return;
    const sync = () => {
      if (visible && playbackWanted && !document.hidden) {
        media.play().catch(() => setPlaybackFailed(true));
      } else media.pause();
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      media.pause();
    };
  }, [visible, playbackWanted]);

  const togglePlayback = () => {
    if (!playbackWanted || playbackFailed) {
      setPaused(false);
      setManuallyStarted(true);
      setPlaybackFailed(false);
      video.current?.play().catch(() => setPlaybackFailed(true));
    } else setPaused(true);
  };

  return (
    <section
      ref={section}
      className="showreel-section"
      aria-label="Studio showreel"
    >
      <div className="showreel-sticky">
        <div className="showreel-stage">
          <motion.div
            className="showreel-copy"
            style={{
              opacity: reduced ? 1 : copyOpacity,
              y: reduced ? 0 : copyY,
            }}
          >
            <span className="eyebrow">( The step aside )</span>
            <p>
              In a world of infinite images, the rare thing is clarity. Images
              defend ideas, experiences shift perception, and brands change how
              people see the world.
            </p>
          </motion.div>
          <motion.div
            className="showreel-frame"
            style={{
              width: reduced ? "var(--reel-end-width)" : width,
              height: reduced ? "var(--reel-end-height)" : height,
            }}
          >
            <video
              ref={video}
              src="/media/showreel2.mp4"
              poster="/media/showreel-poster.jpg"
              muted
              loop
              playsInline
              preload="none"
              onPlaying={() => setPlaybackFailed(false)}
              aria-label="Nothin studio selected projects film"
            />
            <button
              className="showreel-playback"
              onClick={togglePlayback}
              aria-label={
                playbackWanted && !playbackFailed
                  ? "Pause showreel"
                  : "Play showreel"
              }
            >
              {playbackWanted && !playbackFailed ? "Ⅱ" : "▷"}
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
