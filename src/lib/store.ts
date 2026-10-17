import fs from "fs";
import path from "path";
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

export function getDynamicQueens(state: AppStateData): QueenParticipant[] {
  const staffQueens: QueenParticipant[] = FEMALE_MEMBERS.map((f) => ({
    id: f.id,
    shortName: f.shortName,
    fullName: f.fullName,
    isGuest: false,
  }));

  const guestQueens: QueenParticipant[] = [];
  for (const male of MALE_MEMBERS) {
    const rsvp = state.rsvps[male.id];
    if (rsvp?.attending && rsvp?.hasPlusOne) {
      const customName = rsvp.plusOneName?.trim();
      const shortName = customName || `Bà xã ${male.shortName}`;
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

export function createInitialBoxes(boxCount = 7): BlindBoxSlot[] {
  const shuffledRewards = shuffleArray(BLIND_BOX_REWARDS);
  const count = Math.max(5, Math.min(boxCount, BLIND_BOX_REWARDS.length));
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

export function createDefaultGameState(boxCount = 7): GameState {
  return {
    isLive: false,
    focusTimestamp: 0,
    phase: "WAITING",
    phaseStartedAt: Date.now(),
    currentQueenId: FEMALE_MEMBERS[0].id,
    activeBoxNumber: null,
    selectedMaleId: null,
    boxes: createInitialBoxes(boxCount),
    updatedAt: Date.now(),
  };
}

export function createDefaultState(): AppStateData {
  const nowIso = new Date().toISOString();
  const defaultRsvps: Record<string, MemberRsvp> = {
    "huy-duong": {
      memberId: "huy-duong",
      attending: true,
      hasPlusOne: false,
      plusOneName: "",
      transportOption: "vanguard",
      updatedAt: nowIso,
    },
    "anh-thai": {
      memberId: "anh-thai",
      attending: true,
      hasPlusOne: true,
      plusOneName: "Bà xã Anh Thái",
      transportOption: "car",
      updatedAt: nowIso,
    },
    "manh-cuong": {
      memberId: "manh-cuong",
      attending: true,
      hasPlusOne: true,
      plusOneName: "Bà xã Anh Cường",
      transportOption: "grab",
      updatedAt: nowIso,
    },
  };

  // 5 female staff + 2 wives (Thái & Cường) = 7 boxes by default
  return {
    rsvps: defaultRsvps,
    milkTeaOrders: {},
    wishes: [
      {
        id: "wish-seed-1",
        authorId: "huy-duong",
        authorName: "Anh Dương",
        content:
          "Chúc 05 bông hoa KTCNMT và các chị khách quý dịp 20/10 luôn trẻ trung, rạng rỡ, ngập tràn niềm vui và có một đêm tiệc thật bùng nổ tại The Street! 🌸🥂",
        likes: 8,
        createdAt: nowIso,
      },
    ],
    gameState: createDefaultGameState(7),
  };
}

export function getQueenDisplayName(
  queenId: string,
  state: AppStateData
): string {
  const queens = getDynamicQueens(state);
  const found = queens.find((q) => q.id === queenId);
  if (found) return found.shortName;
  const staff = STAFF_MEMBERS.find((m) => m.id === queenId);
  return staff ? staff.shortName : "Nữ Hoàng KTCNMT";
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

export function syncBoxesWithQueens(state: AppStateData): boolean {
  const game = state.gameState;
  const queens = getDynamicQueens(state);
  const targetCount = Math.max(
    FEMALE_MEMBERS.length,
    Math.min(queens.length, BLIND_BOX_REWARDS.length)
  );
  let mutated = false;

  // 1. Update display names on already-opened boxes if a guest's name changed
  for (const box of game.boxes) {
    if (box.openedByQueenId) {
      const q = queens.find((item) => item.id === box.openedByQueenId);
      if (q && box.openedByQueenName !== q.shortName) {
        box.openedByQueenName = q.shortName;
        mutated = true;
      }
    }
  }

  // 2. Grow boxes if more male members registered +1 guests
  if (game.boxes.length < targetCount) {
    const usedRewardIds = new Set(game.boxes.map((b) => b.rewardId));
    const availableRewards = shuffleArray(
      BLIND_BOX_REWARDS.filter((r) => !usedRewardIds.has(r.id))
    );
    while (game.boxes.length < targetCount) {
      const nextNum = game.boxes.length + 1;
      const nextReward =
        availableRewards.pop() ||
        BLIND_BOX_REWARDS[(nextNum - 1) % BLIND_BOX_REWARDS.length];
      game.boxes.push({
        boxNumber: nextNum,
        rewardId: nextReward.id,
        isOpened: false,
        openedByQueenId: null,
        openedByQueenName: null,
        assignedMaleId: null,
        assignedMaleName: null,
        openedAt: null,
      });
      mutated = true;
    }
  }

  // 3. Shrink unopened boxes if a male member turned off +1
  if (game.boxes.length > targetCount) {
    const removableCount = game.boxes.length - targetCount;
    let removed = 0;
    for (let i = game.boxes.length - 1; i >= 0 && removed < removableCount; i--) {
      if (!game.boxes[i].isOpened && game.boxes[i].boxNumber !== game.activeBoxNumber) {
        game.boxes.splice(i, 1);
        removed++;
        mutated = true;
      }
    }
    if (removed > 0) {
      game.boxes.forEach((b, idx) => {
        b.boxNumber = idx + 1;
      });
    }
  }

  // 4. Ensure currentQueenId is valid
  if (!queens.some((q) => q.id === game.currentQueenId)) {
    const openedQueens = new Set(
      game.boxes
        .map((b) => b.openedByQueenId)
        .filter((id): id is string => Boolean(id))
    );
    const nextUnopenedQueen = queens.find((q) => !openedQueens.has(q.id));
    game.currentQueenId = (nextUnopenedQueen || queens[0]).id;
    mutated = true;
  }

  return mutated;
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
  } else if (game.phase === "SPINNING_MALE" && now - game.phaseStartedAt >= 2500) {
    game.phase = "MALE_SELECTED";
    game.phaseStartedAt = now;
    game.updatedAt = now;
    mutated = true;
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
