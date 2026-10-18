import { NextRequest, NextResponse } from "next/server";
import { MALE_MEMBERS } from "@/data/roster";
import {
  createDefaultGameState,
  createPracticeState,
  syncGameTimers,
  createInitialBoxes,
  getDynamicQueens,
  getQueenDisplayName,
  getState,
  pickRandomMaleForGame,
  updateState,
} from "@/lib/store";
import {
  ApiError,
  apiError,
  getSession,
  memberDisplayPayload,
  noStore,
  requireAdmin,
  requireSession,
  requestBody,
  statePayload,
} from "@/lib/auth";
export const dynamic = "force-dynamic";
function payload(
  state: ReturnType<typeof getState>,
  session: ReturnType<typeof getSession>,
  practice = false,
  realState = state,
) {
  const { gameState, queens, rsvps, serverTime } = statePayload(state, session);
  return { gameState, queens, serverTime, ...memberDisplayPayload(realState), ...(!practice && { rsvps }) };
}
export async function GET(req: NextRequest) {
  try {
    const practice = req.nextUrl.searchParams.get("practice") === "1";
    const session = practice ? requireSession(req) : getSession(req);
    if (practice) requireAdmin(session!);
    const state = getState();
    return NextResponse.json(payload(practice ? createPracticeState(state) : state, session, practice, state), {
      headers: noStore,
    });
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(req: NextRequest) {
  try {
    const session = requireSession(req);
    const practice = req.nextUrl.searchParams.get("practice") === "1";
    if (practice) requireAdmin(session);
    const body = await requestBody(req);
    const { action } = body;
    const actions = [
      "START_LIVE",
      "SET_QUEEN",
      "OPEN_BOX",
      "SPIN_MALE",
      "BACK_TO_BOARD",
      "RESET_GAME",
      "SKIP_TURN",
    ];
    if (!actions.includes(String(action)))
      throw new ApiError(400, "Thao tác trò chơi không hợp lệ.");
    if (!["OPEN_BOX", "SPIN_MALE", "SKIP_TURN"].includes(String(action)))
      requireAdmin(session);
    const now = Date.now();
    const updated = updateState((saved) => {
      const draft = practice ? createPracticeState(saved) : saved;
      const game = draft.gameState;
      const queens = getDynamicQueens(draft);
      const conflict = (
        message = "Trạng thái trò chơi đã thay đổi. Vui lòng tải lại.",
      ) => {
        throw new ApiError(409, message);
      };
      if (
        [
          "OPEN_BOX",
          "SPIN_MALE",
          "SKIP_TURN",
          "BACK_TO_BOARD",
          "SET_QUEEN",
        ].includes(String(action))
      ) {
        if (typeof body.expectedQueenId !== "string")
          throw new ApiError(
            400,
            "Thiếu thông tin lượt chơi. Vui lòng tải lại.",
          );
        if (body.expectedQueenId !== game.currentQueenId)
          conflict("Lượt chơi đã thay đổi. Vui lòng tải lại.");
        if (
          body.expectedUpdatedAt !== undefined &&
          body.expectedUpdatedAt !== game.updatedAt
        )
          conflict();
      }
      const requireTurn = () => {
        if (!queens.some((queen) => queen.id === game.currentQueenId))
          conflict(
            "Người mở quà chưa có trong danh sách đã xác nhận. Vui lòng kiểm tra và bắt đầu lại chương trình.",
          );
        if (
          !session.isAdmin &&
          (game.currentQueenId.startsWith("guest-") ||
            game.currentQueenId !== session.memberId)
        )
          throw new ApiError(403, "Vui lòng chờ đến lượt của bạn.");
      };
      const advance = () => {
        const done = new Set([
          ...game.boxes.map((b) => b.openedByQueenId),
          ...(game.skippedQueenIds || []),
        ]);
        const next = queens.find((q) => !done.has(q.id));
        game.phase = next ? "SELECTING_BOX" : "COMPLETED";
        game.currentQueenId = next?.id || "";
        game.activeBoxNumber = null;
        game.selectedMaleId = null;
      };
      if (action === "START_LIVE") {
        if (game.phase !== "WAITING") conflict();
        if (!queens.length) conflict("Chưa có người mở quà xác nhận tham dự.");
        game.participants = structuredClone(queens);
        game.skippedQueenIds = [];
        game.boxes = createInitialBoxes(queens.length);
        game.currentQueenId = queens[0].id;
        game.isLive = true;
        game.focusTimestamp = now;
        game.phase = "SELECTING_BOX";
      } else if (action === "RESET_GAME") {
        if (body.keepLive !== undefined && typeof body.keepLive !== "boolean")
          throw new ApiError(400, "Lựa chọn reset không hợp lệ.");
        delete game.participants;
        const currentQueens = getDynamicQueens(draft);
        if (body.keepLive && !currentQueens.length)
          conflict("Chưa có người mở quà xác nhận tham dự.");
        draft.gameState = createDefaultGameState(currentQueens.length);
        draft.gameState.currentQueenId = currentQueens[0]?.id || "";
        if (body.keepLive) {
          draft.gameState.isLive = true;
          draft.gameState.phase = "SELECTING_BOX";
          draft.gameState.participants = currentQueens;
          draft.gameState.focusTimestamp = now;
        }
      } else if (action === "SET_QUEEN") {
        if (game.phase !== "SELECTING_BOX") conflict();
        const queen = queens.find((q) => q.id === body.queenId);
        if (!queen) throw new ApiError(400, "Người mở quà không hợp lệ.");
        if (
          game.boxes.some((b) => b.openedByQueenId === queen.id) ||
          game.skippedQueenIds?.includes(queen.id)
        )
          conflict("Người này đã hoàn tất lượt.");
        game.currentQueenId = queen.id;
      } else if (action === "OPEN_BOX") {
        requireTurn();
        if (!game.isLive || game.phase !== "SELECTING_BOX") conflict();
        if (
          game.boxes.some((b) => b.openedByQueenId === game.currentQueenId) ||
          game.skippedQueenIds?.includes(game.currentQueenId)
        )
          conflict("Lượt này đã hoàn tất.");
        if (!Number.isInteger(body.boxNumber))
          throw new ApiError(400, "Hộp quà không hợp lệ.");
        const box = game.boxes.find((b) => b.boxNumber === body.boxNumber);
        if (!box || box.isOpened)
          conflict("Hộp này đã được mở hoặc không còn tồn tại.");
        box!.isOpened = true;
        box!.openedByQueenId = game.currentQueenId;
        box!.openedByQueenName = getQueenDisplayName(
          game.currentQueenId,
          draft,
        );
        box!.openedAt = now;
        game.activeBoxNumber = body.boxNumber as number;
        game.selectedMaleId = null;
        game.phase = "SHAKING";
      } else if (action === "SPIN_MALE") {
        requireTurn();
        if (game.phase !== "REVEALED") conflict();
        if (
          !MALE_MEMBERS.some(
            (m) =>
              draft.rsvps[m.id]?.attendanceStatus === "attending" &&
              draft.rsvps[m.id]?.gameCompanion === true,
          )
        )
          conflict(
            "Chưa có anh em nào chọn cùng chơi. Mình có thể bỏ qua phần đồng hành nhé.",
          );
        const selected = pickRandomMaleForGame(draft);
        const box = game.boxes.find(
          (b) => b.boxNumber === game.activeBoxNumber,
        );
        if (!box) conflict();
        box!.assignedMaleId = selected.id;
        box!.assignedMaleName = selected.shortName;
        game.selectedMaleId = selected.id;
        game.phase = "SPINNING_MALE";
      } else if (action === "BACK_TO_BOARD") {
        if (game.phase !== "MALE_SELECTED" && game.phase !== "REVEALED")
          conflict();
        advance();
      } else if (action === "SKIP_TURN") {
        requireTurn();
        if (
          !["SELECTING_BOX", "REVEALED", "MALE_SELECTED"].includes(game.phase)
        )
          conflict();
        game.skippedQueenIds = [
          ...(game.skippedQueenIds || []),
          game.currentQueenId,
        ];
        advance();
      }
      draft.gameState.phaseStartedAt = now;
      draft.gameState.updatedAt = now;
      if (practice) {
        syncGameTimers(draft);
        saved.practiceGameState = draft.gameState;
      }
    });
    return NextResponse.json(
      { ok: true, ...payload(practice ? createPracticeState(updated) : updated, session, practice, updated) },
      { headers: noStore },
    );
  } catch (error) {
    return apiError(error);
  }
}
