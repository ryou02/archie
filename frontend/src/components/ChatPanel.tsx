"use client";

import { useState, useRef, useEffect } from "react";
import BuildSessionCard from "@/components/BuildSessionCard";
import type { BuildSession, ChatHistoryItem } from "@/lib/build-history";

interface ChatPanelProps {
  history: ChatHistoryItem[];
  activeSession?: BuildSession | null;
  onSend: (text: string) => void;
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
  activeSession,
  onSend,
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
    if (disabled || !micSupported) {
      return;
    }
    onMicStart?.();
  };

  const handleMicStop = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    onMicStop?.();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="px-5 py-3 shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <span className="nav-label">Chat</span>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={updateStickiness}
        className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3"
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
              className={`max-w-[90%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                item.role === "user" ? "self-end" : "self-start"
              }`}
              style={{
                background:
                  item.role === "user"
                    ? "rgba(74,158,255,0.12)"
                    : "var(--surface)",
                border: `1px solid ${
                  item.role === "user"
                    ? "rgba(74,158,255,0.18)"
                    : "rgba(255,255,255,0.04)"
                }`,
                color: "var(--text-primary)",
                whiteSpace: "pre-wrap",
                fontFamily: "var(--font-body)",
              }}
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
            className="self-start flex items-center gap-2.5 px-4 py-3 rounded-2xl text-sm"
            style={{
              background: "var(--surface)",
              border: "1px solid rgba(255,255,255,0.04)",
              color: "var(--text-secondary)",
            }}
          >
            <div className="flex items-center gap-1">
              <div className="typing-dot" />
              <div className="typing-dot" />
              <div className="typing-dot" />
            </div>
            <span className="text-xs">
              {planStatus === "building" ? "Building..." : "Thinking..."}
            </span>
          </div>
        )}
      </div>

      {/* Input */}
      <div
        className="px-4 pb-4 pt-3 flex gap-2"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Tell Archie what to build..."
          disabled={disabled}
          className="flex-1 px-4 py-3 rounded-full text-sm outline-none"
          style={{
            background: "var(--surface2)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-primary)",
            fontFamily: "var(--font-body)",
          }}
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
          disabled={disabled || !micSupported}
          className={`btn-mic ${micState !== "idle" ? "btn-mic--active" : ""}`}
          onPointerDown={handleMicStart}
          onPointerUp={handleMicStop}
          onPointerLeave={handleMicStop}
          onPointerCancel={handleMicStop}
          aria-label="Hold to talk"
          title={
            micSupported
              ? micState === "recording"
                ? "Release to send"
                : "Hold to talk"
              : "Voice input unavailable"
          }
        >
          {micState === "recording" ? "Rec" : micState === "connecting" ? "..." : "Mic"}
        </button>
      </div>
    </div>
  );
}
