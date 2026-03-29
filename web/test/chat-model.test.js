const test = require("node:test");
const assert = require("node:assert/strict");

const {
  addArchivedBuildSession,
  toggleBuildSessionExpanded,
} = require("../public/js/chat-model.js");

test("addArchivedBuildSession appends a collapsed build-session item once", () => {
  const session = { id: "build_1", title: "Stadium Runner", status: "complete" };
  const first = addArchivedBuildSession([], session);
  const second = addArchivedBuildSession(first, session);

  assert.equal(first.length, 1);
  assert.equal(first[0].type, "build-session");
  assert.equal(first[0].expanded, false);
  assert.equal(second.length, 1);
});

test("toggleBuildSessionExpanded flips expansion for the matching session", () => {
  const history = addArchivedBuildSession([], {
    id: "build_2",
    title: "Dungeon Quest",
    status: "complete",
  });

  const expanded = toggleBuildSessionExpanded(history, "build_2");
  const collapsed = toggleBuildSessionExpanded(expanded, "build_2");

  assert.equal(expanded[0].expanded, true);
  assert.equal(collapsed[0].expanded, false);
});
