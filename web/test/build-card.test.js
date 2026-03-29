const test = require("node:test");
const assert = require("node:assert/strict");

const { getSessionElapsedMs } = require("../public/js/build-card.js");

test("getSessionElapsedMs uses wall clock time while a session is running", () => {
  const elapsed = getSessionElapsedMs(
    {
      startedAt: 1000,
      endedAt: null,
      elapsedMs: 4000,
      status: "running",
    },
    5800
  );

  assert.equal(elapsed, 4800);
});

test("getSessionElapsedMs keeps the recorded duration for completed sessions", () => {
  const elapsed = getSessionElapsedMs(
    {
      startedAt: 1000,
      endedAt: 6500,
      elapsedMs: 5500,
      status: "complete",
    },
    9000
  );

  assert.equal(elapsed, 5500);
});
