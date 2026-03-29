"use client";

import { useState, useRef, useEffect, useSyncExternalStore } from "react";
import BuildSessionCard from "@/components/BuildSessionCard";
import ProgressBar from "@/components/ProgressBar";
import TaskList from "@/components/TaskList";
import type { BuildSession, ChatHistoryItem } from "@/lib/build-history";
import type { Plan, TaskStep } from "@/lib/api";

interface ChatPanelProps {
  history: ChatHistoryItem[];
  tasks: TaskStep[];
  overallProgress: number;
  selectedTaskId?: string | null;
  plan?: Plan | null;
  activeSession?: BuildSession | null;
  onSend: (text: string) => void;
  onSelectTask?: (task: TaskStep) => void;
  onToggleSession?: (sessionId: string) => void;
  disabled?: boolean;
  planStatus?: string | null;
  micSupported?: boolean;
  micState?: "idle" | "connecting" | "recording";
  onMicStart?: () => void;
  onMicStop?: () => void;
}

export default function ChatPanel({
  history,
  tasks,
  overallProgress,
  selectedTaskId,
  plan,
  activeSession,
  onSend,
  onSelectTask,
  onToggleSession,
  disabled,
  planStatus,
  micSupported = false,
  micState = "idle",
  onMicStart,
  onMicStop,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldStickRef = useRef(true);

  useEffect(() => {
    if (scrollRef.current && shouldStickRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeSession, disabled, history]);

  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const currentPlanStatus = plan?.status ?? planStatus ?? null;
  const selectedTask = selectedTaskId
    ? tasks.find((task) => task.id === selectedTaskId) ?? null
    : null;
  const showApprovalSummary = plan?.status === "waiting_approval";
  const showMeta = tasks.length > 0 || showApprovalSummary;

  const effectiveMicSupported = hydrated && micSupported;

  const updateStickiness = () => {
    if (!scrollRef.current) {
      return;
    }

    const distanceFromBottom =
      scrollRef.current.scrollHeight -
      scrollRef.current.clientHeight -
      scrollRef.current.scrollTop;
    shouldStickRef.current = distanceFromBottom <= 96;
  };

  const handleSubmit = () => {
    const text = input.trim();
    if (!text || disabled) return;
    setInput("");
    onSend(text);
  };

  const handleMicStart = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (disabled || !effectiveMicSupported) {
      return;
    }
    onMicStart?.();
  };

  const handleMicStop = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    onMicStop?.();
  };

  const statusChipStyles = {
    background:
      currentPlanStatus === "complete"
        ? "rgba(61,245,167,0.12)"
        : currentPlanStatus === "building"
          ? "rgba(74,158,255,0.12)"
          : "rgba(255,255,255,0.06)",
    color:
      currentPlanStatus === "complete"
        ? "var(--aurora-green)"
        : currentPlanStatus === "building"
          ? "var(--aurora-blue)"
          : currentPlanStatus === "waiting_approval"
            ? "var(--aurora-teal)"
            : "var(--text-muted)",
    border: `1px solid ${
      currentPlanStatus === "complete"
        ? "rgba(61,245,167,0.15)"
        : currentPlanStatus === "building"
          ? "rgba(74,158,255,0.15)"
          : currentPlanStatus === "waiting_approval"
            ? "rgba(184,226,255,0.15)"
            : "transparent"
    }`,
  } as const;

  return (
    <div className="chat-panel flex h-full flex-col">
      <div className="chat-panel__header shrink-0 px-5 py-3">
        <span className="nav-label">Chat</span>
      </div>

      {showMeta ? (
        <div className="chat-panel__meta shrink-0 px-4 py-4">
          {tasks.length > 0 ? (
            <div className="chat-panel__section">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="nav-label">Build Progress</span>
                <span
                  className="text-[10px] font-mono font-bold px-2 py-0.5"
                  style={statusChipStyles}
                >
                  {currentPlanStatus === "complete"
                    ? "DONE"
                    : currentPlanStatus === "building"
                      ? "BUILDING"
                      : currentPlanStatus === "waiting_approval"
                        ? "PLANNING"
                        : "IDLE"}
                </span>
              </div>

              <div className="mb-3 flex items-center gap-3">
                <ProgressBar percent={overallProgress} />
                <span
                  className="shrink-0 text-xs font-mono font-bold"
                  style={{ color: "var(--ambient-edge-bright)" }}
                >
                  {overallProgress}%
                </span>
              </div>

              <TaskList
                tasks={tasks}
                selectedId={selectedTaskId}
                onSelect={onSelectTask}
              />

              {selectedTask ? (
                <div className="chat-panel__task-detail mt-3 p-3">
                  <h4
                    className="mb-1 text-xs font-bold"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {selectedTask.label}
                  </h4>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {selectedTask.detail || "Waiting to start..."}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {showApprovalSummary && plan ? (
            <div className="chat-panel__section">
              <h3
                className="mb-3 text-base font-bold"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--text-primary)",
                }}
              >
                {plan.name}
              </h3>
              <div
                className="flex flex-col gap-2 text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                {[
                  { label: "World", value: plan.world, color: "var(--aurora-green)" },
                  { label: "Objects", value: plan.objects, color: "var(--aurora-teal)" },
                  ...(plan.characters
                    ? [
                        {
                          label: "Characters",
                          value: plan.characters,
                          color: "var(--aurora-blue)",
                        },
                      ]
                    : []),
                  {
                    label: "Gameplay",
                    value: plan.gameplay,
                    color: "var(--aurora-purple)",
                  },
                  { label: "Audio", value: plan.audio, color: "var(--aurora-blue)" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex gap-2 py-1"
                    style={{ borderBottom: "1px solid var(--panel-divider)" }}
                  >
                    <span
                      className="w-20 shrink-0 font-semibold"
                      style={{ color: item.color }}
                    >
                      {item.label}
                    </span>
                    <span>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        ref={scrollRef}
        onScroll={updateStickiness}
        className="chat-panel__messages flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
        style={{ overscrollBehavior: "contain" }}
      >
        {history.map((item, index) =>
          item.type === "build-session" ? (
            <BuildSessionCard
              key={item.session.id}
              session={item.session}
              expanded={item.expanded}
              onToggle={() => onToggleSession?.(item.session.id)}
            />
          ) : (
            <div
              key={`${item.role}-${index}`}
              className={`chat-bubble max-w-[90%] px-4 py-3 text-sm leading-relaxed ${
                item.role === "user"
                  ? "chat-bubble--user self-end"
                  : "chat-bubble--assistant self-start"
              }`}
            >
              {item.content}
            </div>
          )
        )}

        {activeSession ? (
          <BuildSessionCard session={activeSession} expanded live />
        ) : null}

        {disabled && (
          <div
            className="chat-bubble chat-bubble--status self-start flex items-center gap-2.5 px-4 py-3 text-sm"
          >
            <div className="flex items-center gap-1">
              <div className="typing-dot" />
              <div className="typing-dot" />
              <div className="typing-dot" />
            </div>
            <span className="text-xs">
              {currentPlanStatus === "building" ? "Building..." : "Thinking..."}
            </span>
          </div>
        )}
      </div>

      <div className="chat-panel__composer flex gap-2 px-4 pb-4 pt-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Tell Archie what to build..."
          disabled={disabled}
          className="chat-input flex-1 rounded-full px-4 py-3 text-sm outline-none"
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !input.trim()}
          className="btn-send"
        >
          Send
        </button>
        <button
          type="button"
          disabled={disabled || !effectiveMicSupported}
          className={`btn-mic ${micState !== "idle" ? "btn-mic--active" : ""}`}
          onPointerDown={handleMicStart}
          onPointerUp={handleMicStop}
          onPointerLeave={handleMicStop}
          onPointerCancel={handleMicStop}
          aria-label="Hold to talk"
          title={
            effectiveMicSupported
              ? micState === "recording"
                ? "Release to send"
                : "Hold to talk"
              : "Voice input unavailable"
          }
        >
          {effectiveMicSupported
            ? micState === "recording"
              ? "Rec"
              : micState === "connecting"
                ? "..."
                : "Mic"
            : "Mic"}
        </button>
      </div>
    </div>
  );
}
