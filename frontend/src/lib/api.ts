import type { BuildSession } from "@/lib/build-history";

const API_BASE = "";

export interface PlanSnapshot {
  speech?: string;
  plan?: Plan | null;
  taskPlan?: TaskStep[];
  activeBuildSession?: BuildSession | null;
  archivedBuildSessions?: BuildSession[];
}

export interface TTSVisemeCue {
  time: number;
  id: number;
}

export interface TTSResponse {
  audio: string;
  visemes: TTSVisemeCue[];
}

export async function startSession(): Promise<PlanSnapshot> {
  const res = await fetch(`${API_BASE}/start`, { method: "POST" });
  return res.json();
}

export async function sendMessage(
  message: string,
  signal?: AbortSignal
): Promise<PlanSnapshot> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
    signal,
  });
  return res.json();
}

export async function getPlan(): Promise<PlanSnapshot> {
  const res = await fetch(`${API_BASE}/plan`);
  return res.json();
}

export async function getStatus(): Promise<{ status: string; pluginConnected: boolean }> {
  const res = await fetch(`${API_BASE}/status`);
  return res.json();
}

export async function getTTS(text: string): Promise<TTSResponse> {
  const res = await fetch(`${API_BASE}/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    throw new Error(`TTS request failed with status ${res.status}`);
  }

  return res.json();
}

export async function getDeepgramKey(): Promise<string> {
  const res = await fetch(`${API_BASE}/deepgram-key`);
  const data = (await res.json()) as { key?: string };
  return data.key || "";
}

export interface Plan {
  name: string;
  world: string;
  objects: string;
  characters?: string;
  animations?: string;
  gameplay: string;
  audio: string;
  status: "waiting_approval" | "building" | "complete" | "failed";
}

export interface TaskStep {
  id: string;
  label: string;
  status: "pending" | "upcoming" | "active" | "done";
  progress: number;
  detail: string;
}
