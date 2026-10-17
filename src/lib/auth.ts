import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { STAFF_MEMBERS } from "@/data/roster";
import { AppStateData, GameState, getDynamicQueens } from "@/lib/store";

const COOKIE = "ktcnmt_session";
const LIFETIME = 60 * 60 * 24 * 7;
export interface Session {
  memberId: string;
  isAdmin: boolean;
}
interface SignedSession extends Session {
  expires: number;
  version: string;
}
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
function config() {
  const secret = process.env.EVENT_SESSION_SECRET;
  if (!secret || secret.length < 32) return null;
  try {
    const codes: unknown = JSON.parse(
      process.env.EVENT_MEMBER_CODES_JSON || "{}",
    );
    if (!codes || typeof codes !== "object" || Array.isArray(codes))
      return null;
    const entries = Object.entries(codes);
    if (
      !entries.length ||
      entries.some(
        ([id, code]) =>
          !STAFF_MEMBERS.some((m) => m.id === id) ||
          typeof code !== "string" ||
          !code.length,
      )
    )
      return null;
    const admin = process.env.EVENT_ADMIN_CODE || "";
    return {
      secret,
      codes: codes as Record<string, string>,
      admin,
      version: createHmac("sha256", secret)
        .update(JSON.stringify(codes) + admin)
        .digest("hex"),
    };
  } catch {
    return null;
  }
}
function equal(a: string, b: string) {
  const left = Buffer.from(a),
    right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
export function isAuthConfigured() {
  return Boolean(config());
}
export function authenticate(memberId: unknown, inviteCode: unknown): Session {
  const setup = config();
  if (!setup)
    throw new ApiError(
      503,
      "Xác thực chưa được cấu hình. Vui lòng liên hệ ban tổ chức.",
    );
  if (
    typeof memberId !== "string" ||
    typeof inviteCode !== "string" ||
    inviteCode.length > 512
  )
    throw new ApiError(401, "Mã mời không hợp lệ.");
  const member = STAFF_MEMBERS.find((m) => m.id === memberId);
  const isAdmin = Boolean(
    member?.isHost && setup.admin && equal(inviteCode, setup.admin),
  );
  if (
    !member ||
    (!isAdmin &&
      (!setup.codes[memberId] || !equal(inviteCode, setup.codes[memberId])))
  )
    throw new ApiError(401, "Mã mời không hợp lệ.");
  return { memberId, isAdmin };
}
export function getSession(req: NextRequest): Session | null {
  const setup = config(),
    raw = req.cookies.get(COOKIE)?.value;
  if (!setup || !raw || raw.length > 2048) return null;
  try {
    const [payload, signature, extra] = raw.split(".");
    if (
      extra ||
      !signature ||
      !equal(
        signature,
        createHmac("sha256", setup.secret).update(payload).digest("base64url"),
      )
    )
      return null;
    const value = JSON.parse(
      Buffer.from(payload, "base64url").toString(),
    ) as SignedSession;
    if (
      !Number.isFinite(value.expires) ||
      value.expires <= Date.now() ||
      value.version !== setup.version ||
      typeof value.isAdmin !== "boolean"
    )
      return null;
    const member = STAFF_MEMBERS.find((m) => m.id === value.memberId);
    if (!member || (value.isAdmin && !member.isHost)) return null;
    return { memberId: value.memberId, isAdmin: value.isAdmin };
  } catch {
    return null;
  }
}
export function setSessionCookie(
  response: NextResponse,
  session: Session | null,
) {
  const setup = config();
  if (session && !setup)
    throw new ApiError(503, "Xác thực chưa được cấu hình.");
  const payload = Buffer.from(
    JSON.stringify({
      ...session,
      expires: Date.now() + LIFETIME * 1000,
      version: setup?.version,
    }),
  ).toString("base64url");
  const value = session
    ? `${payload}.${createHmac("sha256", setup!.secret).update(payload).digest("base64url")}`
    : "";
  response.cookies.set(COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: session ? LIFETIME : 0,
  });
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
  if (!session)
    throw new ApiError(401, "Vui lòng xác thực bằng mã mời của bạn.");
  return session;
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
export function statePayload(state: AppStateData, session: Session | null) {
  return {
    rsvps: session?.isAdmin
      ? state.rsvps
      : session && state.rsvps[session.memberId]
        ? { [session.memberId]: state.rsvps[session.memberId] }
        : {},
    milkTeaOrders: session?.isAdmin
      ? state.milkTeaOrders
      : session && state.milkTeaOrders[session.memberId]
        ? { [session.memberId]: state.milkTeaOrders[session.memberId] }
        : {},
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
      { ok: false, error: error.message },
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
