import { NextRequest, NextResponse } from "next/server";
import {
  apiError,
  authenticate,
  getSession,
  isAuthConfigured,
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
      configured: isAuthConfigured(),
    },
    { headers: noStore },
  );
}
export async function POST(req: NextRequest) {
  try {
    requireTrustedOrigin(req);
    const { memberId, inviteCode } = await requestBody(req);
    const session = authenticate(memberId, inviteCode);
    const response = NextResponse.json(
      { ...session, configured: true },
      { headers: noStore },
    );
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
      { memberId: null, isAdmin: false, configured: isAuthConfigured() },
      { headers: noStore },
    );
    setSessionCookie(response, null);
    return response;
  } catch (error) {
    return apiError(error);
  }
}
