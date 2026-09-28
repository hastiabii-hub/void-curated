"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import {
  repulsionTarget,
  restingPose,
  sampleObjectTween,
  samePose,
  OBJECT_MOTION,
  type ObjectPose,
  type ObjectTween,
} from "./object-motion";

const objects = [
  { id: "foil", file: "papier-froisse.webp", rotation: 0 },
  { id: "pink", file: "chwing.webp", rotation: 0 },
  { id: "candy", file: "bonbon.webp", rotation: 112 },
  { id: "star", file: "asterix.webp", rotation: 0 },
  { id: "heart", file: "coeur-bulle-nb.webp", rotation: -18 },
];
const marks = [
  { id: "large-n", text: "N", rotation: -16 },
  { id: "small-n", text: "N", rotation: 18 },
  { id: "apostrophe", text: "’", rotation: 16 },
];

export default function ObjectPlayground() {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = container.current!;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const compact = matchMedia("(max-width: 767px)");
    const items = Array.from(
      root.querySelectorAll<HTMLElement>(".object-anchor"),
    ).map((anchor) => {
      const element = anchor.querySelector<HTMLElement>(".floating-object")!;
      const rotation = Number(anchor.dataset.rotation || 0);
      const pose = restingPose(rotation);
      return {
        anchor,
        element,
        rotation,
        x: 0,
        y: 0,
        pose,
        tween: {
          from: pose,
          to: pose,
          start: 0,
          repelled: false,
        } as ObjectTween,
      };
    });
    let raf = 0,
      visible = false,
      dirty = true,
      layoutDirty = true,
      inputTime = 0;
    let bounds: DOMRect;
    let pointer: { x: number; y: number } | null = null;
    const schedule = () => {
      if (!raf && visible && !document.hidden && !reduced.matches)
        raf = requestAnimationFrame(frame);
    };
    const invalidate = (time = performance.now()) => {
      inputTime = time;
      dirty = true;
      schedule();
    };
    const paint = (element: HTMLElement, pose: ObjectPose) => {
      element.style.transform = `translate3d(${pose.x}px, ${pose.y}px, 0) rotate(${pose.rotation}deg) scale(${pose.scale})`;
    };
    const measure = () => {
      for (const item of items) {
        // Untransformed anchors: rotation, scale and displacement never change
        // the force origin. This is what produces the broad arcs on slow sweeps.
        item.x = item.anchor.offsetLeft + item.anchor.offsetWidth / 2;
        item.y = item.anchor.offsetTop + item.anchor.offsetHeight / 2;
      }
      layoutDirty = true;
      invalidate();
    };
    const move = (event: PointerEvent) => {
      if (!event.isPrimary || reduced.matches) return;
      pointer = { x: event.clientX, y: event.clientY };
      invalidate(event.timeStamp);
    };
    const leave = () => {
      pointer = null;
      invalidate();
    };
    const releaseTouch = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") leave();
    };
    const scroll = () => {
      layoutDirty = true;
      if (visible) invalidate();
    };
    const reset = () => {
      const now = performance.now();
      for (const item of items) {
        item.pose = restingPose(item.rotation);
        item.tween = {
          from: item.pose,
          to: item.pose,
          start: now,
          repelled: false,
        };
        paint(item.element, item.pose);
      }
      dirty = true;
      schedule();
    };
    const frame = (now: number) => {
      raf = 0;
      if (!visible || document.hidden || reduced.matches) return;
      if (dirty) {
        // Read layout only when it changed, before any transform writes.
        // Pointer-only frames use the cached, untransformed section bounds.
        if (layoutDirty) {
          bounds = root.getBoundingClientRect();
          layoutDirty = false;
        }
        // Match the reference's scroll/leave behavior: an absent pointer uses
        // viewport center while the section is on screen.
        const clientPointer = pointer ?? {
          x: innerWidth / 2,
          y: innerHeight / 2,
        };
        const localPointer = {
          x: clientPointer.x - bounds.left,
          y: clientPointer.y - bounds.top,
        };
        for (const item of items) {
          const target = repulsionTarget(
            { x: item.x, y: item.y },
            localPointer,
            item.rotation,
            compact.matches,
          );
          if (!samePose(target.pose, item.tween.to)) {
            // Start at input time, not the next display frame: otherwise each
            // retarget paints t=0 and adds a variable frame of pointer latency.
            const start = Math.max(item.tween.start, Math.min(now, inputTime));
            item.tween = {
              // Keep item.pose as the last painted pose so continuous pointer
              // events cannot suppress the render on each retargeting frame.
              from: sampleObjectTween(item.tween, start),
              to: target.pose,
              start,
              repelled: target.repelled,
            };
          }
        }
        dirty = false;
      }
      let animating = false;
      for (const item of items) {
        const pose = sampleObjectTween(item.tween, now);
        if (!samePose(pose, item.pose)) {
          item.pose = pose;
          paint(item.element, pose);
        }
        const duration = item.tween.repelled
          ? OBJECT_MOTION.escapeDuration
          : OBJECT_MOTION.returnDuration;
        if (now < item.tween.start + duration) animating = true;
      }
      if (animating) schedule();
    };
    const size = new ResizeObserver(measure);
    size.observe(root);
    items.forEach((item) => size.observe(item.anchor));
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) {
        pointer = null;
        reset();
      } else {
        layoutDirty = true;
        invalidate();
      }
    });
    observer.observe(root);
    const visibility = () => {
      if (document.hidden) leave();
      else {
        layoutDirty = true;
        invalidate();
      }
    };
    root.addEventListener("pointermove", move, { passive: true });
    root.addEventListener("pointerdown", move, { passive: true });
    root.addEventListener("pointerleave", leave);
    root.addEventListener("pointerup", releaseTouch);
    root.addEventListener("pointercancel", leave);
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    window.addEventListener("blur", leave);
    document.addEventListener("visibilitychange", visibility);
    reduced.addEventListener("change", reset);
    compact.addEventListener("change", measure);
    reset();
    measure();
    return () => {
      cancelAnimationFrame(raf);
      size.disconnect();
      observer.disconnect();
      root.removeEventListener("pointermove", move);
      root.removeEventListener("pointerdown", move);
      root.removeEventListener("pointerleave", leave);
      root.removeEventListener("pointerup", releaseTouch);
      root.removeEventListener("pointercancel", leave);
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", measure);
      window.removeEventListener("blur", leave);
      document.removeEventListener("visibilitychange", visibility);
      reduced.removeEventListener("change", reset);
      compact.removeEventListener("change", measure);
    };
  }, []);

  return (
    <div
      ref={container}
      className="object-playground"
      aria-label="Interactive floating sculptures. Move your pointer or touch to push them away."
    >
      {objects.map((object) => (
        <div
          key={object.id}
          className={`object-anchor object-${object.id}`}
          data-rotation={object.rotation}
        >
          <div
            className="floating-object"
            style={{ transform: `rotate(${object.rotation}deg)` }}
          >
            <Image
              src={`/media/${object.file}`}
              alt=""
              draggable={false}
              width={900}
              height={900}
              sizes="(max-width: 767px) 80vw, 480px"
            />
          </div>
        </div>
      ))}
      {marks.map((mark) => (
        <div
          key={mark.id}
          className={`object-anchor object-${mark.id}`}
          data-rotation={mark.rotation}
          aria-hidden="true"
        >
          <span
            className="floating-object floating-mark"
            style={{ transform: `rotate(${mark.rotation}deg)` }}
          >
            {mark.text}
          </span>
        </div>
      ))}
      <span className="play-hint">
        A little room to play. <span>↗ Move or touch</span>
      </span>
    </div>
  );
}
