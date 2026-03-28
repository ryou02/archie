const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createBuildState,
  defaultSteps,
} = require("../public/js/build-state.js");

test("initial state starts with default steps and zero progress", () => {
  const state = createBuildState();

  assert.equal(state.state.overallProgress, 0);
  assert.equal(state.state.activeStepId, defaultSteps[0].id);
  assert.equal(state.state.steps.length, 4);
  assert.deepEqual(
    state.state.steps.map((step) => step.progress),
    [0, 0, 0, 0]
  );
});

test("updateStep changes one step and recalculates overall progress", () => {
  const state = createBuildState();

  state.updateStep("plan", {
    status: "done",
    progress: 100,
    detail: "Ready",
  });

  assert.equal(state.state.steps[0].status, "done");
  assert.equal(state.state.steps[0].detail, "Ready");
  assert.equal(state.state.overallProgress, 25);
});

test("reset returns the state to the default values", () => {
  const state = createBuildState();

  state.update({
    avatarState: "speaking",
    buildStatus: "Working",
    activeStepId: "objects",
  });
  state.updateStep("objects", {
    status: "active",
    progress: 80,
    detail: "Adding props",
  });

  state.reset();

  assert.equal(state.state.avatarState, "idle");
  assert.equal(state.state.buildStatus, "Waiting for a build idea");
  assert.equal(state.state.activeStepId, "plan");
  assert.deepEqual(
    state.state.steps.map((step) => step.progress),
    [0, 0, 0, 0]
  );
});
