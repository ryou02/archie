export interface BuildTask {
  id: string;
  label: string;
  status: string;
  progress: number;
  detail: string;
}

export interface BuildSession {
  id: string;
  title: string;
  status: "running" | "complete" | "failed";
  startedAt: number;
  endedAt: number | null;
  elapsedMs: number;
  summary: string;
  overallProgress: number;
  tasks: BuildTask[];
}

export interface TextHistoryItem {
  type: "text";
  role: "user" | "assistant";
  content: string;
}

export interface BuildSessionHistoryItem {
  type: "build-session";
  session: BuildSession;
  expanded: boolean;
}

export type ChatHistoryItem = TextHistoryItem | BuildSessionHistoryItem;

export function addArchivedBuildSession(
  history: ChatHistoryItem[],
  session: BuildSession
): ChatHistoryItem[] {
  if (
    history.some(
      (item) => item.type === "build-session" && item.session.id === session.id
    )
  ) {
    return history;
  }

  return [
    ...history,
    {
      type: "build-session",
      session,
      expanded: false,
    },
  ];
}

export function mergeArchivedBuildSessions(
  history: ChatHistoryItem[],
  sessions: BuildSession[]
): ChatHistoryItem[] {
  return sessions.reduce(
    (nextHistory, session) => addArchivedBuildSession(nextHistory, session),
    history
  );
}

export function toggleBuildSessionExpanded(
  history: ChatHistoryItem[],
  sessionId: string
): ChatHistoryItem[] {
  return history.map((item) => {
    if (item.type !== "build-session" || item.session.id !== sessionId) {
      return item;
    }

    return {
      ...item,
      expanded: !item.expanded,
    };
  });
}

export function getSessionElapsedMs(
  session: BuildSession,
  now = Date.now()
): number {
  if (session.endedAt) {
    return session.elapsedMs || Math.max(session.endedAt - session.startedAt, 0);
  }

  if (session.startedAt) {
    return Math.max(now - session.startedAt, 0);
  }

  return session.elapsedMs || 0;
}
