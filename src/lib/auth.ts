import { NextRequest, NextResponse } from "next/server";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import fs from "fs";
import path from "path";
import { STAFF_MEMBERS } from "@/data/roster";
import { AppStateData, GameState, getDynamicQueens } from "@/lib/store";

// Signed roster choice: prevents editing a cookie to read another inbox.
// Choosing a portrait remains convenience identity, not proof of identity.
const COOKIE = "ktcnmt_member";
const SESSION_AGE = 60 * 60 * 24 * 30;
function sessionKey(): Buffer {
  const keyPath = `${process.env.STATE_FILE_PATH || path.join(process.cwd(), "data", "state.json")}.session-key`;
  fs.mkdirSync(path.dirname(keyPath), { recursive: true });
  if (!fs.existsSync(keyPath)) {
    try {
      fs.writeFileSync(keyPath, randomBytes(32), { flag: "wx", mode: 0o600 });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }
  return fs.readFileSync(keyPath);
}
function signature(payload: string) {
  return createHmac("sha256", sessionKey()).update(payload).digest("hex");
}
export interface Session {
  memberId: string;
  isAdmin: boolean;
}
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}
export function selectIdentity(memberId: unknown): Session {
  const member = STAFF_MEMBERS.find((m) => m.id === memberId);
  if (!member) throw new ApiError(400, "Chọn ảnh của bạn để tiếp tục nhé.");
  return { memberId: member.id, isAdmin: Boolean(member.isHost) };
}
export function getSession(req: NextRequest): Session | null {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return null;
  const [memberId, expires, nonce, mac, extra] = token.split(".");
  if (
    extra ||
    !memberId ||
    !nonce ||
    !/^\d+$/.test(expires || "") ||
    !/^[a-f0-9]{64}$/.test(mac || "") ||
    Number(expires) <= Date.now()
  )
    return null;
  const expected = signature(`${memberId}.${expires}.${nonce}`);
  if (!timingSafeEqual(Buffer.from(mac, "hex"), Buffer.from(expected, "hex")))
    return null;
  try {
    return selectIdentity(memberId);
  } catch {
    return null;
  }
}
export function setSessionCookie(
  response: NextResponse,
  session: Session | null,
) {
  const payload = session
    ? `${session.memberId}.${Date.now() + SESSION_AGE * 1000}.${randomBytes(16).toString("hex")}`
    : "";
  response.cookies.set(
    COOKIE,
    session ? `${payload}.${signature(payload)}` : "",
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: session ? SESSION_AGE : 0,
    },
  );
}
export function requireTrustedOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return;
  // Proxy headers are supplied by clients too. Trust deployment configuration only.
  const expected =
    process.env.EVENT_PUBLIC_ORIGIN ||
    (process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : req.nextUrl.origin);
  if (origin !== expected)
    throw new ApiError(403, "Nguồn yêu cầu không hợp lệ.");
}
export async function requestBody(
  req: NextRequest,
): Promise<Record<string, unknown>> {
  const body: unknown = await req.json();
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new ApiError(400, "Dữ liệu yêu cầu không hợp lệ.");
  return body as Record<string, unknown>;
}
export function requireSession(req: NextRequest) {
  requireTrustedOrigin(req);
  const session = getSession(req);
  if (!session) throw new ApiError(401, "Chọn ảnh của bạn trước nhé.");
  return session;
}
export function assertSessionIdentity(
  session: Session | null,
  expected: unknown,
) {
  if (expected !== undefined && expected !== (session?.memberId ?? null))
    throw new ApiError(
      409,
      "Profile đã thay đổi ở tab khác. Hãy tải lại trang để tiếp tục.",
      "SESSION_CHANGED",
    );
}
export function requireAdmin(session: Session) {
  if (!session.isAdmin)
    throw new ApiError(403, "Chỉ ban tổ chức được dùng thao tác này.");
}
export function publicGame(game: GameState, isAdmin = false): GameState {
  if (!isAdmin && game.phase === "WAITING")
    return {
      ...game,
      currentQueenId: "",
      activeBoxNumber: null,
      selectedMaleId: null,
      boxes: [],
      participants: undefined,
      skippedQueenIds: undefined,
    };
  return {
    ...game,
    participants: game.participants?.map(
      ({
        companionMaleId: _companionMaleId,
        companionMaleName: _companionMaleName,
        ...queen
      }) => queen,
    ),
    selectedMaleId: game.phase === "MALE_SELECTED" ? game.selectedMaleId : null,
    boxes: game.boxes.map((box) => {
      const active = game.activeBoxNumber === box.boxNumber;
      const rewardVisible =
        box.isOpened && !(active && game.phase === "SHAKING");
      const maleVisible =
        box.isOpened && !(active && game.phase !== "MALE_SELECTED");
      return {
        ...box,
        rewardId: rewardVisible ? box.rewardId : "",
        assignedMaleId: maleVisible ? box.assignedMaleId : null,
        assignedMaleName: maleVisible ? box.assignedMaleName : null,
      };
    }),
  };
}
export function memberDisplayPayload(state: AppStateData) {
  return {
    confirmedMemberIds: STAFF_MEMBERS.filter(member =>
      state.rsvps[member.id]?.attendanceStatus === "attending"
    ).map(member => member.id),
    avatarVersions: Object.fromEntries(Object.entries(state.avatars || {}).map(([id, avatar]) => [id, avatar.version])),
  };
}
export function statePayload(state: AppStateData, session: Session | null) {
  return {
    rsvps: session?.isAdmin
      ? state.rsvps
      : session && state.rsvps[session.memberId]
        ? { [session.memberId]: state.rsvps[session.memberId] }
        : {},
    ...memberDisplayPayload(state),
    wishes: state.wishes.map(
      ({
        likedBy,
        legacyLikes: _legacyLikes,
        requestId: _requestId,
        ...wish
      }) => ({
        ...wish,
        likes: likedBy?.length ?? 0,
        liked: session ? Boolean(likedBy?.includes(session.memberId)) : false,
      }),
    ),
    gameState: publicGame(state.gameState, Boolean(session?.isAdmin)),
    queens:
      state.gameState.phase === "WAITING" && !session?.isAdmin
        ? []
        : getDynamicQueens(state).map(
            ({
              companionMaleId: _companionMaleId,
              companionMaleName: _companionMaleName,
              ...queen
            }) => queen,
          ),
    serverTime: Date.now(),
  };
}
export function apiError(error: unknown) {
  if (error instanceof ApiError)
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        ...(error.code ? { code: error.code } : {}),
      },
      { status: error.status },
    );
  if (error instanceof SyntaxError)
    return NextResponse.json(
      { ok: false, error: "Dữ liệu yêu cầu không hợp lệ." },
      { status: 400 },
    );
  console.error(
    "Event API storage/action failure:",
    error instanceof Error ? error.message : "Unknown error",
  );
  return NextResponse.json(
    { ok: false, error: "Chưa lưu được dữ liệu. Vui lòng thử lại." },
    { status: 500 },
  );
}
export const noStore = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
};
