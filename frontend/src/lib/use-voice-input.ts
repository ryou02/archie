"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getDeepgramKey } from "@/lib/api";

export type VoiceInputState = "idle" | "connecting" | "recording";

interface UseVoiceInputOptions {
  onTranscript: (text: string) => void;
  onError?: (error: unknown) => void;
}

interface VoiceInputCloseEventLike {
  code?: number;
  reason?: string;
}

interface BrowserSpeechRecognitionResultLike {
  transcript?: string;
}

interface BrowserSpeechRecognitionResultListLike {
  [index: number]: BrowserSpeechRecognitionResultLike;
  length: number;
}

interface BrowserSpeechRecognitionEventLike {
  resultIndex?: number;
  results?: {
    [index: number]: BrowserSpeechRecognitionResultListLike;
    length: number;
  };
}

interface BrowserSpeechRecognitionErrorLike {
  error?: string;
  message?: string;
}

interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: BrowserSpeechRecognitionEventLike) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface BrowserWindowWithSpeechRecognition extends Window {
  SpeechRecognition?: new () => BrowserSpeechRecognition;
  webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
}

function createVoiceInputError(
  error?: unknown,
  closeEvent?: VoiceInputCloseEventLike
): Error {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === "string" && error.trim()) {
    return new Error(error);
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "error" in error &&
    typeof error.error === "string" &&
    error.error.trim()
  ) {
    return new Error(`Voice input failed: ${error.error.trim()}`);
  }

  if (typeof closeEvent?.code === "number") {
    const reason =
      typeof closeEvent.reason === "string" && closeEvent.reason.trim()
        ? `: ${closeEvent.reason.trim()}`
        : ".";
    return new Error(
      `Voice input connection closed (code ${closeEvent.code})${reason}`
    );
  }

  return new Error("Voice input connection failed before transcription could start.");
}

export function useVoiceInput({ onTranscript, onError }: UseVoiceInputOptions) {
  const [state, setState] = useState<VoiceInputState>("idle");
  const socketRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const apiKeyRef = useRef<string>("");
  const pendingSocketErrorRef = useRef(false);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);

  const speechRecognitionCtor = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const browserWindow = window as BrowserWindowWithSpeechRecognition;
    return browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition || null;
  }, []);

  const supported = useMemo(
    () =>
      Boolean(speechRecognitionCtor) ||
      (typeof window !== "undefined" &&
        typeof navigator !== "undefined" &&
        typeof navigator.mediaDevices?.getUserMedia === "function" &&
        typeof MediaRecorder !== "undefined" &&
        typeof WebSocket !== "undefined"),
    [speechRecognitionCtor]
  );

  const stopRecording = useCallback(() => {
    pendingSocketErrorRef.current = false;

    if (recognitionRef.current) {
      const recognition = recognitionRef.current;
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.stop();
      recognitionRef.current = null;
    }

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
      if (speechRecognitionCtor) {
        const recognition = new speechRecognitionCtor();
        recognitionRef.current = recognition;
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onstart = () => {
          setState("recording");
        };

        recognition.onresult = (event) => {
          const resultIndex = event.resultIndex ?? 0;
          const transcript =
            event.results?.[resultIndex]?.[0]?.transcript?.trim() ||
            event.results?.[0]?.[0]?.transcript?.trim();

          if (transcript) {
            onTranscript(transcript);
          }
        };

        recognition.onerror = (event) => {
          onError?.(createVoiceInputError(event));
        };

        recognition.onend = () => {
          recognitionRef.current = null;
          setState("idle");
        };

        recognition.start();
        return;
      }

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

      pendingSocketErrorRef.current = false;
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

      socket.onerror = () => {
        pendingSocketErrorRef.current = true;
      };

      socket.onclose = (event) => {
        const shouldReportError =
          pendingSocketErrorRef.current || event.code !== 1000;
        pendingSocketErrorRef.current = false;
        recorderRef.current = null;
        socketRef.current = null;
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setState("idle");

        if (shouldReportError) {
          onError?.(createVoiceInputError(undefined, event));
        }
      };
    } catch (error) {
      onError?.(createVoiceInputError(error));
      stopRecording();
    }
  }, [onError, onTranscript, speechRecognitionCtor, state, stopRecording, supported]);

  useEffect(() => stopRecording, [stopRecording]);

  return {
    supported,
    state,
    startRecording,
    stopRecording,
  };
}
