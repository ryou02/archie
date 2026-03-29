import test from "node:test";
import assert from "node:assert/strict";

import {
  addArchivedBuildSession,
  getSessionElapsedMs,
  mergeArchivedBuildSessions,
  toggleBuildSessionExpanded,
  type BuildSession,
  type ChatHistoryItem,
} from "../src/lib/build-history";

function createSession(overrides: Partial<BuildSession> = {}): BuildSession {
  return {
    id: "build_1",
    title: "Stadium Runner",
    status: "complete",
    startedAt: 1000,
    endedAt: 6500,
    elapsedMs: 5500,
    summary: "Finished building Stadium Runner.",
    overallProgress: 100,
    tasks: [],
    ...overrides,
  };
}

test("addArchivedBuildSession appends a collapsed build-session item once", () => {
  const session = createSession();
  const first = addArchivedBuildSession([], session);
  const second = addArchivedBuildSession(first, session);

  assert.equal(first.length, 1);
  assert.equal(first[0]?.type, "build-session");
  assert.equal(first[0]?.expanded, false);
  assert.equal(second.length, 1);
});

test("toggleBuildSessionExpanded flips expansion for the matching session", () => {
  const history = addArchivedBuildSession([], createSession({ id: "build_2" }));

  const expanded = toggleBuildSessionExpanded(history, "build_2");
  const collapsed = toggleBuildSessionExpanded(expanded, "build_2");

  assert.equal(expanded[0]?.type, "build-session");
  assert.equal(expanded[0]?.expanded, true);
  assert.equal(collapsed[0]?.expanded, false);
});

test("mergeArchivedBuildSessions preserves existing text items while deduping sessions", () => {
  const history: ChatHistoryItem[] = [
    { type: "text", role: "assistant", content: "What should we build today?" },
  ];

  const merged = mergeArchivedBuildSessions(history, [
    createSession({ id: "build_3", title: "Dungeon Quest" }),
    createSession({ id: "build_3", title: "Dungeon Quest" }),
    createSession({ id: "build_4", title: "Sky Obby" }),
  ]);

  assert.equal(merged.length, 3);
  assert.equal(merged[0]?.type, "text");
  assert.equal(merged[1]?.type, "build-session");
  assert.equal(merged[2]?.type, "build-session");
});

test("getSessionElapsedMs uses wall clock time while a session is running", () => {
  const elapsed = getSessionElapsedMs(
    createSession({
      startedAt: 1000,
      endedAt: null,
      elapsedMs: 4000,
      status: "running",
    }),
    5800
  );

  assert.equal(elapsed, 4800);
});

test("getSessionElapsedMs keeps the recorded duration for completed sessions", () => {
  const elapsed = getSessionElapsedMs(createSession(), 9000);

  assert.equal(elapsed, 5500);
});
