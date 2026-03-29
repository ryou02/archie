"use client";

import { useState, useEffect } from "react";
import { getStatus } from "@/lib/api";

export default function StatusDot() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const data = await getStatus();
        setConnected(data.pluginConnected);
      } catch {
        setConnected(false);
      }
    };
    check();
    const interval = setInterval(check, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <div
        className="w-2 h-2 rounded-full"
        style={{
          background: connected ? "var(--ambient-edge-bright)" : "var(--text-muted)",
          boxShadow: connected ? "0 0 8px rgba(238,246,255,0.28)" : "none",
        }}
      />
      <span className="nav-label">
        {connected ? "Studio Connected" : "Studio Offline"}
      </span>
    </div>
  );
}
