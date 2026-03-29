"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import AmbientBackground from "@/components/AmbientBackground";
import ChatPanel from "@/components/ChatPanel";
import ProgressBar from "@/components/ProgressBar";
import StatusDot from "@/components/StatusDot";
import TaskList from "@/components/TaskList";
import {
  mergeArchivedBuildSessions,
  toggleBuildSessionExpanded,
  type BuildSession,
  type ChatHistoryItem,
} from "@/lib/build-history";
import {
  getPlan,
  sendMessage,
  startSession,
  type Plan,
  type PlanSnapshot,
  type TaskStep,
} from "@/lib/api";
import { useVoiceInput } from "@/lib/use-voice-input";
import { useVoiceOutput } from "@/lib/use-voice-output";

function getActiveTaskId(tasks: TaskStep[]): string | null {
  const active = tasks.find((task) => task.status === "active");
  if (active) {
    return active.id;
  }

  const pending = tasks.find((task) => task.status !== "done");
  return pending ? pending.id : tasks[0]?.id || null;
}

function appendAssistantMessage(history: ChatHistoryItem[], content: string) {
  return [...history, { type: "text", role: "assistant", content } satisfies ChatHistoryItem];
}

function appendUserMessage(history: ChatHistoryItem[], content: string) {
  return [...history, { type: "text", role: "user", content } satisfies ChatHistoryItem];
}

