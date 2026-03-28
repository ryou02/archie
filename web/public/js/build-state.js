const STEP_BLUEPRINTS = {
  spooky: {
    vision: "Mapping the survival loop",
    world: "Shaping the spooky world",
    encounters: "Staging zombies and set pieces",
    gameplay: "Wiring scares and win states",
  },
  default: {
    vision: "Mapping the game loop",
    world: "Shaping the world",
    encounters: "Staging characters and set pieces",
    gameplay: "Wiring gameplay and polish",
  },
};

function summarizePrompt(text) {
  const cleaned = (text || "").trim().replace(/\s+/g, " ");

  if (!cleaned) {
    return "your game idea";
  }

  return cleaned.length > 54 ? `${cleaned.slice(0, 54).trim()}...` : cleaned;
}

function pickBlueprint(prompt) {
  const normalized = (prompt || "").toLowerCase();

  if (/(spooky|scary|haunted|horror|zombie|ghost|monster)/.test(normalized)) {
    return STEP_BLUEPRINTS.spooky;
  }

  return STEP_BLUEPRINTS.default;
}

function createStepsFromPrompt(prompt) {
  const blueprint = pickBlueprint(prompt);
  const topic = summarizePrompt(prompt);

  return [
    {
      id: "vision",
      label: blueprint.vision,
      progress: 0,
      status: "upcoming",
      detail: `Locking in ${topic}.`,
    },
    {
      id: "world",
      label: blueprint.world,
      progress: 0,
      status: "upcoming",
      detail: "",
    },
    {
      id: "encounters",
      label: blueprint.encounters,
      progress: 0,
      status: "upcoming",
      detail: "",
    },
    {
      id: "gameplay",
      label: blueprint.gameplay,
      progress: 0,
      status: "upcoming",
      detail: "",
    },
  ];
}

function createBaseState() {
  return {
    avatarState: "idle",
    overallProgress: 0,
    activeStepId: null,
    buildStatus: "Tell Archie what to build",
    steps: [],
  };
}

function createBuildState() {
  return {
    state: createBaseState(),
    listeners: new Set(),

    subscribe(listener) {
      this.listeners.add(listener);
      listener(this.state);
      return () => this.listeners.delete(listener);
    },

    notify() {
      this.listeners.forEach((listener) => listener(this.state));
    },

    update(patch) {
      this.state = { ...this.state, ...patch };
      this.notify();
    },

    createStepsFromPrompt(prompt) {
      return createStepsFromPrompt(prompt);
    },

    updateStep(stepId, stepPatch) {
      const steps = this.state.steps.map((step) =>
        step.id === stepId ? { ...step, ...stepPatch } : step
      );
      const overallProgress =
        steps.length > 0
          ? steps.reduce((sum, step) => sum + step.progress, 0) / steps.length
          : 0;

      this.update({ steps, overallProgress });
    },

    reset() {
      this.state = createBaseState();
      this.notify();
    },
  };
}

const BuildState = createBuildState();

if (typeof window !== "undefined") {
  window.BuildState = BuildState;
}

if (typeof module !== "undefined") {
  module.exports = {
    BuildState,
    createBuildState,
    createStepsFromPrompt,
  };
}
