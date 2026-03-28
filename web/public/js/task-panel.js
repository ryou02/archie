const TaskPanel = {
  init() {
    this.root = document.getElementById("task-panel");
    this.progressRoot = document.getElementById("progress-card");
    window.BuildState.subscribe((state) => this.render(state));
  },

  render(state) {
    this.progressRoot.innerHTML = `
      <p class="eyebrow">Progress</p>
      <div class="overall-progress" aria-label="Overall build progress" role="progressbar"
        aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(state.overallProgress)}">
        <div class="overall-progress-bar" style="width:${state.overallProgress}%"></div>
      </div>
      <p class="progress-copy">${state.buildStatus}</p>
    `;

    this.root.innerHTML = state.steps
      .map((step) => {
        const activeClass = state.activeStepId === step.id ? " task-step--active" : "";
        return `
          <article class="task-step task-step--${step.status}${activeClass}">
            <div class="task-step__row">
              <p class="task-step__label">${step.label}</p>
              <p class="task-step__percent">${Math.round(step.progress)}%</p>
            </div>
            <div class="task-step__bar" role="progressbar" aria-label="${step.label}"
              aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(step.progress)}">
              <div class="task-step__fill" style="width:${step.progress}%"></div>
            </div>
            <p class="task-step__detail">${step.detail || "&nbsp;"}</p>
          </article>
        `;
      })
      .join("");

    const avatarStatus = document.getElementById("avatar-status");
    const buildStatus = document.getElementById("build-status");

    if (avatarStatus) {
      avatarStatus.textContent = this.avatarCopy(state.avatarState);
    }

    if (buildStatus) {
      buildStatus.textContent = state.buildStatus;
    }
  },

  avatarCopy(avatarState) {
    switch (avatarState) {
      case "listening":
        return "Listening";
      case "thinking":
        return "Thinking about the build";
      case "speaking":
        return "Talking you through it";
      default:
        return "Ready to build";
    }
  },
};

window.TaskPanel = TaskPanel;
