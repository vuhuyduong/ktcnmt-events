import fs from "fs";
import { randomInt, randomUUID } from "crypto";
import path from "path";
import type { PrivateMessage, MemoryRun, MemoryBests } from "@/lib/social";
import {
  BLIND_BOX_REWARDS,
  FEMALE_MEMBERS,
  MALE_MEMBERS,
  MaleTransportOptionId,
  STAFF_MEMBERS,
} from "@/data/roster";

export interface MemberRsvp {
  memberId: string;
  attending: boolean;
  attendanceStatus?: "attending" | "declined" | "maybe";
  dietaryNote?: string;
  source?: "member-session";
  joinSharedRide1715?: boolean;
  hasPlusOne?: boolean;
  gameCompanion?: boolean;
  plusOneName?: string;
  transportOption?: MaleTransportOptionId;
  updatedAt: string;
}

export interface MilkTeaOrder {
  memberId: string;
  drinkName: string;
  sugar: string;
  ice: string;
  note: string;
  updatedAt: string;
}

export interface WishItem {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  likes: number;
  createdAt: string;
  requestId?: string;
  likedBy?: string[];
  legacyLikes?: number;
}

export type GamePhase =
  | "WAITING"
  | "SELECTING_BOX"
  | "SHAKING"
  | "REVEALED"
  | "SPINNING_MALE"
  | "MALE_SELECTED"
  | "COMPLETED";

export interface BlindBoxSlot {
  boxNumber: number;
  rewardId: string;
  isOpened: boolean;
  openedByQueenId: string | null;
  openedByQueenName: string | null;
  assignedMaleId: string | null;
  assignedMaleName: string | null;
  openedAt: number | null;
}

export interface QueenParticipant {
  id: string;
  shortName: string;
  fullName: string;
  isGuest: boolean;
  companionMaleId?: string;
  companionMaleName?: string;
}

export interface GameState {
  isLive: boolean;
  focusTimestamp: number;
  phase: GamePhase;
  phaseStartedAt: number;
  currentQueenId: string;
  activeBoxNumber: number | null;
  selectedMaleId: string | null;
  boxes: BlindBoxSlot[];
  updatedAt: number;
  participants?: QueenParticipant[];
  skippedQueenIds?: string[];
}

export interface AppStateData {
  rsvps: Record<string, MemberRsvp>;
  milkTeaOrders: Record<string, MilkTeaOrder>;
  wishes: WishItem[];
  gameState: GameState;
  practiceGameState?: GameState;
  avatars?: Record<string, { data: string; version: string }>;
  privateMessages: PrivateMessage[];
  memoryRuns: Record<string, MemoryRun>;
  memoryScores: Record<string, MemoryBests>;
}

declare global {
  // eslint-disable-next-line no-var
  var __ktcnmtStateCache: AppStateData | undefined;
}

function resolveStateFilePath(): string {
  return (
    process.env.STATE_FILE_PATH ||
    path.join(process.cwd(), "data", "state.json")
  );
}

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function getDynamicQueens(state: AppStateData): QueenParticipant[] {
  if (state.gameState?.participants) return state.gameState.participants;
  const staffQueens: QueenParticipant[] = FEMALE_MEMBERS.filter(
    (f) => state.rsvps[f.id]?.attendanceStatus === "attending",
  ).map((f) => ({
    id: f.id,
    shortName: f.shortName,
    fullName: f.fullName,
    isGuest: false,
  }));

  const guestQueens: QueenParticipant[] = [];
  for (const male of MALE_MEMBERS) {
    const rsvp = state.rsvps[male.id];
    if (rsvp?.attendanceStatus === "attending" && rsvp?.hasPlusOne) {
      const customName = rsvp.plusOneName?.trim();
      const shortName = customName || `Khách của ${male.shortName}`;
      guestQueens.push({
        id: `guest-${male.id}`,
        shortName,
        fullName: `${shortName} (Đi cùng ${male.shortName})`,
        isGuest: true,
        companionMaleId: male.id,
        companionMaleName: male.shortName,
      });
    }
  }

  return [...staffQueens, ...guestQueens];
}

export function createInitialBoxes(boxCount = 0): BlindBoxSlot[] {
  const shuffledRewards = shuffleArray(BLIND_BOX_REWARDS);
  const count = Math.max(
    0,
    Math.min(boxCount, FEMALE_MEMBERS.length + MALE_MEMBERS.length),
  );
  return Array.from({ length: count }, (_, index) => ({
    boxNumber: index + 1,
    rewardId: shuffledRewards[index % shuffledRewards.length].id,
    isOpened: false,
    openedByQueenId: null,
    openedByQueenName: null,
    assignedMaleId: null,
    assignedMaleName: null,
    openedAt: null,
  }));
}

