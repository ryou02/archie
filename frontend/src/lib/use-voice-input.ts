"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getDeepgramKey } from "@/lib/api";

export type VoiceInputState = "idle" | "connecting" | "recording";

interface UseVoiceInputOptions {
  onTranscript: (text: string) => void;
  onError?: (error: unknown) => void;
}

export function useVoiceInput({ onTranscript, onError }: UseVoiceInputOptions) {
  const [state, setState] = useState<VoiceInputState>("idle");
  const socketRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const apiKeyRef = useRef<string>("");

  const supported = useMemo(
    () =>
      typeof window !== "undefined" &&
      typeof navigator !== "undefined" &&
      typeof navigator.mediaDevices?.getUserMedia === "function" &&
      typeof MediaRecorder !== "undefined" &&
      typeof WebSocket !== "undefined",
    []
  );

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    recorderRef.current = null;

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    setState("idle");
  }, []);

  const startRecording = useCallback(async () => {
    if (!supported || state !== "idle") {
      return;
    }

    setState("connecting");

    try {
      if (!apiKeyRef.current) {
        apiKeyRef.current = await getDeepgramKey();
      }

      if (!apiKeyRef.current) {
        throw new Error("Deepgram API key is unavailable.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const socket = new WebSocket(
        "wss://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&endpointing=300",
        ["token", apiKeyRef.current]
      );

      socketRef.current = socket;

      socket.onopen = () => {
        const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
        recorderRef.current = recorder;
        recorder.ondataavailable = (event) => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(event.data);
          }
        };
        recorder.start(250);
        setState("recording");
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data) as {
          channel?: { alternatives?: Array<{ transcript?: string }> };
          is_final?: boolean;
        };
        const transcript = data.channel?.alternatives?.[0]?.transcript?.trim();
        if (transcript && data.is_final) {
          onTranscript(transcript);
        }
      };

      socket.onerror = (event) => {
        onError?.(event);
        stopRecording();
      };

      socket.onclose = () => {
        recorderRef.current = null;
        socketRef.current = null;
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setState("idle");
      };
    } catch (error) {
      onError?.(error);
      stopRecording();
    }
  }, [onError, onTranscript, state, stopRecording, supported]);

  useEffect(() => stopRecording, [stopRecording]);

  return {
    supported,
    state,
    startRecording,
    stopRecording,
  };
}
