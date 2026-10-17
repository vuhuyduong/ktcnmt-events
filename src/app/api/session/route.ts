import { NextRequest, NextResponse } from "next/server";
import {
  apiError,
  selectIdentity,
  getSession,
  noStore,
  requestBody,
  requireTrustedOrigin,
  setSessionCookie,
} from "@/lib/auth";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  return NextResponse.json(
    {
      ...getSession(req),
      memberId: getSession(req)?.memberId ?? null,
      isAdmin: getSession(req)?.isAdmin ?? false,
    },
    { headers: noStore },
  );
}
export async function POST(req: NextRequest) {
  try {
    requireTrustedOrigin(req);
    const { memberId } = await requestBody(req);
    const session = selectIdentity(memberId);
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
