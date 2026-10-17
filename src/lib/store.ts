import fs from "fs";
import path from "path";
import {
  BLIND_BOX_REWARDS,
  FEMALE_MEMBERS,
  MALE_MEMBERS,
  MaleTransportOptionId,
  SPECIAL_GUEST_ID,
  STAFF_MEMBERS,
} from "@/data/roster";

export interface MemberRsvp {
  memberId: string;
  attending: boolean;
  joinSharedRide1715?: boolean;
  hasPlusOne?: boolean;
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
}

export type GamePhase =
  | "WAITING"
  | "SELECTING_BOX"
  | "SHAKING"
  | "REVEALED"
  | "SPINNING_MALE"
  | "MALE_SELECTED";

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
}

export interface AppStateData {
  rsvps: Record<string, MemberRsvp>;
  milkTeaOrders: Record<string, MilkTeaOrder>;
  wishes: WishItem[];
  gameState: GameState;
}

declare global {
  // eslint-disable-next-line no-var
  var __ktcnmtStateCache: AppStateData | undefined;
}

function resolveStateFilePath(): string {
  const dockerDataDir = "/app/data";
  try {
    if (fs.existsSync("/app")) {
      if (!fs.existsSync(dockerDataDir)) {
        fs.mkdirSync(dockerDataDir, { recursive: true });
      }
      return path.join(dockerDataDir, "state.json");
    }
  } catch {
    // Fallback to local cwd data directory if /app is not accessible
  }
  const localDataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(localDataDir)) {
    fs.mkdirSync(localDataDir, { recursive: true });
  }
  return path.join(localDataDir, "state.json");
}

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function createInitialBoxes(): BlindBoxSlot[] {
  const shuffledRewards = shuffleArray(BLIND_BOX_REWARDS);
  return shuffledRewards.map((reward, index) => ({
    boxNumber: index + 1,
    rewardId: reward.id,
    isOpened: false,
    openedByQueenId: null,
    openedByQueenName: null,
    assignedMaleId: null,
    assignedMaleName: null,
    openedAt: null,
  }));
}

export function createDefaultGameState(): GameState {
  return {
    isLive: false,
    focusTimestamp: 0,
    phase: "WAITING",
    phaseStartedAt: Date.now(),
    currentQueenId: FEMALE_MEMBERS[0].id,
    activeBoxNumber: null,
    selectedMaleId: null,
    boxes: createInitialBoxes(),
    updatedAt: Date.now(),
  };
}

export function createDefaultState(): AppStateData {
  const nowIso = new Date().toISOString();
  return {
    rsvps: {
      "huy-duong": {
        memberId: "huy-duong",
        attending: true,
        hasPlusOne: false,
        plusOneName: "",
        transportOption: "vanguard",
        updatedAt: nowIso,
      },
    },
    milkTeaOrders: {},
    wishes: [
      {
        id: "wish-seed-1",
        authorId: "huy-duong",
        authorName: "Anh Dương",
        content:
          "Chúc 05 bông hoa KTCNMT và chị khách quý dịp 20/10 luôn trẻ trung, rạng rỡ, ngập tràn niềm vui và có một đêm tiệc thật bùng nổ tại The Gangs! 🌸🥂",
        likes: 8,
        createdAt: nowIso,
      },
    ],
    gameState: createDefaultGameState(),
  };
}

export function getSpecialGuestName(state: AppStateData): string {
  for (const rsvp of Object.values(state.rsvps)) {
    if (rsvp.attending && rsvp.hasPlusOne && rsvp.plusOneName?.trim()) {
      return rsvp.plusOneName.trim();
    }
  }
  return "Khách Quý Đặc Biệt";
}

export function getQueenDisplayName(queenId: string, state: AppStateData): string {
  if (queenId === SPECIAL_GUEST_ID) {
    return getSpecialGuestName(state);
  }
  const found = STAFF_MEMBERS.find((m) => m.id === queenId);
  return found ? found.shortName : "Nữ Hoàng KTCNMT";
}

function persistStateToDisk(state: AppStateData): void {
  try {
    const filePath = resolveStateFilePath();
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(state, null, 2), "utf-8");
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    console.error("Failed to write state.json:", err);
  }
}

export function syncGameTimers(state: AppStateData): boolean {
  const game = state.gameState;
  const now = Date.now();
  let mutated = false;

  if (game.phase === "SHAKING" && now - game.phaseStartedAt >= 2000) {
    game.phase = "REVEALED";
    game.phaseStartedAt = now;
    game.updatedAt = now;
    mutated = true;
  } else if (game.phase === "SPINNING_MALE" && now - game.phaseStartedAt >= 2500) {
    game.phase = "MALE_SELECTED";
    game.phaseStartedAt = now;
    game.updatedAt = now;
    mutated = true;
  }

  // Keep opened box #6 guest name updated if special guest name changed
  const guestName = getSpecialGuestName(state);
  for (const box of game.boxes) {
    if (box.openedByQueenId === SPECIAL_GUEST_ID && box.openedByQueenName !== guestName) {
      box.openedByQueenName = guestName;
      mutated = true;
    }
  }

  if (mutated) {
    persistStateToDisk(state);
  }
  return mutated;
}

export function getState(): AppStateData {
  const filePath = resolveStateFilePath();

  if (!globalThis.__ktcnmtStateCache) {
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(raw) as Partial<AppStateData>;
        const defaults = createDefaultState();
        globalThis.__ktcnmtStateCache = {
          rsvps: parsed.rsvps ?? defaults.rsvps,
          milkTeaOrders: parsed.milkTeaOrders ?? defaults.milkTeaOrders,
          wishes: Array.isArray(parsed.wishes) ? parsed.wishes : defaults.wishes,
          gameState:
            parsed.gameState && Array.isArray(parsed.gameState.boxes)
              ? parsed.gameState
              : defaults.gameState,
        };
      } catch (err) {
        console.error("Error parsing state.json, re-initializing default:", err);
        const initial = createDefaultState();
        globalThis.__ktcnmtStateCache = initial;
        persistStateToDisk(initial);
      }
    } else {
      const initial = createDefaultState();
      globalThis.__ktcnmtStateCache = initial;
      persistStateToDisk(initial);
    }
  }

  const state = globalThis.__ktcnmtStateCache;
  syncGameTimers(state);
  return state;
}

export function updateState(mutator: (draft: AppStateData) => void): AppStateData {
  const current = getState();
  mutator(current);
  syncGameTimers(current);
  globalThis.__ktcnmtStateCache = current;
  persistStateToDisk(current);
  return current;
}

export function pickRandomMaleForGame(state: AppStateData): {
  id: string;
  shortName: string;
} {
  const alreadyAssignedIds = new Set(
    state.gameState.boxes
      .map((b) => b.assignedMaleId)
      .filter((id): id is string => Boolean(id))
  );
  const unassignedMales = MALE_MEMBERS.filter((m) => !alreadyAssignedIds.has(m.id));
  const pool = unassignedMales.length > 0 ? unassignedMales : MALE_MEMBERS;
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  return {
    id: chosen.id,
    shortName: chosen.shortName,
  };
}
