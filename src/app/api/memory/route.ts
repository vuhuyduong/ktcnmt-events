import { randomInt, randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getState, updateState, type AppStateData } from "@/lib/store";
import {
  ApiError,
  assertSessionIdentity,
  apiError,
  getSession,
  noStore,
  requireAdmin,
  requestBody,
  requireSession,
} from "@/lib/auth";
import { compareFlips, compareTime, type MemoryView } from "@/lib/social";

export const dynamic = "force-dynamic";

function view(state: AppStateData, memberId?: string, practice = false): MemoryView {
  const run = memberId ? (practice ? state.practiceMemoryRuns : state.memoryRuns)?.[memberId] : null;
  const { deck, ...visible } = run || { deck: [] };
  const open = run?.hideAt && Date.now() >= run.hideAt ? [] : run?.open || [];
  return {
    run: run
      ? ({
          ...visible,
          open,
          cards: deck.map((pair, i) => ({
            pair: open.includes(i) || run.matched.includes(pair) ? pair : null,
          })),
        } as NonNullable<MemoryView["run"]>)
      : null,
    leaderboards: {
      byFlips: practice ? [] : Object.values(state.memoryScores)
        .map((s) => s.byFlips)
        .sort(compareFlips),
      byTime: practice ? [] : Object.values(state.memoryScores)
        .map((s) => s.byTime)
        .sort(compareTime),
    },
    serverTime: Date.now(),
  };
}

export async function GET(req: NextRequest) {
  try {
    const practice = req.nextUrl.searchParams.get("practice") === "1";
    const session = practice ? requireSession(req) : getSession(req);
    if (practice) requireAdmin(session!);
    if (req.nextUrl.searchParams.has("memberId"))
      assertSessionIdentity(
        session,
        req.nextUrl.searchParams.get("memberId") || null,
      );
    return NextResponse.json(view(getState(), session?.memberId, practice), {
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
    assertSessionIdentity(session, body.memberId);
    if (!["START", "FLIP"].includes(String(body.action)))
      throw new ApiError(400, "Thao tác không hợp lệ.");
    const now = Date.now();
    const updated = updateState((draft) => {
      const runs = practice ? (draft.practiceMemoryRuns ||= {}) : draft.memoryRuns;
      if (body.action === "START") {
        const deck = Array.from({ length: 12 }, (_, i) => i % 6);
        for (let i = deck.length - 1; i > 0; i--) {
          const j = randomInt(i + 1);
          [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        runs[session.memberId] = {
          id: randomUUID(),
          deck,
          open: [],
          matched: [],
          flips: 0,
          startedAt: null,
          finishedAt: null,
          hideAt: null,
        };
        return;
      }
      const run = runs[session.memberId];
      if (!run || run.id !== body.runId || run.finishedAt)
        throw new ApiError(
          409,
          "Ván chơi đã thay đổi. Hãy tải lại hoặc chơi ván mới.",
        );
      const index = body.index;
      if (
        typeof index !== "number" ||
        !Number.isInteger(index) ||
        index < 0 ||
        index >= 12
      )
        throw new ApiError(400, "Thẻ không hợp lệ.");
      if (run.hideAt && now >= run.hideAt) {
        run.open = [];
        run.hideAt = null;
      }
      if (
        run.open.length === 2 ||
        run.open.includes(index) ||
        run.matched.includes(run.deck[index])
      )
        throw new ApiError(409, "Chờ hai thẻ úp lại hoặc chọn thẻ khác nhé.");
      run.startedAt ??= now;
      run.open.push(index);
      run.flips++;
      if (run.open.length === 2) {
        if (run.deck[run.open[0]] === run.deck[index]) {
          run.matched.push(run.deck[index]);
          run.open = [];
        } else run.hideAt = now + 1100;
      }
      if (run.matched.length === 6) {
        run.finishedAt = now;
        if (practice) return;
        const score = {
          memberId: session.memberId,
          flips: run.flips,
          durationMs: now - run.startedAt,
          completedAt: new Date(now).toISOString(),
        };
        const bests = draft.memoryScores[session.memberId];
        draft.memoryScores[session.memberId] = {
          byFlips:
            !bests || compareFlips(score, bests.byFlips) < 0
              ? score
              : bests.byFlips,
          byTime:
            !bests || compareTime(score, bests.byTime) < 0
              ? score
              : bests.byTime,
        };
      }
    });
    return NextResponse.json(view(updated, session.memberId, practice), {
      headers: noStore,
    });
  } catch (error) {
    return apiError(error);
  }
}
