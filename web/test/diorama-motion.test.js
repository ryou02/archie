const test = require("node:test");
const assert = require("node:assert/strict");

test("computeRevealState eases toward the target and adds a settling offset", async () => {
  const { computeRevealState } = await import("../public/js/diorama-motion.mjs");

  const state = computeRevealState({
    currentReveal: 0.3,
    targetReveal: 1,
    delta: 0.1,
    elapsedTime: 2.4,
    groupIndex: 1,
    reducedMotion: false,
  });

  assert.ok(state.reveal > 0.3);
  assert.ok(state.reveal < 1);
  assert.ok(state.positionY > 0);
  assert.notEqual(state.rotationZ, 0);
});

test("computeRevealState snaps directly to the target for reduced motion", async () => {
  const { computeRevealState } = await import("../public/js/diorama-motion.mjs");

  const state = computeRevealState({
    currentReveal: 0.15,
    targetReveal: 0.75,
    delta: 0.1,
    elapsedTime: 1,
    groupIndex: 0,
    reducedMotion: true,
  });

  assert.equal(state.reveal, 0.75);
  assert.equal(state.rotationZ, 0);
});

test("computeCameraPose adds multi-axis drift when motion is enabled", async () => {
  const { computeCameraPose } = await import("../public/js/diorama-motion.mjs");

  const state = computeCameraPose({
    elapsedTime: 3.2,
    reducedMotion: false,
    basePosition: { x: 5.5, y: 4.6, z: 6.4 },
    baseTarget: { x: 0, y: 0.8, z: 0 },
  });

  assert.notEqual(state.position.x, 5.5);
  assert.notEqual(state.position.z, 6.4);
  assert.notEqual(state.target.x, 0);
  assert.notEqual(state.target.y, 0.8);
});
