"use client";

import { getSessionElapsedMs, type BuildSession } from "@/lib/build-history";

interface BuildSessionCardProps {
  session: BuildSession;
  expanded?: boolean;
  live?: boolean;
  onToggle?: () => void;
}

function formatDuration(elapsedMs: number): string {
  const totalSeconds = Math.max(Math.round(elapsedMs / 1000), 0);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${`${seconds}`.padStart(2, "0")}`;
}

function getStatusLabel(session: BuildSession, live: boolean): string {
  if (session.status === "failed") {
    return "Failed";
  }

  if (session.status === "complete") {
    return "Complete";
  }

  return live ? "Running" : "Built";
}

export default function BuildSessionCard({
  session,
  expanded = false,
  live = false,
  onToggle,
}: BuildSessionCardProps) {
  const overall = Math.round(session.overallProgress || 0);
  const duration = formatDuration(getSessionElapsedMs(session));
  const statusLabel = getStatusLabel(session, live);
  const canToggle = !live && typeof onToggle === "function";

  return (
    <article
      className={`build-row ${
        live ? "build-row--live" : "build-row--archived"
      } ${expanded ? "build-row--expanded" : "build-row--compact"}`}
    >
      {expanded ? (
        <>
          <div className="build-card__head">
            <div>
              <p className="nav-label">{live ? "Live Build" : "Build Summary"}</p>
              <p className="build-row__title">{session.title}</p>
            </div>
            <div className="build-row__meta">
              <span className={`build-badge build-badge--${session.status}`}>
                {statusLabel}
              </span>
              <span>{duration}</span>
            </div>
          </div>

          <div
            className="progress-bar mt-3"
            style={{ height: 10 }}
            aria-label="Overall build progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={overall}
          >
            <div className="progress-fill" style={{ width: `${overall}%` }} />
          </div>

          <p className="build-row__copy">{session.summary || "Build session"}</p>

          <div className="build-card__tasks">
            {session.tasks.map((task) => (
              <article key={task.id} className={`build-task build-task--${task.status}`}>
                <div className="build-task__row">
                  <p className="build-task__label">{task.label}</p>
                  <p className="build-task__percent">{Math.round(task.progress || 0)}%</p>
                </div>
                <div
                  className="progress-bar mt-2"
                  style={{ height: 6 }}
                  aria-label={task.label}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(task.progress || 0)}
                >
                  <div className="progress-fill" style={{ width: `${task.progress || 0}%` }} />
                </div>
                <p className="build-task__detail">{task.detail || "Waiting to start..."}</p>
              </article>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="build-row__summary">
            <p className="build-row__title">{session.title}</p>
            <div className="build-row__meta">
              <span className={`build-badge build-badge--${session.status}`}>
                {statusLabel}
              </span>
              <span>{duration}</span>
              <span>{overall}%</span>
            </div>
          </div>
          <p className="build-row__copy">{session.summary || "Build session"}</p>
        </>
      )}

      {canToggle ? (
        <button className="build-row__toggle" type="button" onClick={onToggle}>
          {expanded ? "Hide details" : "Show details"}
        </button>
      ) : null}
    </article>
  );
}
