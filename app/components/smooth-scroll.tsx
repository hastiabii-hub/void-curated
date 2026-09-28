"use client";
import { useEffect } from "react";
import Lenis from "lenis";
export default function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.085,
      smoothWheel: true,
      syncTouch: false, // Native iOS/Android inertia avoids a second momentum curve.
      anchors: { offset: -20 },
      respectReducedMotion: true,
      virtualScroll: (data) => {
        if (data.event instanceof WheelEvent) {
          if (data.event.ctrlKey) return false;
          // Lenis converts line/page units first. Preserve small trackpad deltas
          // and soften large mouse steps continuously, without OS sniffing.
          const soften = (n: number) =>
            Math.sign(n) * 100 * Math.tanh(Math.abs(n) / 100);
          data.deltaY = soften(data.deltaY);
          data.deltaX = soften(data.deltaX);
        }
        return true;
      },
    });
    return () => lenis.destroy();
  }, []);
  return null;
}