export function createDefaultGameState(boxCount = 0): GameState {
  return {
    isLive: false,
    focusTimestamp: 0,
    phase: "WAITING",
    phaseStartedAt: Date.now(),
    currentQueenId: "",
    activeBoxNumber: null,
    selectedMaleId: null,
    boxes: createInitialBoxes(boxCount),
    updatedAt: Date.now(),
  };
}

export function createDefaultState(): AppStateData {
  return {
    rsvps: {},
    milkTeaOrders: {},
    wishes: [],
    privateMessages: [],
    memoryRuns: {},
    memoryScores: {},
    gameState: createDefaultGameState(),
  };
}

// A separate board with roster stand-ins; never save these as real RSVPs.
export function createPracticeState(state: AppStateData): AppStateData {
  return {
    ...state,
    gameState: state.practiceGameState || createDefaultGameState(),
    rsvps: Object.fromEntries(STAFF_MEMBERS.map(member => [member.id, {
      memberId: member.id, attending: true, attendanceStatus: "attending" as const,
      gameCompanion: true, updatedAt: "",
    }])),
  };
}

function syncAllGameTimers(state: AppStateData): boolean {
  const liveChanged = syncGameTimers(state);
  if (!state.practiceGameState) return liveChanged;
  const practice = createPracticeState(state);
  const practiceChanged = syncGameTimers(practice);
  state.practiceGameState = practice.gameState;
  return liveChanged || practiceChanged;
}

export function getQueenDisplayName(
  queenId: string,
  state: AppStateData,
): string {
  const queens = getDynamicQueens(state);
  const found = queens.find((q) => q.id === queenId);
  if (found) return found.shortName;
  const staff = STAFF_MEMBERS.find((m) => m.id === queenId);
  return staff ? staff.shortName : "Chị em Kỹ thuật công nghệ - Môi trường";
}

