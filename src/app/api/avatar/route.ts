import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { STAFF_MEMBERS } from "@/data/roster";
import { getState, updateState } from "@/lib/store";
import { ApiError, apiError, assertSessionIdentity, noStore, requireSession, statePayload } from "@/lib/auth";

export const dynamic = "force-dynamic";
const MAX_BYTES = 5 * 1024 * 1024;

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("memberId") || "";
    if (!STAFF_MEMBERS.some(member => member.id === id)) throw new ApiError(404, "Không tìm thấy ảnh.");
    const avatar = getState().avatars?.[id];
    if (!avatar) throw new ApiError(404, "Chưa có ảnh thay thế.");
    return new NextResponse(new Uint8Array(Buffer.from(avatar.data, "base64")), {
      headers: { ...noStore, "Content-Type": "image/webp", "X-Content-Type-Options": "nosniff" },
    });
  } catch (error) { return apiError(error); }
}

export async function POST(req: NextRequest) {
  try {
    const session = requireSession(req);
    const expected = req.headers.get("x-member-id");
    if (!expected) throw new ApiError(400, "Chưa xác định được người đổi ảnh.");
    assertSessionIdentity(session, expected);
    if (Number(req.headers.get("content-length")) > MAX_BYTES) throw new ApiError(413, "Chọn ảnh nhỏ hơn 5 MB nhé.");
    const reader = req.body?.getReader();
    if (!reader) throw new ApiError(400, "Bạn chưa chọn ảnh.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) {
        await reader.cancel();
        throw new ApiError(413, "Chọn ảnh nhỏ hơn 5 MB nhé.");
      }
      chunks.push(value);
    }
    let image: Buffer;
    try {
      const input = Buffer.concat(chunks);
      const metadata = await sharp(input, { limitInputPixels: 25000000 }).metadata();
      if (!["jpeg", "png", "webp"].includes(metadata.format || "")) throw new Error("Unsupported image");
      image = await sharp(input, { limitInputPixels: 25000000 }).rotate()
        .resize(384, 384, { fit: "cover" }).webp({ quality: 85 }).toBuffer();
    } catch {
      throw new ApiError(400, "Ảnh chưa đọc được. Hãy chọn ảnh JPG, PNG hoặc WebP khác nhé.");
    }
    const updated = updateState(draft => {
      draft.avatars ||= {};
      draft.avatars[session.memberId] = { data: image.toString("base64"), version: randomUUID() };
    });
    return NextResponse.json({ ok: true, avatarVersions: statePayload(updated, session).avatarVersions }, { headers: noStore });
  } catch (error) { return apiError(error); }
}
