export interface PrivateMessage {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: string;
  readAt?: string;
  requestId: string;
}

export interface MemoryRun {
  id: string;
  deck: number[];
  open: number[];
  matched: number[];
  flips: number;
  startedAt: number | null;
  finishedAt: number | null;
  hideAt: number | null;
}

export interface MemoryScore {
  memberId: string;
  flips: number;
  durationMs: number;
  completedAt: string;
}

export interface MemoryBests {
  byFlips: MemoryScore;
  byTime: MemoryScore;
}

export interface MemoryView {
  run: (Omit<MemoryRun, "deck"> & { cards: { pair: number | null }[] }) | null;
  leaderboards: { byFlips: MemoryScore[]; byTime: MemoryScore[] };
  serverTime: number;
}

export function compareFlips(a: MemoryScore, b: MemoryScore) {
  return (
    a.flips - b.flips ||
    a.durationMs - b.durationMs ||
    a.completedAt.localeCompare(b.completedAt)
  );
}

export function compareTime(a: MemoryScore, b: MemoryScore) {
  return (
    a.durationMs - b.durationMs ||
    a.flips - b.flips ||
    a.completedAt.localeCompare(b.completedAt)
  );
}

export function formatDuration(ms: number) {
  const seconds = Math.floor(Math.max(0, ms) / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
