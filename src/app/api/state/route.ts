import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  STAFF_MEMBERS,
  MILK_TEA_MENU,
  SUGAR_LEVELS,
  ICE_LEVELS,
  MALE_TRANSPORT_OPTIONS,
  MaleTransportOptionId,
} from "@/data/roster";
import { getState, updateState } from "@/lib/store";
import {
  ApiError,
  apiError,
  getSession,
  noStore,
  requireSession,
  requestBody,
  statePayload,
} from "@/lib/auth";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  try {
    return NextResponse.json(statePayload(getState(), getSession(req)), {
      headers: noStore,
    });
  } catch (error) {
    return apiError(error);
  }
}
function text(value: unknown, max: number) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string" || value.length > max)
    throw new ApiError(400, "Nội dung quá dài hoặc không hợp lệ.");
  return value.trim();
}
function flag(value: unknown, fallback = false) {
  if (value === undefined) return fallback;
  if (typeof value !== "boolean")
    throw new ApiError(400, "Lựa chọn không hợp lệ.");
  return value;
}
export async function POST(req: NextRequest) {
  try {
    const session = requireSession(req);
    const body = await requestBody(req);
    const { action } = body;
    if (
      !["SUBMIT_FEMALE_RSVP", "SUBMIT_MALE_RSVP", "LIKE_WISH"].includes(
        String(action),
      )
    )
      throw new ApiError(400, "Thao tác không hợp lệ.");
    if (body.memberId !== undefined && body.memberId !== session.memberId)
      throw new ApiError(403, "Bạn chỉ có thể lưu lựa chọn của mình.");
    const nowIso = new Date().toISOString();
    const updated = updateState((draft) => {
      if (action === "LIKE_WISH") {
        const target = draft.wishes.find((w) => w.id === body.wishId);
        if (!target) throw new ApiError(404, "Lời chúc không còn tồn tại.");
        if (!target.likedBy) {
          target.legacyLikes = target.likes;
          target.likedBy = [];
        }
        if (!target.likedBy.includes(session.memberId)) {
          target.likedBy.push(session.memberId);
          target.likes = target.likedBy.length;
        }
        return;
      }
      const member = STAFF_MEMBERS.find((m) => m.id === session.memberId)!;
      if (
        member.gender !== (action === "SUBMIT_FEMALE_RSVP" ? "female" : "male")
      )
        throw new ApiError(403, "Biểu mẫu không phù hợp với thành viên.");
      const attendanceValue =
        body.attendanceStatus ??
        (typeof body.attending === "boolean"
          ? body.attending
            ? "attending"
            : "declined"
          : undefined);
      if (!["attending", "declined", "maybe"].includes(String(attendanceValue)))
        throw new ApiError(400, "Vui lòng chọn tình trạng tham dự.");
      const attendanceStatus = attendanceValue as
        | "attending"
        | "declined"
        | "maybe";
      const attending = attendanceStatus === "attending";
      const dietaryNote = text(body.dietaryNote, 500);
      if (member.gender === "female") {
        const wantsDrink = flag(body.wantsDrink, Boolean(body.drinkName));
        draft.rsvps[member.id] = {
          memberId: member.id,
          attending,
          attendanceStatus,
          source: "member-session",
          dietaryNote,
          joinSharedRide1715: attending && flag(body.joinSharedRide1715),
          updatedAt: nowIso,
        };
        if (!wantsDrink) delete draft.milkTeaOrders[member.id];
        else {
          if (
            !MILK_TEA_MENU.some((drink) => drink.name === body.drinkName) ||
            !(SUGAR_LEVELS as readonly string[]).includes(String(body.sugar)) ||
            !(ICE_LEVELS as readonly string[]).includes(String(body.ice))
          )
            throw new ApiError(
              400,
              "Vui lòng chọn đồ uống, đường và đá trong menu.",
            );
          draft.milkTeaOrders[member.id] = {
            memberId: member.id,
            drinkName: String(body.drinkName),
            sugar: String(body.sugar),
            ice: String(body.ice),
            note: text(body.note, 500),
            updatedAt: nowIso,
          };
        }
      } else {
        const hasPlusOne = attending && flag(body.hasPlusOne);
        const transportOption = text(body.transportOption, 40);
        if (
          transportOption &&
          !MALE_TRANSPORT_OPTIONS.some(
            (option) => option.id === transportOption,
          )
        )
          throw new ApiError(400, "Phương tiện không hợp lệ.");
        draft.rsvps[member.id] = {
          memberId: member.id,
          attending,
          attendanceStatus,
          source: "member-session",
          dietaryNote,
          hasPlusOne,
          plusOneName: hasPlusOne ? text(body.plusOneName, 100) : "",
          transportOption:
            attending && transportOption
              ? (transportOption as MaleTransportOptionId)
              : undefined,
          updatedAt: nowIso,
        };
        const content = text(body.wishContent, 2000);
        if (content) {
          const requestId = text(body.requestId, 100);
          if (!requestId)
            throw new ApiError(400, "Thiếu mã gửi lời chúc. Vui lòng thử lại.");
          if (
            !draft.wishes.some(
              (w) => w.authorId === member.id && w.requestId === requestId,
            )
          )
            draft.wishes.unshift({
              id: `wish-${randomUUID()}`,
              authorId: member.id,
              authorName: member.shortName,
              content,
              requestId,
              likes: 0,
              likedBy: [],
              createdAt: nowIso,
            });
        }
      }
    });
    return NextResponse.json(
      { ok: true, ...statePayload(updated, session) },
      { headers: noStore },
    );
  } catch (error) {
    return apiError(error);
  }
}
