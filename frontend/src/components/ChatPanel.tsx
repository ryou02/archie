"use client";

import { useState, useRef, useEffect, useSyncExternalStore } from "react";
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

  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

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

  return (
    <div className="chat-panel flex h-full flex-col">
      <div className="chat-panel__header shrink-0 px-5 py-3">
        <span className="nav-label">Chat</span>
      </div>

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
              {planStatus === "building" ? "Building..." : "Thinking..."}
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
