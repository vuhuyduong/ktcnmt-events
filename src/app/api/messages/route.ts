import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { STAFF_MEMBERS } from "@/data/roster";
import { getState, updateState } from "@/lib/store";
import {
  ApiError,
  assertSessionIdentity,
  apiError,
  noStore,
  requestBody,
  requireSession,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

function inbox(memberId: string) {
  return getState()
    .privateMessages.filter(
      (m) => m.senderId === memberId || m.recipientId === memberId,
    )
    .map(({ requestId: _requestId, ...m }) => m);
}

export async function GET(req: NextRequest) {
  try {
    const session = requireSession(req);
    if (req.nextUrl.searchParams.has("memberId"))
      assertSessionIdentity(session, req.nextUrl.searchParams.get("memberId"));
    return NextResponse.json(
      { messages: inbox(session.memberId) },
      { headers: noStore },
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = requireSession(req);
    const body = await requestBody(req);
    assertSessionIdentity(session, body.memberId);
    if (body.action === "READ") {
      if (!STAFF_MEMBERS.some((m) => m.id === body.senderId))
        throw new ApiError(400, "Người gửi không hợp lệ.");
      const unread = getState().privateMessages.some(
        (m) =>
          m.recipientId === session.memberId &&
          m.senderId === body.senderId &&
          !m.readAt,
      );
      if (unread)
        updateState((draft) => {
          for (const m of draft.privateMessages) {
            if (
              m.recipientId === session.memberId &&
              m.senderId === body.senderId &&
              !m.readAt
            )
              m.readAt = new Date().toISOString();
          }
        });
    } else {
      if (body.action !== undefined && body.action !== "SEND")
        throw new ApiError(400, "Thao tác không hợp lệ.");
      if (body.senderId !== undefined && body.senderId !== session.memberId)
        throw new ApiError(403, "Bạn chỉ có thể nhắn dưới tên của mình.");
      if (
        !STAFF_MEMBERS.some((m) => m.id === body.recipientId) ||
        body.recipientId === session.memberId
      )
        throw new ApiError(400, "Hãy chọn người bạn muốn nhắn.");
      if (
        typeof body.content !== "string" ||
        !body.content.trim() ||
        body.content.length > 2000
      )
        throw new ApiError(400, "Nhập lời nhắn từ 1 đến 2.000 ký tự nhé.");
      if (
        typeof body.requestId !== "string" ||
        !body.requestId ||
        body.requestId.length > 100
      )
        throw new ApiError(400, "Mã lời nhắn không hợp lệ. Hãy thử lại.");
      updateState((draft) => {
        const duplicate = draft.privateMessages.find(
          (m) =>
            m.senderId === session.memberId && m.requestId === body.requestId,
        );
        if (duplicate) {
          if (
            duplicate.recipientId !== body.recipientId ||
            duplicate.content !== (body.content as string).trim()
          )
            throw new ApiError(409, "Lời nhắn đã thay đổi. Vui lòng gửi lại.");
          return;
        }
        draft.privateMessages.push({
          id: randomUUID(),
          senderId: session.memberId,
          recipientId: body.recipientId as string,
          content: (body.content as string).trim(),
          requestId: body.requestId as string,
          createdAt: new Date().toISOString(),
        });
      });
    }
    return NextResponse.json(
      { messages: inbox(session.memberId) },
      { headers: noStore },
    );
  } catch (error) {
    return apiError(error);
  }
}
