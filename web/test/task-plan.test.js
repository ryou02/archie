const test = require("node:test");
const assert = require("node:assert/strict");

const {
  advanceTaskPlan,
  buildTaskPlan,
  deriveOverallProgress,
  finalizeTaskPlan,
  parsePlanFromSpeech,
} = require("../task-plan.js");

test("parsePlanFromSpeech extracts the structured plan from Archie response text", () => {
  const speech = `Alright here's what I'm thinking!

Haunted House

World: Nighttime, heavy fog, dark and creepy, moonlit
Objects: Haunted house, gravestones, dead trees, iron fence, candles
Characters: Ghost NPCs, skeleton enemy
Animations: Ghost floating idle, skeleton attack animation
Gameplay: Explore the house with a flashlight, jumpscares when you enter rooms
Audio: Spooky ambient wind, creaking doors, jumpscare sound effects

Sound good? Say go and I'll start building!`;

  const plan = parsePlanFromSpeech(speech);

  assert.equal(plan.name, "Haunted House");
  assert.equal(plan.world, "Nighttime, heavy fog, dark and creepy, moonlit");
  assert.equal(
    plan.objects,
    "Haunted house, gravestones, dead trees, iron fence, candles"
  );
  assert.equal(plan.status, "waiting_approval");
});

test("parsePlanFromSpeech supports legacy Main Objects labels", () => {
  const speech = `Street Racer

World: City streets, bright daytime, clear sky, urban vibe
Main Objects: Road track, 3 race cars, traffic cones, street lights
Gameplay: Drive the car around the track, lap counter on screen
Audio: Racing engine loop, background music, crash sound effects`;

  const plan = parsePlanFromSpeech(speech);

  assert.equal(plan.name, "Street Racer");
  assert.equal(plan.objects, "Road track, 3 race cars, traffic cones, street lights");
});

test("buildTaskPlan creates a variable-length task list from plan sections", () => {
  const steps = buildTaskPlan({
    name: "Haunted House",
    world: "Nighttime, heavy fog, dark and creepy, moonlit",
    objects: "Haunted house, gravestones, dead trees, iron fence, candles",
    characters: "Ghost NPCs, skeleton enemy",
    animations: "Ghost floating idle, skeleton attack animation",
    gameplay: "Explore the house with a flashlight, jumpscares when you enter rooms",
    audio: "Spooky ambient wind, creaking doors, jumpscare sound effects",
  });

  assert.deepEqual(
    steps.map((step) => step.id),
    [
      "review-plan",
      "build-world",
      "place-objects",
      "add-characters",
      "script-gameplay",
      "mix-audio",
    ]
  );
  assert.equal(steps[0].label, "Review Haunted House");
  assert.match(steps[2].detail, /gravestones/i);
  assert.match(steps[3].detail, /Ghost NPCs/i);
});

test("buildTaskPlan omits optional sections when they are not needed", () => {
  const steps = buildTaskPlan({
    name: "Street Racer",
    world: "City streets, bright daytime, clear sky, urban vibe",
    objects: "Road track, 3 race cars, traffic cones, street lights",
    characters: "None needed",
    animations: "None needed",
    gameplay: "Drive the car around the track, lap counter on screen",
    audio: "None needed",
  });

  assert.deepEqual(
    steps.map((step) => step.id),
    ["review-plan", "build-world", "place-objects", "script-gameplay"]
  );
});

test("advanceTaskPlan activates the matching task bucket for a tool call", () => {
  const taskPlan = buildTaskPlan({
    name: "Stadium Runner",
    world: "Bright daytime stadium",
    objects: "Stadium structure and oval running track",
    characters: "None needed",
    animations: "None needed",
    gameplay: "Run laps around the track",
    audio: "Crowd ambience and whistle sounds",
  });

  const next = advanceTaskPlan(taskPlan, "search_toolbox", {
    query: "stadium",
  });

  assert.equal(next[0].status, "done");
  assert.equal(next[0].progress, 100);
  assert.equal(next[2].status, "active");
  assert.equal(next[2].progress, 20);
  assert.match(next[2].detail, /stadium/i);
});

test("finalizeTaskPlan marks all tasks complete and deriveOverallProgress returns 100", () => {
  const taskPlan = finalizeTaskPlan([
    { id: "a", progress: 24, status: "active", detail: "placing stadium" },
    { id: "b", progress: 0, status: "upcoming", detail: "creating script" },
  ]);

  assert.deepEqual(
    taskPlan.map((step) => [step.id, step.status, step.progress]),
    [
      ["a", "done", 100],
      ["b", "done", 100],
    ]
  );
  assert.equal(deriveOverallProgress(taskPlan), 100);
});