export default function BuildPage() {
  const [history, setHistory] = useState<ChatHistoryItem[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [tasks, setTasks] = useState<TaskStep[]>([]);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeSession, setActiveSession] = useState<BuildSession | null>(null);
  const startedRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { speak } = useVoiceOutput();

  const syncTasks = useCallback((nextTasks: TaskStep[] | undefined) => {
    const safeTasks = nextTasks || [];
    setTasks(safeTasks);
    setSelectedTask((current) => {
      if (!safeTasks.length) {
        return null;
      }

      if (current && safeTasks.some((task) => task.id === current)) {
        return current;
      }

      return getActiveTaskId(safeTasks);
    });
  }, []);

  const applySnapshot = useCallback(
    (snapshot: PlanSnapshot) => {
      setPlan(snapshot.plan ?? null);
      syncTasks(snapshot.taskPlan);
      setActiveSession(snapshot.activeBuildSession ?? null);
      setHistory((currentHistory) =>
        mergeArchivedBuildSessions(
          currentHistory,
          snapshot.archivedBuildSessions ?? []
        )
      );
    },
    [syncTasks]
  );

  const stopPlanPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const pollPlan = useCallback(async () => {
    try {
      const snapshot = await getPlan();
      applySnapshot(snapshot);
    } catch (error) {
      console.error("Plan polling error:", error);
    }
  }, [applySnapshot]);

  const startPlanPolling = useCallback(() => {
    stopPlanPolling();
    void pollPlan();
    pollTimerRef.current = setInterval(() => {
      void pollPlan();
    }, 600);
  }, [pollPlan, stopPlanPolling]);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }

    startedRef.current = true;
    setLoading(true);

    startSession()
      .then((data) => {
        applySnapshot(data);
        if (data.speech) {
          setHistory((currentHistory) =>
            appendAssistantMessage(currentHistory, data.speech as string)
          );
          void speak(data.speech).catch((error) => {
            console.error("TTS playback error:", error);
          });
        }
      })
      .catch((error) => {
        console.error(error);
      })
      .finally(() => setLoading(false));
  }, [applySnapshot, speak]);

  useEffect(() => stopPlanPolling, [stopPlanPolling]);

  const handleSend = useCallback(
    async (text: string) => {
      setHistory((currentHistory) => appendUserMessage(currentHistory, text));
      setLoading(true);
      startPlanPolling();

      try {
        const data = await sendMessage(text);
        stopPlanPolling();
        applySnapshot(data);

        if (data.speech) {
          setHistory((currentHistory) =>
            appendAssistantMessage(currentHistory, data.speech as string)
          );
          void speak(data.speech).catch((error) => {
            console.error("TTS playback error:", error);
          });
        }
      } catch (error) {
        console.error(error);
        setHistory((currentHistory) =>
          appendAssistantMessage(currentHistory, "Oops, something went wrong!")
        );

        try {
          const snapshot = await getPlan();
          applySnapshot(snapshot);
        } catch (planError) {
          console.error("Plan refresh error:", planError);
        }
      } finally {
        stopPlanPolling();
        setLoading(false);
      }
    },
    [applySnapshot, speak, startPlanPolling, stopPlanPolling]
  );

  const {
    supported: micSupported,
    state: micState,
    startRecording,
    stopRecording,
  } = useVoiceInput({
    onTranscript: (text) => {
      if (text.trim()) {
        void handleSend(text.trim());
      }
    },
    onError: (error) => {
      console.error("Voice input error:", error);
    },
  });

  const overallProgress = tasks.length
    ? Math.round(tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length)
    : 0;

  return (
    <div className="relative h-screen overflow-hidden">
      <AmbientBackground surface="build" />

      <header
        className="workspace-header glass-shell glass-shell--quiet absolute top-3 z-20 flex items-center justify-between px-4 py-3 sm:px-6"
      >
        <div className="flex items-center gap-3">
          <div className="workspace-mark">
            <Image
              src="/logo-mark.png"
              alt="Archie mark"
              className="workspace-mark__image"
              width={250}
              height={250}
              priority
            />
          </div>
        </div>

        {tasks.length > 0 ? (
          <div className="flex-1 min-w-0 max-w-xs mx-4 sm:mx-8">
            <div className="flex items-center gap-3">
              <ProgressBar percent={overallProgress} />
              <span
                className="text-xs font-mono font-bold shrink-0"
                style={{ color: "var(--ambient-edge-bright)" }}
              >
                {overallProgress}%
              </span>
            </div>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        <StatusDot />
      </header>

      {tasks.length > 0 && (
        <div
          className="workspace-panel glass-shell glass-shell--panel absolute left-4 top-18 z-20 hidden w-64 overflow-y-auto p-4 lg:block"
          style={{ maxHeight: "50vh" }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="nav-label">Build Progress</span>
            <span
              className="text-[10px] font-mono font-bold px-2 py-0.5"
              style={{
                background:
                  plan?.status === "complete"
                    ? "rgba(61,245,167,0.12)"
                    : plan?.status === "building"
                      ? "rgba(74,158,255,0.12)"
                      : "rgba(255,255,255,0.06)",
                color:
                  plan?.status === "complete"
                    ? "var(--aurora-green)"
                    : plan?.status === "building"
                      ? "var(--aurora-blue)"
                      : "var(--text-muted)",
                border: `1px solid ${
                  plan?.status === "complete"
                    ? "rgba(61,245,167,0.15)"
                    : plan?.status === "building"
                      ? "rgba(74,158,255,0.15)"
                      : "transparent"
                }`,
              }}
            >
              {plan?.status === "complete"
                ? "DONE"
                : plan?.status === "building"
                  ? "BUILDING"
                  : plan?.status === "waiting_approval"
                    ? "PLANNING"
                    : "IDLE"}
            </span>
          </div>

          <TaskList
            tasks={tasks}
            selectedId={selectedTask}
            onSelect={(task) =>
              setSelectedTask(task.id === selectedTask ? null : task.id)
            }
          />

          {selectedTask
            ? (() => {
                const task = tasks.find((item) => item.id === selectedTask);
                if (!task) {
                  return null;
                }

                return (
                  <div
                    className="mt-3 p-3"
                    style={{
                      background: "var(--surface)",
                      borderTop: "1px solid var(--panel-divider)",
                    }}
                  >
                    <h4
                      className="font-bold text-xs mb-1"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {task.label}
                    </h4>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {task.detail || "Waiting to start..."}
                    </p>
                  </div>
                );
              })()
            : null}
        </div>
      )}

      {plan && plan.status === "waiting_approval" && (
        <div className="workspace-summary glass-shell glass-shell--panel absolute bottom-6 left-4 z-20 hidden max-w-md p-5 xl:block">
          <h3
            className="font-bold text-base mb-3"
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
              { label: "Gameplay", value: plan.gameplay, color: "var(--aurora-purple)" },
              { label: "Audio", value: plan.audio, color: "var(--aurora-blue)" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex gap-2 py-1"
                style={{ borderBottom: "1px solid var(--panel-divider)" }}
              >
                <span
                  className="font-semibold shrink-0 w-20"
                  style={{ color: item.color }}
                >
                  {item.label}
                </span>
                <span>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="workspace-chat glass-shell glass-shell--chat z-20 flex flex-col">
        <ChatPanel
          history={history}
          activeSession={activeSession}
          onSend={handleSend}
          onToggleSession={(sessionId) =>
            setHistory((currentHistory) =>
              toggleBuildSessionExpanded(currentHistory, sessionId)
            )
          }
          disabled={loading}
          planStatus={plan?.status}
          micSupported={micSupported}
          micState={micState}
          onMicStart={() => {
            void startRecording();
          }}
          onMicStop={stopRecording}
        />
      </div>
    </div>
  );
}
