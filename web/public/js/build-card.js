const BuildCard = {
  init() {
    this.activeRoot = document.getElementById("active-build-slot");
  },

  renderActive(session) {
    if (!this.activeRoot) {
      return;
    }

    if (!session) {
      this.activeRoot.innerHTML = "";
      this.activeRoot.hidden = true;
      return;
    }

    this.activeRoot.hidden = false;
    this.activeRoot.innerHTML = this.renderSession(session, {
      compact: false,
      expanded: true,
      live: true,
    });
  },

  renderArchived(session, expanded) {
    return this.renderSession(session, {
      compact: !expanded,
      expanded,
      live: false,
    });
  },

  renderSession(session, options) {
    const {
      compact = false,
      expanded = true,
      live = false,
    } = options || {};
    const overall = Math.round(session.overallProgress || 0);
    const statusLabel = this.statusLabel(session.status, live);
    const duration = this.formatDuration(getSessionElapsedMs(session));
    const body = compact
      ? `
        <div class="build-row__summary">
          <p class="build-row__title">${session.title}</p>
          <div class="build-row__meta">
            <span class="build-badge build-badge--${session.status}">${statusLabel}</span>
            <span>${duration}</span>
            <span>${overall}%</span>
          </div>
        </div>
        <p class="build-row__copy">${session.summary || "Build session"}</p>
      `
      : `
        <div class="build-card__head">
          <div>
            <p class="eyebrow">${live ? "Live Build" : "Build Summary"}</p>
            <p class="build-card__title">${session.title}</p>
          </div>
          <div class="build-card__meta">
            <span class="build-badge build-badge--${session.status}">${statusLabel}</span>
            <span>${duration}</span>
          </div>
        </div>
        <div class="overall-progress" aria-label="Overall build progress" role="progressbar"
          aria-valuemin="0" aria-valuemax="100" aria-valuenow="${overall}">
          <div class="overall-progress-bar" style="width:${overall}%"></div>
        </div>
        <p class="progress-copy">${session.summary || "Build session"}</p>
        <div class="build-card__tasks">
          ${session.tasks.map((task) => this.renderTask(task)).join("")}
        </div>
      `;

    const toggle = live
      ? ""
      : `
        <button class="build-row__toggle" type="button" data-session-toggle="${session.id}">
          ${expanded ? "Hide details" : "Show details"}
        </button>
      `;

    return `
      <article class="build-row ${live ? "build-row--live" : "build-row--archived"} ${compact ? "build-row--compact" : "build-row--expanded"}">
        ${body}
        ${toggle}
      </article>
    `;
  },

  renderTask(task) {
    return `
      <article class="build-task build-task--${task.status}">
        <div class="build-task__row">
          <p class="build-task__label">${task.label}</p>
          <p class="build-task__percent">${Math.round(task.progress || 0)}%</p>
        </div>
        <div class="task-step__bar" role="progressbar" aria-label="${task.label}"
          aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(task.progress || 0)}">
          <div class="task-step__fill" style="width:${task.progress || 0}%"></div>
        </div>
        <p class="build-task__detail">${task.detail || "&nbsp;"}</p>
      </article>
    `;
  },

  statusLabel(status, live) {
    if (status === "failed") {
      return "Failed";
    }
    if (status === "complete") {
      return "Complete";
    }
    return live ? "Running" : "Built";
  },

  formatDuration(elapsedMs) {
    const totalSeconds = Math.max(Math.round(elapsedMs / 1000), 0);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${`${seconds}`.padStart(2, "0")}`;
  },
};

function getSessionElapsedMs(session, now = Date.now()) {
  if (!session) {
    return 0;
  }

  if (session.endedAt) {
    return session.elapsedMs || Math.max(session.endedAt - session.startedAt, 0);
  }

  if (session.startedAt) {
    return Math.max(now - session.startedAt, 0);
  }

  return session.elapsedMs || 0;
}

if (typeof window !== "undefined") {
  window.BuildCard = BuildCard;
}

if (typeof module !== "undefined") {
  module.exports = {
    BuildCard,
    getSessionElapsedMs,
  };
}
