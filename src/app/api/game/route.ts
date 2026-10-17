import { NextRequest, NextResponse } from "next/server";
import { FEMALE_MEMBERS } from "@/data/roster";
import {
  createInitialBoxes,
  getDynamicQueens,
  getQueenDisplayName,
  getState,
  pickRandomMaleForGame,
  updateState,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = getState();
  return NextResponse.json(
    {
      gameState: state.gameState,
      queens: getDynamicQueens(state),
      rsvps: state.rsvps,
      serverTime: Date.now(),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;
    const now = Date.now();

    const updated = updateState((draft) => {
      const game = draft.gameState;
      const dynamicQueens = getDynamicQueens(draft);
      const allQueenIds = dynamicQueens.map((q) => q.id);

      if (action === "START_LIVE") {
        game.isLive = true;
        game.focusTimestamp = now;
        if (game.phase === "WAITING") {
          game.phase = "SELECTING_BOX";
          game.phaseStartedAt = now;
        }
        game.updatedAt = now;
      } else if (action === "SET_QUEEN") {
        const { queenId } = body;
        if (allQueenIds.includes(queenId)) {
          game.currentQueenId = queenId;
          game.phase = "SELECTING_BOX";
          game.activeBoxNumber = null;
          game.selectedMaleId = null;
          game.phaseStartedAt = now;
          game.updatedAt = now;
        }
      } else if (action === "OPEN_BOX") {
        const boxNumber = Number(body.boxNumber);
        const box = game.boxes.find((b) => b.boxNumber === boxNumber);
        if (!box || box.isOpened) return;
        if (game.phase !== "SELECTING_BOX" && game.phase !== "WAITING") return;

        const queenName = getQueenDisplayName(game.currentQueenId, draft);
        box.isOpened = true;
        box.openedByQueenId = game.currentQueenId;
        box.openedByQueenName = queenName;
        box.openedAt = now;

        game.isLive = true;
        game.activeBoxNumber = boxNumber;
        game.selectedMaleId = null;
        game.phase = "SHAKING";
        game.phaseStartedAt = now;
        game.updatedAt = now;
      } else if (action === "SPIN_MALE") {
        if (game.phase !== "REVEALED" && game.phase !== "MALE_SELECTED") return;
        const chosenMale = pickRandomMaleForGame(draft);
        game.selectedMaleId = chosenMale.id;
        game.phase = "SPINNING_MALE";
        game.phaseStartedAt = now;
        game.updatedAt = now;

        if (game.activeBoxNumber !== null) {
          const activeBox = game.boxes.find(
            (b) => b.boxNumber === game.activeBoxNumber
          );
          if (activeBox) {
            activeBox.assignedMaleId = chosenMale.id;
            activeBox.assignedMaleName = chosenMale.shortName;
          }
        }
      } else if (action === "BACK_TO_BOARD") {
        game.phase = "SELECTING_BOX";
        game.activeBoxNumber = null;
        game.selectedMaleId = null;
        game.phaseStartedAt = now;
        game.updatedAt = now;

        // Auto-select next Queen who hasn't opened a box yet
        const openedQueens = new Set(
          game.boxes
            .map((b) => b.openedByQueenId)
            .filter((id): id is string => Boolean(id))
        );
        if (openedQueens.has(game.currentQueenId)) {
          const nextQueen = allQueenIds.find((qId) => !openedQueens.has(qId));
          if (nextQueen) {
            game.currentQueenId = nextQueen;
          }
        }
      } else if (action === "RESET_GAME") {
        const keepLive = Boolean(body.keepLive ?? false);
        game.isLive = keepLive;
        game.phase = keepLive ? "SELECTING_BOX" : "WAITING";
        game.phaseStartedAt = now;
        game.currentQueenId = FEMALE_MEMBERS[0].id;
        game.activeBoxNumber = null;
        game.selectedMaleId = null;
        game.boxes = createInitialBoxes(dynamicQueens.length);
        game.updatedAt = now;
      }
    });

    return NextResponse.json({
      ok: true,
      gameState: updated.gameState,
      queens: getDynamicQueens(updated),
      rsvps: updated.rsvps,
      serverTime: Date.now(),
    });
  } catch (err) {
    console.error("POST /api/game error:", err);
    return NextResponse.json(
      { ok: false, error: "Invalid game action" },
      { status: 400 }
    );
  }
}
