function isMeaningfulSection(value) {
  const normalized = (value || "").trim().toLowerCase();

  if (!normalized) {
    return false;
  }

  return !/^(none|none needed|n\/a|na|not needed|no audio|no characters)$/i.test(
    normalized
  );
}

function readSection(speech, labels) {
  for (const label of labels) {
    const match = speech.match(new RegExp(`^${label}:\\s*(.+)$`, "im"));
    if (match) {
      return match[1].trim();
    }
  }

  return "";
}

function extractPlanName(lines, firstSectionIndex) {
  for (let index = firstSectionIndex - 1; index >= 0; index -= 1) {
    const candidate = lines[index].trim();
    if (!candidate) {
      continue;
    }

    if (/^alright here's what i'm thinking!?$/i.test(candidate)) {
      continue;
    }

    return candidate;
  }

  return "Untitled Game";
}

function parsePlanFromSpeech(speech) {
  if (!speech || !speech.includes("World:") || !speech.includes("Gameplay:")) {
    return null;
  }

  const lines = speech
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const firstSectionIndex = lines.findIndex((line) =>
    /^(World|Objects|Main Objects|Characters|Animations|Gameplay|Audio):/i.test(line)
  );

  if (firstSectionIndex === -1) {
    return null;
  }

  const plan = {
    name: extractPlanName(lines, firstSectionIndex),
    world: readSection(speech, ["World"]),
    objects: readSection(speech, ["Objects", "Main Objects"]),
    characters: readSection(speech, ["Characters"]),
    animations: readSection(speech, ["Animations"]),
    gameplay: readSection(speech, ["Gameplay"]),
    audio: readSection(speech, ["Audio"]),
    status: "waiting_approval",
  };

  if (!plan.world || !plan.gameplay || !plan.objects) {
    return null;
  }

  return plan;
}

function summarizeDetail(value, fallback) {
  const cleaned = (value || "").trim().replace(/\s+/g, " ");

  if (!cleaned) {
    return fallback;
  }

  return cleaned.length > 120 ? `${cleaned.slice(0, 120).trim()}...` : cleaned;
}

function buildTaskPlan(plan) {
  if (!plan) {
    return [];
  }

  const steps = [
    {
      id: "review-plan",
      label: `Review ${plan.name}`,
      progress: 0,
      status: "upcoming",
      detail: summarizeDetail(
        plan.gameplay,
        "Check that the game loop and vibe feel right."
      ),
    },
    {
      id: "build-world",
      label: "Build the world",
      progress: 0,
      status: "upcoming",
      detail: summarizeDetail(plan.world, "Set the mood and environment."),
    },
    {
      id: "place-objects",
      label: "Place key objects",
      progress: 0,
      status: "upcoming",
      detail: summarizeDetail(
        plan.objects,
        "Drop in the main landmarks and interactables."
      ),
    },
  ];

  if (isMeaningfulSection(plan.characters) || isMeaningfulSection(plan.animations)) {
    steps.push({
      id: "add-characters",
      label: "Add characters and motion",
      progress: 0,
      status: "upcoming",
      detail: summarizeDetail(
        [plan.characters, plan.animations].filter(isMeaningfulSection).join(" | "),
        "Bring the cast to life."
      ),
    });
  }

  steps.push({
    id: "script-gameplay",
    label: "Script gameplay",
    progress: 0,
    status: "upcoming",
    detail: summarizeDetail(plan.gameplay, "Wire the core loop and win conditions."),
  });

  if (isMeaningfulSection(plan.audio)) {
    steps.push({
      id: "mix-audio",
      label: "Layer in audio",
      progress: 0,
      status: "upcoming",
      detail: summarizeDetail(plan.audio, "Add the final soundscape."),
    });
  }

  return steps;
}

function deriveOverallProgress(taskPlan) {
  if (!taskPlan || taskPlan.length === 0) {
    return 0;
  }

  return taskPlan.reduce((sum, step) => sum + (step.progress || 0), 0) / taskPlan.length;
}

function markDone(step, detail) {
  return {
    ...step,
    status: "done",
    progress: 100,
    detail: detail || step.detail,
  };
}

function markActive(step, progress, detail) {
  return {
    ...step,
    status: "active",
    progress: Math.max(step.progress || 0, progress),
    detail: detail || step.detail,
  };
}

function toolTargets(toolName, params = {}) {
  const query = `${params.query || ""}`.toLowerCase();

  if (toolName === "set_lighting" || toolName === "set_atmosphere" || toolName === "modify_terrain") {
    return { stepId: "build-world", progress: 28, detail: "Shaping the environment." };
  }

  if (toolName === "search_toolbox") {
    if (/(sound|music|audio|ambient)/.test(query)) {
      return {
        stepId: "mix-audio",
        progress: 28,
        detail: `Searching for ${params.query || "audio"} assets.`,
      };
    }

    if (/(character|npc|enemy|ghost|zombie|monster|animal|animation)/.test(query)) {
      return {
        stepId: "add-characters",
        progress: 28,
        detail: `Searching for ${params.query || "character"} assets.`,
      };
    }

    return {
      stepId: "place-objects",
      progress: 20,
      detail: `Searching for ${params.query || "build"} assets.`,
    };
  }

  if (toolName === "insert_asset" || toolName === "get_properties" || toolName === "set_properties") {
    return {
      stepId: "place-objects",
      progress: 55,
      detail: "Placing and adjusting scene assets.",
    };
  }

  if (
    toolName === "create_script" ||
    toolName === "run_code" ||
    toolName === "find_instances" ||
    toolName === "create_instance"
  ) {
    return {
      stepId: "script-gameplay",
      progress: 62,
      detail: "Wiring gameplay systems.",
    };
  }

  if (
    toolName === "start_playtest" ||
    toolName === "get_console_output" ||
    toolName === "stop_playtest"
  ) {
    return {
      stepId: "script-gameplay",
      progress: 88,
      detail: "Testing the game flow.",
    };
  }

  return null;
}

function advanceTaskPlan(taskPlan, toolName, params = {}) {
  if (!taskPlan || taskPlan.length === 0) {
    return [];
  }

  const next = taskPlan.map((step) => ({ ...step }));
  const reviewIndex = next.findIndex((step) => step.id === "review-plan");
  if (reviewIndex !== -1) {
    next[reviewIndex] = markDone(next[reviewIndex], "The plan is locked in.");
  }

  const target = toolTargets(toolName, params);
  if (!target) {
    return next;
  }

  const targetIndex = next.findIndex((step) => step.id === target.stepId);
  if (targetIndex === -1) {
    return next;
  }

  next[targetIndex] = markActive(next[targetIndex], target.progress, target.detail);
  return next;
}

function finalizeTaskPlan(taskPlan) {
  return (taskPlan || []).map((step) => markDone(step));
}

module.exports = {
  advanceTaskPlan,
  buildTaskPlan,
  deriveOverallProgress,
  finalizeTaskPlan,
  parsePlanFromSpeech,
};
