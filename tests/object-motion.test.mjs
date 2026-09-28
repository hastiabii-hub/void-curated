import test from "node:test";
import assert from "node:assert/strict";
import {
  repulsionTarget,
  restingPose,
  sampleObjectTween,
} from "../app/components/object-motion.ts";

test("slow pointer approach uses the resting anchor, with the reference reach and depth", () => {
  const anchor = { x: 800, y: 400 };
  const outside = repulsionTarget(anchor, { x: 1261, y: 400 });
  assert.equal(outside.repelled, false);
  const near = repulsionTarget(anchor, { x: 900, y: 400 });
  assert.ok(
    near.pose.x < -250,
    "slow input must produce broad displacement without velocity",
  );
  assert.equal(near.pose.y, 0);
  assert.ok(near.pose.scale > 1.13);
  assert.ok(near.pose.rotation < -20);
  const center = repulsionTarget(anchor, anchor);
  assert.equal(center.pose.x, -380);
  assert.equal(center.pose.scale, 1.2);
  assert.ok(Object.values(center.pose).every(Number.isFinite));
});

test("a slow circular sweep produces an arc rather than accumulating drift", () => {
  const anchor = { x: 800, y: 400 };
  const radius = [];
  for (let i = 0; i <= 120; i++) {
    const angle = (i / 120) * Math.PI * 2;
    const pointer = {
      x: anchor.x + Math.cos(angle) * 150,
      y: anchor.y + Math.sin(angle) * 150,
    };
    const { pose } = repulsionTarget(anchor, pointer, -18);
    assert.ok(
      pose.x * (pointer.x - anchor.x) + pose.y * (pointer.y - anchor.y) < 0,
    );
    radius.push(Math.hypot(pose.x, pose.y));
  }
  assert.ok(Math.max(...radius) - Math.min(...radius) < 1e-9);
  assert.ok(radius[0] > 190);
});

test("return overshoots softly and settles exactly after 1.2 seconds", () => {
  const from = { x: -300, y: 100, rotation: -28, scale: 1.18 };
  const to = restingPose(-18);
  const tween = { from, to, start: 0, repelled: false };
  assert.deepEqual(sampleObjectTween(tween, 0), from);
  assert.ok(
    sampleObjectTween(tween, 210).x > 0,
    "elastic return should cross the resting point",
  );
  assert.deepEqual(sampleObjectTween(tween, 1200), to);
});

test("escape is time-based, reaches its target at 450 ms, and can retarget without a jump", () => {
  const from = restingPose();
  const to = repulsionTarget({ x: 0, y: 0 }, { x: 100, y: 0 }).pose;
  const tween = { from, to, start: 0, repelled: true };
  for (const fps of [30, 60, 120, 144]) {
    for (let i = 0; i < fps; i++) sampleObjectTween(tween, (i * 1000) / fps);
    assert.deepEqual(sampleObjectTween(tween, 450), to);
  }
  const midpoint = sampleObjectTween(tween, 150);
  const retargeted = {
    from: midpoint,
    to: restingPose(),
    start: 150,
    repelled: false,
  };
  assert.deepEqual(sampleObjectTween(retargeted, 150), midpoint);
});

test("touch uses the smaller reference envelope and leaves distant objects at rest", () => {
  const anchor = { x: 200, y: 200 };
  const center = repulsionTarget(anchor, anchor, 112, true);
  assert.equal(center.pose.x, -110);
  assert.equal(center.pose.scale, 1.1);
  assert.deepEqual(
    repulsionTarget(anchor, { x: 461, y: 200 }, 112, true).pose,
    restingPose(112),
  );
  assert.deepEqual(repulsionTarget(anchor, null, 112).pose, restingPose(112));
});
