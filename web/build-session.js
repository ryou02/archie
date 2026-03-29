const {
  advanceTaskPlan,
  buildTaskPlan,
  deriveOverallProgress,
  finalizeTaskPlan,
} = require("./task-plan.js");

function buildSummaryFromTasks(tasks, fallback) {
  const activeTask = (tasks || []).find((task) => task.status === "active");
  if (activeTask?.detail) {
    return activeTask.detail;
  }

  if (fallback) {
    return fallback;
  }

  return "Preparing the build.";
}

function createBuildSession(plan, startedAt = Date.now()) {
  const tasks = buildTaskPlan(plan);

  return {
    id: `build_${startedAt}`,
    title: plan?.name || "Untitled Game",
    status: "running",
    startedAt,
    endedAt: null,
    elapsedMs: 0,
    summary: "Preparing the build.",
    overallProgress: deriveOverallProgress(tasks),
    tasks,
  };
}

function syncBuildSession(session, toolName, params = {}, now = Date.now()) {
  const tasks = advanceTaskPlan(session.tasks, toolName, params);

  return {
    ...session,
    status: "running",
    elapsedMs: Math.max(now - session.startedAt, 0),
    tasks,
    overallProgress: deriveOverallProgress(tasks),
    summary: buildSummaryFromTasks(tasks, "Archie is building the game."),
  };
}

function finalizeBuildSession(session, status = "complete", endedAt = Date.now()) {
  const tasks = status === "complete" ? finalizeTaskPlan(session.tasks) : session.tasks.map((task) => ({ ...task }));
  const summary =
    status === "complete"
      ? `Finished building ${session.title}.`
      : `Build failed while ${buildSummaryFromTasks(tasks, "working on the game").toLowerCase()}`;

  return {
    ...session,
    status,
    endedAt,
    elapsedMs: Math.max(endedAt - session.startedAt, 0),
    overallProgress: status === "complete" ? 100 : deriveOverallProgress(tasks),
    summary,
    tasks,
  };
}

module.exports = {
  createBuildSession,
  finalizeBuildSession,
  syncBuildSession,
};
