const defaultSteps = [
  {
    id: "plan",
    label: "Planning the build",
    progress: 0,
    status: "upcoming",
    detail: "",
  },
  {
    id: "scene",
    label: "Setting the world up",
    progress: 0,
    status: "upcoming",
    detail: "",
  },
  {
    id: "objects",
    label: "Adding cool objects",
    progress: 0,
    status: "upcoming",
    detail: "",
  },
  {
    id: "polish",
    label: "Finishing the details",
    progress: 0,
    status: "upcoming",
    detail: "",
  },
];

function cloneSteps() {
  return defaultSteps.map((step) => ({ ...step }));
}

const BuildState = {
  state: {
    avatarState: "idle",
    overallProgress: 0,
    activeStepId: defaultSteps[0].id,
    buildStatus: "Waiting for a build idea",
    steps: cloneSteps(),
  },
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

  updateStep(stepId, stepPatch) {
    const steps = this.state.steps.map((step) =>
      step.id === stepId ? { ...step, ...stepPatch } : step
    );
    const overallProgress =
      steps.reduce((sum, step) => sum + step.progress, 0) / steps.length;

    this.update({ steps, overallProgress });
  },

  reset() {
    this.state = {
      avatarState: "idle",
      overallProgress: 0,
      activeStepId: defaultSteps[0].id,
      buildStatus: "Waiting for a build idea",
      steps: cloneSteps(),
    };
    this.notify();
  },
};

window.BuildState = BuildState;