function persistStateToDisk(state: AppStateData): void {
  const filePath = resolveStateFilePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${randomUUID()}.tmp`;
  let descriptor: number | undefined;
  try {
    descriptor = fs.openSync(tempPath, "wx", 0o600);
    fs.writeFileSync(descriptor, JSON.stringify(state, null, 2), "utf-8");
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    fs.renameSync(tempPath, filePath);
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }
}

export function syncBoxesWithQueens(state: AppStateData): boolean {
  const game = state.gameState;
  if (game.participants || game.phase !== "WAITING") return false;
  const queens = getDynamicQueens(state);
  if (
    game.boxes.length === queens.length &&
    (queens.some((q) => q.id === game.currentQueenId) || !queens.length)
  )
    return false;
  game.boxes = createInitialBoxes(queens.length);
  game.currentQueenId = queens[0]?.id || "";
  return true;
}

export function syncGameTimers(state: AppStateData): boolean {
  const game = state.gameState;
  const now = Date.now();
  let mutated = syncBoxesWithQueens(state);

  if (game.phase === "SHAKING" && now - game.phaseStartedAt >= 2000) {
    game.phase = "REVEALED";
    game.phaseStartedAt = now;
    game.updatedAt = now;
    mutated = true;
  } else if (
    game.phase === "SPINNING_MALE" &&
    now - game.phaseStartedAt >= 2500
  ) {
    game.phase = "MALE_SELECTED";
    game.phaseStartedAt = now;
    game.updatedAt = now;
    mutated = true;
  }

  return mutated;
}

function readStateFromDisk(): AppStateData {
  const filePath = resolveStateFilePath();
  if (!fs.existsSync(/* turbopackIgnore: true */ filePath)) {
    const initial = createDefaultState();
    persistStateToDisk(initial);
    return initial;
  }
  let parsed: AppStateData;
  try {
    parsed = JSON.parse(
      fs.readFileSync(/* turbopackIgnore: true */ filePath, "utf-8"),
    ) as AppStateData;
  } catch {
    throw new Error(
      "Invalid persisted state JSON; restore a verified backup before continuing",
    );
  }
  if (
    !parsed ||
    typeof parsed.rsvps !== "object" ||
    !parsed.rsvps ||
    Array.isArray(parsed.rsvps) ||
    typeof parsed.milkTeaOrders !== "object" ||
    !parsed.milkTeaOrders ||
    Array.isArray(parsed.milkTeaOrders) ||
    !Array.isArray(parsed.wishes) ||
    !parsed.gameState ||
    !Array.isArray(parsed.gameState.boxes) ||
    ![
      "WAITING",
      "SELECTING_BOX",
      "SHAKING",
      "REVEALED",
      "SPINNING_MALE",
      "MALE_SELECTED",
      "COMPLETED",
    ].includes(parsed.gameState.phase)
  ) {
    throw new Error(
      "Invalid persisted state; restore a verified backup before continuing",
    );
  }
  const record = (value: unknown): value is Record<string, unknown> =>
    Boolean(value && typeof value === "object" && !Array.isArray(value));
  const strings = (value: Record<string, unknown>, keys: string[]) =>
    keys.every((key) => typeof value[key] === "string");
  const validMemberId = (id: string) =>
    STAFF_MEMBERS.some((member) => member.id === id);
  // Additive migration: preserve every existing RSVP, order, wish and live game.
  if (parsed.privateMessages === undefined) parsed.privateMessages = [];
  if (parsed.memoryRuns === undefined) parsed.memoryRuns = {};
  if (parsed.memoryScores === undefined) parsed.memoryScores = {};
  const invalidSocial =
    !Array.isArray(parsed.privateMessages) ||
    parsed.privateMessages.some(
      (m) =>
        !record(m) ||
        !strings(m, [
          "id",
          "senderId",
          "recipientId",
          "content",
          "createdAt",
          "requestId",
        ]) ||
        !validMemberId(m.senderId) ||
        !validMemberId(m.recipientId) ||
        (m.readAt !== undefined && typeof m.readAt !== "string"),
    ) ||
    !record(parsed.memoryRuns) ||
    !record(parsed.memoryScores) ||
    Object.entries(parsed.memoryRuns).some(
      ([id, run]) =>
        !validMemberId(id) ||
        !record(run) ||
        typeof run.id !== "string" ||
        !Array.isArray(run.deck) ||
        run.deck.length !== 12 ||
        run.deck.some(
          (pair) => !Number.isInteger(pair) || pair < 0 || pair > 5,
        ) ||
        !Array.isArray(run.open) ||
        run.open.length > 2 ||
        run.open.some((i) => !Number.isInteger(i) || i < 0 || i >= 12) ||
        new Set(run.open).size !== run.open.length ||
        !Array.isArray(run.matched) ||
        run.matched.length > 6 ||
        run.matched.some(
          (pair) => !Number.isInteger(pair) || pair < 0 || pair > 5,
        ) ||
        new Set(run.matched).size !== run.matched.length ||
        Array.from(
          { length: 6 },
          (_, pair) => run.deck.filter((p) => p === pair).length,
        ).some((count) => count !== 2) ||
        !Number.isInteger(run.flips) ||
        run.flips < 0 ||
        [run.startedAt, run.finishedAt, run.hideAt].some(
          (t) => t !== null && !Number.isFinite(t),
        ),
    ) ||
    Object.entries(parsed.memoryScores).some(
      ([id, bests]) =>
        !validMemberId(id) ||
        !record(bests) ||
        [bests.byFlips, bests.byTime].some(
          (score) =>
            !record(score) ||
            score.memberId !== id ||
            !Number.isInteger(score.flips) ||
            Number(score.flips) < 12 ||
            !Number.isFinite(score.durationMs) ||
            Number(score.durationMs) < 0 ||
            typeof score.completedAt !== "string",
        ),
    );
  const invalidRsvp = Object.entries(parsed.rsvps).some(
    ([id, value]) =>
      !validMemberId(id) ||
      !record(value) ||
      value.memberId !== id ||
      typeof value.attending !== "boolean" ||
      !strings(value, ["updatedAt"]) ||
      (value.attendanceStatus !== undefined &&
        !["attending", "declined", "maybe"].includes(
          String(value.attendanceStatus),
        )),
  );
  const invalidOrder = Object.entries(parsed.milkTeaOrders).some(
    ([id, value]) =>
      !validMemberId(id) ||
      !record(value) ||
      value.memberId !== id ||
      !strings(value, ["drinkName", "sugar", "ice", "note", "updatedAt"]),
  );
  const invalidWish = parsed.wishes.some(
    (value) =>
      !record(value) ||
      !strings(value, [
        "id",
        "authorId",
        "authorName",
        "content",
        "createdAt",
      ]) ||
      !Number.isInteger(value.likes) ||
      Number(value.likes) < 0 ||
      (value.likedBy !== undefined &&
        (!Array.isArray(value.likedBy) ||
          value.likedBy.some(
            (id) => typeof id !== "string" || !validMemberId(id),
          ))),
  );
  const invalidAvatars = parsed.avatars !== undefined && (
    !record(parsed.avatars) || Object.entries(parsed.avatars).some(([id, value]) =>
      !validMemberId(id) || !record(value) || !strings(value, ["data", "version"]) ||
      value.data.length > 1024 * 1024 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value.data) ||
      !/^[a-f0-9-]{36}$/.test(value.version)
    )
  );
  const invalidGame = (game: GameState) => {
    if (!record(game) || !Array.isArray(game.boxes)) return true;
    const invalidBox = game.boxes.some(value =>
      !record(value) || !Number.isInteger(value.boxNumber) || Number(value.boxNumber) < 1 ||
      !strings(value, ["rewardId"]) || !BLIND_BOX_REWARDS.some(reward => reward.id === value.rewardId) ||
      typeof value.isOpened !== "boolean"
    );
    const invalidParticipants = game.participants !== undefined && (
      !Array.isArray(game.participants) || game.participants.some(value =>
        !record(value) || !strings(value, ["id", "shortName", "fullName"]) || typeof value.isGuest !== "boolean"
      )
    );
    return invalidBox || invalidParticipants || typeof game.isLive !== "boolean" ||
      !["WAITING", "SELECTING_BOX", "SHAKING", "REVEALED", "SPINNING_MALE", "MALE_SELECTED", "COMPLETED"].includes(game.phase) ||
      typeof game.currentQueenId !== "string" || !Number.isFinite(game.phaseStartedAt) || !Number.isFinite(game.updatedAt);
  };
  if (invalidRsvp || invalidSocial || invalidOrder || invalidWish || invalidAvatars ||
    invalidGame(parsed.gameState) || (parsed.practiceGameState !== undefined && invalidGame(parsed.practiceGameState))) {
    throw new Error("Invalid persisted state; restore a verified backup before continuing");
  }
  if (parsed.wishes.some((w) => w.id.startsWith("wish-seed-"))) {
    // Preserve the exact source before the narrowly scoped, known-seed migration.
    fs.copyFileSync(
      filePath,
      `${filePath}.before-seed-removal-${randomUUID()}.bak`,
      fs.constants.COPYFILE_EXCL,
    );
    parsed.wishes = parsed.wishes.filter((w) => !w.id.startsWith("wish-seed-"));
    persistStateToDisk(parsed);
  }
  return parsed;
}

export function getState(): AppStateData {
  const current = globalThis.__ktcnmtStateCache || readStateFromDisk();
  const draft = structuredClone(current);
  if (syncAllGameTimers(draft)) {
    persistStateToDisk(draft);
    globalThis.__ktcnmtStateCache = draft;
  } else {
    globalThis.__ktcnmtStateCache = current;
  }
  // Callers cannot mutate cached state without a successful updateState commit.
  return structuredClone(globalThis.__ktcnmtStateCache);
}

export function updateState(
  mutator: (draft: AppStateData) => void,
): AppStateData {
  const draft = getState();
  mutator(draft);
  syncAllGameTimers(draft);
  persistStateToDisk(draft);
  globalThis.__ktcnmtStateCache = draft;
  return structuredClone(draft);
}

export function pickRandomMaleForGame(state: AppStateData): {
  id: string;
  shortName: string;
} {
  const alreadyAssignedIds = new Set(
    state.gameState.boxes
      .map((b) => b.assignedMaleId)
      .filter((id): id is string => Boolean(id)),
  );
  const unassignedMales = MALE_MEMBERS.filter(
    (m) =>
      state.rsvps[m.id]?.attendanceStatus === "attending" &&
      state.rsvps[m.id]?.gameCompanion === true &&
      !alreadyAssignedIds.has(m.id),
  );
  const pool =
    unassignedMales.length > 0
      ? unassignedMales
      : MALE_MEMBERS.filter(
          (m) =>
            state.rsvps[m.id]?.attendanceStatus === "attending" &&
            state.rsvps[m.id]?.gameCompanion === true,
        );
  if (!pool.length) throw new Error("No attending male participant");
  const chosen = pool[randomInt(pool.length)];
  return {
    id: chosen.id,
    shortName: chosen.shortName,
  };
}
