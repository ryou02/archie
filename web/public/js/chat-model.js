function addArchivedBuildSession(history, session) {
  if (history.some((item) => item.type === "build-session" && item.session.id === session.id)) {
    return history;
  }

  return [
    ...history,
    {
      type: "build-session",
      session,
      expanded: false,
    },
  ];
}

function toggleBuildSessionExpanded(history, sessionId) {
  return history.map((item) => {
    if (item.type !== "build-session" || item.session.id !== sessionId) {
      return item;
    }

    return {
      ...item,
      expanded: !item.expanded,
    };
  });
}

if (typeof window !== "undefined") {
  window.ChatModel = {
    addArchivedBuildSession,
    toggleBuildSessionExpanded,
  };
}

if (typeof module !== "undefined") {
  module.exports = {
    addArchivedBuildSession,
    toggleBuildSessionExpanded,
  };
}
