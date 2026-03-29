const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createBuildSession,
  finalizeBuildSession,
  syncBuildSession,
} = require("../build-session.js");

const samplePlan = {
  name: "Stadium Runner",
  world: "Bright daytime stadium",
  objects: "Stadium structure and oval running track",
  characters: "None needed",
  animations: "None needed",
  gameplay: "Run laps around the track",
  audio: "Crowd ambience and whistle sounds",
};

test("createBuildSession creates a running session with generated tasks", () => {
  const session = createBuildSession(samplePlan, 1000);

  assert.equal(session.id, "build_1000");
  assert.equal(session.title, "Stadium Runner");
  assert.equal(session.status, "running");
  assert.equal(session.overallProgress, 0);
  assert.equal(session.tasks.length, 5);
});

test("syncBuildSession updates task progress and summary from a tool call", () => {
  const session = createBuildSession(samplePlan, 1000);
  const next = syncBuildSession(session, "search_toolbox", { query: "stadium" });

  assert.equal(next.status, "running");
  assert.ok(next.overallProgress > 0);
  assert.match(next.summary, /searching/i);
  assert.equal(next.tasks[2].status, "active");
});

test("finalizeBuildSession completes and freezes a successful run", () => {
  const session = syncBuildSession(
    createBuildSession(samplePlan, 1000),
    "create_script",
    { name: "LapScript" }
  );
  const finalSession = finalizeBuildSession(session, "complete", 2200);

  assert.equal(finalSession.status, "complete");
  assert.equal(finalSession.endedAt, 2200);
  assert.equal(finalSession.elapsedMs, 1200);
  assert.equal(finalSession.overallProgress, 100);
  assert.ok(finalSession.tasks.every((task) => task.status === "done"));
});

test("finalizeBuildSession preserves partial progress for failed runs", () => {
  const session = syncBuildSession(
    createBuildSession(samplePlan, 1000),
    "search_toolbox",
    { query: "stadium" }
  );
  const failedSession = finalizeBuildSession(session, "failed", 1500);

  assert.equal(failedSession.status, "failed");
  assert.ok(failedSession.overallProgress < 100);
  assert.match(failedSession.summary, /failed/i);
});
