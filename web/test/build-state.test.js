const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createBuildState,
  createStepsFromPrompt,
} = require("../public/js/build-state.js");

test("initial state starts empty before a project prompt", () => {
  const state = createBuildState();

  assert.equal(state.state.overallProgress, 0);
  assert.equal(state.state.activeStepId, null);
  assert.equal(state.state.steps.length, 0);
  assert.equal(state.state.buildStatus, "Tell Archie what to build");
});

test("createStepsFromPrompt returns a richer project-specific task list", () => {
  const steps = createStepsFromPrompt("make a spooky zombie survival game");

  assert.deepEqual(
    steps.map((step) => step.id),
    ["vision", "world", "encounters", "gameplay"]
  );
  assert.deepEqual(
    steps.map((step) => step.label),
    [
      "Mapping the survival loop",
      "Shaping the spooky world",
      "Staging zombies and set pieces",
      "Wiring scares and win states",
    ]
  );
  assert.match(steps[0].detail, /spooky zombie survival game/i);
});

test("updateStep changes one prompt-generated step and recalculates overall progress", () => {
  const state = createBuildState();
  state.update({
    activeStepId: "vision",
    steps: createStepsFromPrompt("make a racing game"),
  });

  state.updateStep("vision", {
    status: "done",
    progress: 100,
    detail: "Ready",
  });

  assert.equal(state.state.steps[0].status, "done");
  assert.equal(state.state.steps[0].detail, "Ready");
  assert.equal(state.state.overallProgress, 25);
});

test("reset returns the state to the pre-project values", () => {
  const state = createBuildState();

  state.update({
    avatarState: "speaking",
    buildStatus: "Working",
    activeStepId: "encounters",
    steps: createStepsFromPrompt("make a castle obby"),
  });
  state.updateStep("encounters", {
    status: "active",
    progress: 80,
    detail: "Adding props",
  });

  state.reset();

  assert.equal(state.state.avatarState, "idle");
  assert.equal(state.state.buildStatus, "Tell Archie what to build");
  assert.equal(state.state.activeStepId, null);
  assert.deepEqual(state.state.steps, []);
});
