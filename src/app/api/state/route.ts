import { NextRequest, NextResponse } from "next/server";
import { STAFF_MEMBERS, MaleTransportOptionId } from "@/data/roster";
import { getSpecialGuestName, getState, updateState } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = getState();
  return NextResponse.json(
    {
      ...state,
      specialGuestName: getSpecialGuestName(state),
      serverTime: Date.now(),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;
    const nowIso = new Date().toISOString();

    const updated = updateState((draft) => {
      if (action === "SUBMIT_FEMALE_RSVP") {
        const {
          memberId,
          joinSharedRide1715 = true,
          drinkName,
          sugar,
          ice,
          note = "",
        } = body;

        const member = STAFF_MEMBERS.find(
          (m) => m.id === memberId && m.gender === "female"
        );
        if (!member) return;

        draft.rsvps[memberId] = {
          memberId,
          attending: true,
          joinSharedRide1715: Boolean(joinSharedRide1715),
          updatedAt: nowIso,
        };

        if (drinkName && sugar && ice) {
          draft.milkTeaOrders[memberId] = {
            memberId,
            drinkName: String(drinkName),
            sugar: String(sugar),
            ice: String(ice),
            note: String(note || "").trim(),
            updatedAt: nowIso,
          };
        }
      } else if (action === "SUBMIT_MALE_RSVP") {
        const {
          memberId,
          hasPlusOne = false,
          plusOneName = "",
          transportOption = "grab",
          wishContent = "",
        } = body;

        const member = STAFF_MEMBERS.find(
          (m) => m.id === memberId && m.gender === "male"
        );
        if (!member) return;

        draft.rsvps[memberId] = {
          memberId,
          attending: true,
          hasPlusOne: Boolean(hasPlusOne),
          plusOneName: hasPlusOne ? String(plusOneName || "").trim() : "",
          transportOption: transportOption as MaleTransportOptionId,
          updatedAt: nowIso,
        };

        const trimmedWish = String(wishContent || "").trim();
        if (trimmedWish) {
          draft.wishes.unshift({
            id: `wish-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            authorId: member.id,
            authorName: member.shortName,
            content: trimmedWish,
            likes: 1,
            createdAt: nowIso,
          });
        }
      } else if (action === "LIKE_WISH") {
        const { wishId } = body;
        const target = draft.wishes.find((w) => w.id === wishId);
        if (target) {
          target.likes += 1;
        }
      }
    });

    return NextResponse.json({
      ok: true,
      ...updated,
      specialGuestName: getSpecialGuestName(updated),
      serverTime: Date.now(),
    });
  } catch (err) {
    console.error("POST /api/state error:", err);
    return NextResponse.json(
      { ok: false, error: "Invalid request payload" },
      { status: 400 }
    );
  }
}
