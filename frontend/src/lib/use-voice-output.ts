"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getTTS, type TTSVisemeCue } from "@/lib/api";

function createAudioObjectUrl(audioBase64: string): string {
  const binary = window.atob(audioBase64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const blob = new Blob([bytes], { type: "audio/mpeg" });
  return URL.createObjectURL(blob);
}

export function useVoiceOutput() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [visemes, setVisemes] = useState<TTSVisemeCue[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    setIsPlaying(false);
    setVisemes([]);
  }, []);

  const speak = useCallback(
    async (text: string) => {
      if (!text.trim()) {
        return;
      }

      stop();

      const { audio, visemes } = await getTTS(text);
      const objectUrl = createAudioObjectUrl(audio);
      const audioElement = new Audio(objectUrl);

      setVisemes(visemes);
      objectUrlRef.current = objectUrl;
      audioRef.current = audioElement;

      audioElement.onended = () => {
        stop();
      };
      audioElement.onerror = () => {
        stop();
      };

      await audioElement.play();
      setIsPlaying(true);
    },
    [stop]
  );

  useEffect(() => stop, [stop]);

  return { speak, stop, visemes, isPlaying, audioRef };
}
