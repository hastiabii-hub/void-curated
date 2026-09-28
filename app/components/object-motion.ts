/** Repulsion and easing from Kv() in the supplied temp/main.js. */
export const OBJECT_MOTION = {
  desktop: { influenceRadius: 460, maxDistance: 380, rotation: 30, scale: 0.2 },
  mobile: { influenceRadius: 260, maxDistance: 110, rotation: 12, scale: 0.1 },
  escapeDuration: 450,
  returnDuration: 1200,
  falloff: 1.6,
  elasticPeriod: 0.35,
} as const;

export type Point = { x: number; y: number };
export type ObjectPose = Point & { rotation: number; scale: number };
export type ObjectTween = {
  from: ObjectPose;
  to: ObjectPose;
  start: number;
  repelled: boolean;
};

export function restingPose(rotation = 0): ObjectPose {
  return { x: 0, y: 0, rotation, scale: 1 };
}

export function repulsionTarget(
  anchor: Point,
  pointer: Point | null,
  baseRotation = 0,
  compact = false,
): { pose: ObjectPose; repelled: boolean } {
  const settings = compact ? OBJECT_MOTION.mobile : OBJECT_MOTION.desktop;
  if (!pointer) return { pose: restingPose(baseRotation), repelled: false };
  const dx = anchor.x - pointer.x;
  const dy = anchor.y - pointer.y;
  const distance = Math.hypot(dx, dy);
  if (distance >= settings.influenceRadius) {
    return { pose: restingPose(baseRotation), repelled: false };
  }
  const influence =
    (1 - distance / settings.influenceRadius) ** OBJECT_MOTION.falloff;
  // A deterministic direction at the exact center avoids NaN and jitter.
  const nx = distance > 0.0001 ? dx / distance : -1;
  const ny = distance > 0.0001 ? dy / distance : 0;
  return {
    pose: {
      x: nx * influence * settings.maxDistance,
      y: ny * influence * settings.maxDistance,
      rotation: baseRotation + nx * influence * settings.rotation,
      scale: 1 + influence * settings.scale,
    },
    repelled: true,
  };
}

export function sampleObjectTween(
  tween: ObjectTween,
  time: number,
): ObjectPose {
  const duration = tween.repelled
    ? OBJECT_MOTION.escapeDuration
    : OBJECT_MOTION.returnDuration;
  const t = Math.min(1, Math.max(0, (time - tween.start) / duration));
  if (t === 0) return { ...tween.from };
  if (t === 1) return { ...tween.to };
  const p = OBJECT_MOTION.elasticPeriod;
  const ease = tween.repelled
    ? 1 - (1 - t) ** 5 // GSAP power4.out
    : 1 + 2 ** (-10 * t) * Math.sin(((t - p / 4) * (2 * Math.PI)) / p);
  const mix = (from: number, to: number) => from + (to - from) * ease;
  return {
    x: mix(tween.from.x, tween.to.x),
    y: mix(tween.from.y, tween.to.y),
    rotation: mix(tween.from.rotation, tween.to.rotation),
    scale: mix(tween.from.scale, tween.to.scale),
  };
}

export function samePose(a: ObjectPose, b: ObjectPose) {
  return (
    Math.abs(a.x - b.x) < 0.01 &&
    Math.abs(a.y - b.y) < 0.01 &&
    Math.abs(a.rotation - b.rotation) < 0.001 &&
    Math.abs(a.scale - b.scale) < 0.00001
  );
}
