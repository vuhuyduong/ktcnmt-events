import { NextRequest, NextResponse } from "next/server";
import {
  apiError,
  ApiError,
  selectIdentity,
  getSession,
  noStore,
  requestBody,
  requireTrustedOrigin,
  setSessionCookie,
} from "@/lib/auth";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  try {
    const session = getSession(req);
    return NextResponse.json(
      {
        memberId: session?.memberId ?? null,
        isAdmin: session?.isAdmin ?? false,
      },
      { headers: noStore },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(req: NextRequest) {
  try {
    requireTrustedOrigin(req);
    const { memberId } = await requestBody(req);
    const session = selectIdentity(memberId);
    const existing = getSession(req);
    if (existing && existing.memberId !== session.memberId)
      throw new ApiError(
        409,
        "Hãy kết thúc phiên hiện tại trước khi chọn thành viên khác.",
      );
    const response = NextResponse.json(session, { headers: noStore });
    setSessionCookie(response, session);
    return response;
  } catch (error) {
    return apiError(error);
  }
}
export async function DELETE(req: NextRequest) {
  try {
    requireTrustedOrigin(req);
    const response = NextResponse.json(
      { memberId: null, isAdmin: false },
      { headers: noStore },
    );
    setSessionCookie(response, null);
    return response;
  } catch (error) {
    return apiError(error);
  }
}
