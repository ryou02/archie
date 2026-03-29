"use client";

import { useCallback, useEffect, useRef } from "react";
import { getTTS } from "@/lib/api";

export function useVoiceOutput() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const speak = useCallback(
    async (text: string) => {
      if (!text.trim()) {
        return;
      }

      stop();

      const arrayBuffer = await getTTS(text);
      const blob = new Blob([arrayBuffer], { type: "audio/mpeg" });
      const objectUrl = URL.createObjectURL(blob);
      const audio = new Audio(objectUrl);

      objectUrlRef.current = objectUrl;
      audioRef.current = audio;

      audio.onended = () => {
        stop();
      };
      audio.onerror = () => {
        stop();
      };

      await audio.play();
    },
    [stop]
  );

  useEffect(() => stop, [stop]);

  return { speak, stop };
}
