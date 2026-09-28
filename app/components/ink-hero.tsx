"use client";
import { useEffect, useRef } from "react";

export default function InkHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current!,
      video = videoRef.current!;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let cancelled = false;
    let initializing = false;
    let cleanup: (() => void) | undefined;
    const setup = async () => {
      const { FluidReveal } = await import("./fluid-reveal");
      if (cancelled || reduced.matches) return;
      const fluid = new FluidReveal(canvas, video);
      let visible = true,
        lost = false,
        raf = 0,
        last = 0,
        accumulated = 0;
      const tick = 1000 / 60;
      const resetClock = () => {
        last = 0;
        accumulated = 0;
        fluid.releasePointer();
      };
      const running = () =>
        visible && !document.hidden && !reduced.matches && !lost;
      const syncPlayback = () => {
        resetClock();
        if (running()) video.play().catch(() => {});
        else video.pause();
      };
      const pointer = (event: PointerEvent) => {
        if (!running() || !event.isPrimary) return;
        const box = canvas.getBoundingClientRect();
        const x = (event.clientX - box.left) / box.width,
          y = 1 - (event.clientY - box.top) / box.height;
        if (x < 0 || x > 1 || y < 0 || y > 1) {
          fluid.releasePointer();
          return;
        }
        fluid.movePointer(x, y);
        if (video.paused) video.play().catch(() => {});
      };
      const release = () => fluid.releasePointer();
      const endTouch = (event: PointerEvent) => {
        if (event.pointerType !== "mouse") release();
      };
      const resize = new ResizeObserver(() => {
        if (!lost) fluid.resize();
        resetClock();
      });
      resize.observe(canvas);
      const intersection = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (!visible && !lost) fluid.clear();
        syncPlayback();
      });
      intersection.observe(canvas);
      const motionChange = () => {
        if (!lost) fluid.clear();
        syncPlayback();
      };
      const contextLost = (event: Event) => {
        event.preventDefault();
        lost = true;
        canvas.style.visibility = "hidden";
        syncPlayback();
      };
      const contextRestored = () => {
        lost = false;
        fluid.clear();
        fluid.resize();
        canvas.style.visibility = "";
        syncPlayback();
      };
      const frame = (now: number) => {
        raf = requestAnimationFrame(frame);
        if (!running()) {
          resetClock();
          return;
        }
        accumulated += last ? Math.min(now - last, tick * 3) : tick;
        last = now;
        const box = canvas.getBoundingClientRect();
        const fade = Math.max(0, -box.top / Math.max(1, box.height));
        while (accumulated >= tick) {
          fluid.step(fade);
          accumulated -= tick;
        }
        fluid.draw();
      };
      window.addEventListener("pointermove", pointer, { passive: true });
      window.addEventListener("pointerdown", pointer, { passive: true });
      window.addEventListener("pointerup", endTouch, { passive: true });
      window.addEventListener("pointercancel", release);
      window.addEventListener("blur", release);
      document.addEventListener("visibilitychange", syncPlayback);
      reduced.addEventListener("change", motionChange);
      canvas.addEventListener("webglcontextlost", contextLost);
      canvas.addEventListener("webglcontextrestored", contextRestored);
      syncPlayback();
      raf = requestAnimationFrame(frame);
      cleanup = () => {
        cancelAnimationFrame(raf);
        resize.disconnect();
        intersection.disconnect();
        window.removeEventListener("pointermove", pointer);
        window.removeEventListener("pointerdown", pointer);
        window.removeEventListener("pointerup", endTouch);
        window.removeEventListener("pointercancel", release);
        window.removeEventListener("blur", release);
        document.removeEventListener("visibilitychange", syncPlayback);
        reduced.removeEventListener("change", motionChange);
        canvas.removeEventListener("webglcontextlost", contextLost);
        canvas.removeEventListener("webglcontextrestored", contextRestored);
        video.pause();
        fluid.dispose();
        canvas.style.visibility = "";
      };
    };
    const start = () => {
      if (!reduced.matches && !cleanup && !initializing && !cancelled) {
        initializing = true;
        canvas.style.visibility = "";
        setup()
          .catch((error) => {
            if (!cancelled) {
              canvas.style.visibility = "hidden";
              console.warn("Fluid reveal unavailable:", error);
            }
          })
          .finally(() => {
            initializing = false;
          });
      }
    };
    start();
    reduced.addEventListener("change", start);
    return () => {
      cancelled = true;
      reduced.removeEventListener("change", start);
      cleanup?.();
    };
  }, []);
  return (
    <>
      <canvas ref={canvasRef} className="ink-canvas" aria-hidden="true" />
      <video
        ref={videoRef}
        className="shader-source"
        src="/media/void-hero.mp4"
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
      />
    </>
  );
}
