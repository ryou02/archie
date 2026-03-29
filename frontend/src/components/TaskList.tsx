"use client";

import type { TaskStep } from "@/lib/api";

interface TaskListProps {
  tasks: TaskStep[];
  onSelect?: (task: TaskStep) => void;
  selectedId?: string | null;
}

export default function TaskList({ tasks, onSelect, selectedId }: TaskListProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {tasks.map((task) => {
        const isSelected = selectedId === task.id;
        const isDone = task.status === "done";
        const isActive = task.status === "active";

        return (
          <button
            key={task.id}
            onClick={() => onSelect?.(task)}
            className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left cursor-pointer"
            style={{
              background: isSelected
                ? "rgba(244,248,255,0.10)"
                : "rgba(255,255,255,0.04)",
              border: `1px solid ${
                isSelected ? "rgba(238,246,255,0.18)" : "transparent"
              }`,
              transition: "background var(--t-fast), border-color var(--t-fast)",
            }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  background: isDone
                    ? "var(--ambient-edge-bright)"
                    : isActive
                    ? "rgba(184,226,255,0.92)"
                    : "var(--surface3)",
                  boxShadow: isDone
                    ? "0 0 6px rgba(238,246,255,0.25)"
                    : isActive
                    ? "0 0 6px rgba(184,226,255,0.22)"
                    : "none",
                }}
              />
              <span
                className="text-xs font-medium truncate"
                style={{
                  fontFamily: "var(--font-body)",
                  color: isDone ? "var(--text-muted)" : "var(--text-primary)",
                }}
              >
                {task.label}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="progress-bar w-12" style={{ height: 4 }}>
                <div
                  className="progress-fill"
                  style={{
                    width: `${task.progress}%`,
                    background: isDone
                      ? "var(--aurora-green)"
                      : "linear-gradient(90deg, var(--aurora-green), var(--aurora-teal))",
                  }}
                />
              </div>
              <span
                className="text-[10px] font-mono font-bold w-7 text-right"
                style={{
                  color: isDone
                    ? "var(--ambient-edge-bright)"
                    : isActive
                    ? "rgba(184,226,255,0.92)"
                    : "var(--text-muted)",
                }}
              >
                {task.progress}%
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
