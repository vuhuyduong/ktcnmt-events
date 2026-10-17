"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import {
  Calendar,
  Car,
  Check,
  CheckCircle2,
  Clock,
  Coffee,
  Crown,
  Gift,
  Heart,
  MapPin,
  MessageSquareHeart,
  PartyPopper,
  Radio,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  Wand2,
  ArrowLeft,
  Dices,
} from "lucide-react";
import MemberAvatar from "@/components/MemberAvatar";
import {
  BLIND_BOX_REWARDS,
  FEMALE_MEMBERS,
  ICE_LEVELS,
  MALE_MEMBERS,
  MALE_TRANSPORT_OPTIONS,
  MILK_TEA_MENU,
  MaleTransportOptionId,
  QUICK_WISH_SUGGESTIONS,
  RESTAURANT_INFO,
  SPECIAL_GUEST_ID,
  STAFF_MEMBERS,
  SUGAR_LEVELS,
  StaffMember,
} from "@/data/roster";
import type {
  BlindBoxSlot,
  GameState,
  MemberRsvp,
  MilkTeaOrder,
  WishItem,
} from "@/lib/store";

type TabType = "personal" | "wall" | "game";

const USER_STORAGE_KEY = "ktcnmt_user_id";

function fireLuxuryConfetti(intensity: "soft" | "grand" = "soft") {
  if (typeof window === "undefined") return;
  try {
    if (intensity === "soft") {
      confetti({
        particleCount: 55,
        spread: 70,
        origin: { y: 0.65 },
        colors: ["#fb7185", "#f472b6", "#fcd34d", "#fda4af", "#fde68a"],
      });
    } else {
      confetti({
        particleCount: 95,
        spread: 90,
        origin: { y: 0.55 },
        colors: ["#fb7185", "#f472b6", "#fbbf24", "#f97316", "#ffffff"],
      });
      setTimeout(() => {
        confetti({
          particleCount: 65,
          angle: 60,
          spread: 60,
          origin: { x: 0.1, y: 0.6 },
          colors: ["#fb7185", "#fcd34d", "#f472b6"],
        });
        confetti({
          particleCount: 65,
          angle: 120,
          spread: 60,
          origin: { x: 0.9, y: 0.6 },
          colors: ["#fb7185", "#fcd34d", "#f472b6"],
        });
      }, 220);
    }
  } catch {
    // Ignore confetti errors in restricted browsers
  }
}

function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    if (diffSec < 60) return "Vừa xong";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Hôm nay";
  }
}

export default function KtcnmtEventApp() {
  // Hydration & Identity State
  const [isHydrated, setIsHydrated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("personal");

  // Server State
  const [rsvps, setRsvps] = useState<Record<string, MemberRsvp>>({});
  const [milkTeaOrders, setMilkTeaOrders] = useState<
    Record<string, MilkTeaOrder>
  >({});
  const [wishes, setWishes] = useState<WishItem[]>([]);
  const [specialGuestName, setSpecialGuestName] =
    useState<string>("Khách Quý Đặc Biệt");
  const [gameState, setGameState] = useState<GameState>({
    isLive: false,
    focusTimestamp: 0,
    phase: "WAITING",
    phaseStartedAt: Date.now(),
    currentQueenId: FEMALE_MEMBERS[0].id,
    activeBoxNumber: null,
    selectedMaleId: null,
    boxes: [],
    updatedAt: Date.now(),
  });

  // Female Form State (Screen 2A)
  const [selectedDrink, setSelectedDrink] = useState<string>(
    MILK_TEA_MENU[0].name
  );
  const [selectedSugar, setSelectedSugar] = useState<string>("50% đường");
  const [selectedIce, setSelectedIce] = useState<string>("Ít đá");
  const [drinkNote, setDrinkNote] = useState<string>("");
  const [joinSharedRide1715, setJoinSharedRide1715] = useState<boolean>(true);
  const [savingFemaleForm, setSavingFemaleForm] = useState<boolean>(false);

  // Male Form State (Screen 2B)
  const [hasPlusOne, setHasPlusOne] = useState<boolean>(false);
  const [plusOneNameInput, setPlusOneNameInput] = useState<string>("");
  const [maleTransport, setMaleTransport] =
    useState<MaleTransportOptionId>("grab");
  const [wishInput, setWishInput] = useState<string>("");
  const [savingMaleForm, setSavingMaleForm] = useState<boolean>(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Refs for Triple-Tap Reset, Auto-Focus & Confetti Deduplication
  const tapTimestampsRef = useRef<number[]>([]);
  const lastFocusTimestampRef = useRef<number>(0);
  const lastRevealedKeyRef = useRef<string>("");
  const lastMaleSelectedKeyRef = useRef<string>("");
  const hasInitializedUserFormRef = useRef<string | null>(null);

  // Roulette Highlight Index during SPINNING_MALE
  const [rouletteIndex, setRouletteIndex] = useState<number>(0);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3400);
  }, []);

  const currentUser: StaffMember | undefined = useMemo(
    () => STAFF_MEMBERS.find((m) => m.id === currentUserId),
    [currentUserId]
  );

  // 1. Auto-Login from localStorage on mount
  useEffect(() => {
    try {
      const savedId = localStorage.getItem(USER_STORAGE_KEY);
      if (savedId && STAFF_MEMBERS.some((m) => m.id === savedId)) {
        setCurrentUserId(savedId);
      }
    } catch {
      // Ignore storage errors
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // 2. Fetch full state (/api/state)
  const fetchAppState = useCallback(async () => {
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.rsvps) setRsvps(data.rsvps);
      if (data.milkTeaOrders) setMilkTeaOrders(data.milkTeaOrders);
      if (Array.isArray(data.wishes)) setWishes(data.wishes);
      if (data.specialGuestName) setSpecialGuestName(data.specialGuestName);
      if (data.gameState) {
        setGameState(data.gameState);
        if (lastFocusTimestampRef.current === 0) {
          lastFocusTimestampRef.current = data.gameState.focusTimestamp || 0;
        }
      }
    } catch {
      // Silent retry on next poll
    }
  }, []);

  // 3. Poll /api/game every 1000ms for real-time 14-phone synchronization
  const pollGameState = useCallback(async () => {
    try {
      const res = await fetch("/api/game", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.specialGuestName) setSpecialGuestName(data.specialGuestName);
      if (data.rsvps) setRsvps(data.rsvps);
      if (data.gameState) {
        const nextGame: GameState = data.gameState;
        setGameState(nextGame);

        // Auto-Focus all 14 phones to Tab 3 (Mini-Game) when Host broadcasts START_LIVE
        if (
          nextGame.isLive &&
          nextGame.focusTimestamp > 0 &&
          nextGame.focusTimestamp > lastFocusTimestampRef.current
        ) {
          lastFocusTimestampRef.current = nextGame.focusTimestamp;
          setActiveTab("game");
          showToast("🚀 Sân khấu Xé Túi Mù Nữ Hoàng đang phát sóng trực tiếp!");
        }
      }
    } catch {
      // Ignore transient network errors
    }
  }, [showToast]);

  useEffect(() => {
    fetchAppState();
    const gameInterval = setInterval(pollGameState, 1000);
    const fullStateInterval = setInterval(fetchAppState, 4000);
    return () => {
      clearInterval(gameInterval);
      clearInterval(fullStateInterval);
    };
  }, [fetchAppState, pollGameState]);

  // Populate user's existing RSVP & Milk Tea form values when switching user
  useEffect(() => {
    if (!currentUser) {
      hasInitializedUserFormRef.current = null;
      return;
    }
    if (hasInitializedUserFormRef.current === currentUser.id) return;

    const existingRsvp = rsvps[currentUser.id];
    const existingOrder = milkTeaOrders[currentUser.id];

    if (currentUser.gender === "female") {
      setJoinSharedRide1715(existingRsvp?.joinSharedRide1715 ?? true);
      if (existingOrder) {
        setSelectedDrink(existingOrder.drinkName);
        setSelectedSugar(existingOrder.sugar);
        setSelectedIce(existingOrder.ice);
        setDrinkNote(existingOrder.note || "");
      } else {
        setSelectedDrink(MILK_TEA_MENU[0].name);
        setSelectedSugar("50% đường");
        setSelectedIce("Ít đá");
        setDrinkNote("");
      }
    } else {
      setHasPlusOne(Boolean(existingRsvp?.hasPlusOne));
      setPlusOneNameInput(existingRsvp?.plusOneName || "");
      setMaleTransport(existingRsvp?.transportOption || "grab");
    }

    hasInitializedUserFormRef.current = currentUser.id;
  }, [currentUser, rsvps, milkTeaOrders]);

  // Fire gentle confetti when a Queen enters Screen 2A
  useEffect(() => {
    if (
      isHydrated &&
      currentUser?.gender === "female" &&
      activeTab === "personal"
    ) {
      fireLuxuryConfetti("soft");
    }
  }, [isHydrated, currentUser, activeTab]);

  // Fire synchronized confetti across all 14 phones when phase transitions to REVEALED or MALE_SELECTED
  useEffect(() => {
    if (
      gameState.phase === "REVEALED" &&
      gameState.activeBoxNumber !== null
    ) {
      const revealKey = `${gameState.activeBoxNumber}-${gameState.phaseStartedAt}`;
      if (lastRevealedKeyRef.current !== revealKey) {
        lastRevealedKeyRef.current = revealKey;
        fireLuxuryConfetti("grand");
      }
    } else if (
      gameState.phase === "MALE_SELECTED" &&
      gameState.selectedMaleId
    ) {
      const maleKey = `${gameState.activeBoxNumber}-${gameState.selectedMaleId}-${gameState.phaseStartedAt}`;
      if (lastMaleSelectedKeyRef.current !== maleKey) {
        lastMaleSelectedKeyRef.current = maleKey;
        fireLuxuryConfetti("grand");
      }
    }
  }, [
    gameState.phase,
    gameState.activeBoxNumber,
    gameState.selectedMaleId,
    gameState.phaseStartedAt,
  ]);

  // Roulette spotlight animation during SPINNING_MALE (2.5 seconds)
  useEffect(() => {
    if (gameState.phase !== "SPINNING_MALE") return;
    const timer = setInterval(() => {
      setRouletteIndex((prev) => (prev + 1) % MALE_MEMBERS.length);
    }, 105);
    return () => clearInterval(timer);
  }, [gameState.phase]);

  // Handle selecting an Avatar on Screen 1 (Welcome)
  const handleSelectProfile = (member: StaffMember) => {
    try {
      localStorage.setItem(USER_STORAGE_KEY, member.id);
    } catch {
      // Ignore storage error
    }
    hasInitializedUserFormRef.current = null;
    setCurrentUserId(member.id);
    setActiveTab("personal");
  };

  // Hidden Triple-Tap Gesture on Top-Right Header Avatar (<= 800ms)
  const handleTopRightAvatarTripleTap = () => {
    const now = Date.now();
    const recentTaps = tapTimestampsRef.current.filter((t) => now - t <= 800);
    recentTaps.push(now);
    tapTimestampsRef.current = recentTaps;

    if (recentTaps.length >= 3) {
      tapTimestampsRef.current = [];
      try {
        localStorage.removeItem(USER_STORAGE_KEY);
      } catch {
        // Ignore storage error
      }
      hasInitializedUserFormRef.current = null;
      setCurrentUserId(null);
      showToast("✨ Đã chuyển về màn hình chọn thành viên");
    }
  };

  // Submit Female RSVP + Milk Tea Order (Screen 2A)
  const handleSubmitFemaleForm = async () => {
    if (!currentUser || savingFemaleForm) return;
    setSavingFemaleForm(true);
    try {
      const res = await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SUBMIT_FEMALE_RSVP",
          memberId: currentUser.id,
          joinSharedRide1715,
          drinkName: selectedDrink,
          sugar: selectedSugar,
          ice: selectedIce,
          note: drinkNote,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.rsvps) setRsvps(data.rsvps);
        if (data.milkTeaOrders) setMilkTeaOrders(data.milkTeaOrders);
        fireLuxuryConfetti("soft");
        showToast(
          `🌸 Đã lưu xác nhận tham dự & Order trà sữa của ${currentUser.shortName}!`
        );
      }
    } finally {
      setSavingFemaleForm(false);
    }
  };

  // Submit Male RSVP + Plus-One + Transport + Wish (Screen 2B)
  const handleSubmitMaleForm = async () => {
    if (!currentUser || savingMaleForm) return;
    setSavingMaleForm(true);
    try {
      const res = await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SUBMIT_MALE_RSVP",
          memberId: currentUser.id,
          hasPlusOne,
          plusOneName: hasPlusOne ? plusOneNameInput.trim() : "",
          transportOption: maleTransport,
          wishContent: wishInput.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.rsvps) setRsvps(data.rsvps);
        if (Array.isArray(data.wishes)) setWishes(data.wishes);
        if (data.specialGuestName) setSpecialGuestName(data.specialGuestName);
        if (wishInput.trim()) {
          setWishInput("");
        }
        fireLuxuryConfetti("soft");
        showToast(
          `🥂 Đã xác nhận tham dự${
            wishInput.trim() ? " & đăng lời chúc lên tường KTCNMT" : ""
          }!`
        );
      }
    } finally {
      setSavingMaleForm(false);
    }
  };

  // Like a wish on Live Wall (Screen 3)
  const handleLikeWish = async (wishId: string) => {
    // Optimistic UI update
    setWishes((prev) =>
      prev.map((w) => (w.id === wishId ? { ...w, likes: w.likes + 1 } : w))
    );
    try {
      await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "LIKE_WISH", wishId }),
      });
    } catch {
      // Ignore error
    }
  };

  // Trigger Game API Actions (Screen 4)
  const sendGameAction = async (payload: Record<string, unknown>) => {
    try {
      const res = await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.gameState) {
          setGameState(data.gameState);
          if (payload.action === "START_LIVE") {
            lastFocusTimestampRef.current = data.gameState.focusTimestamp;
          }
        }
        if (data.specialGuestName) setSpecialGuestName(data.specialGuestName);
      }
    } catch {
      // Ignore error
    }
  };

  // Computed metrics for Live Wall (Screen 3)
  const stats = useMemo(() => {
    const attendingMembers = Object.values(rsvps).filter((r) => r.attending);
    const plusOneCount = attendingMembers.filter((r) => r.hasPlusOne).length;
    const totalAttendees = attendingMembers.length + plusOneCount;
    const orderedTeaCount = FEMALE_MEMBERS.filter((f) =>
      Boolean(milkTeaOrders[f.id]?.drinkName)
    ).length;
    const totalWishes = wishes.length;
    return {
      attendingMembersCount: attendingMembers.length,
      plusOneCount,
      totalAttendees,
      orderedTeaCount,
      totalWishes,
    };
  }, [rsvps, milkTeaOrders, wishes]);

  // 06 Queens list for Mini-Game (05 Female Members + 01 Special Guest)
  const gameQueens = useMemo(
    () => [
      ...FEMALE_MEMBERS.map((f) => ({
        id: f.id,
        shortName: f.shortName,
        fullName: f.fullName,
      })),
      {
        id: SPECIAL_GUEST_ID,
        shortName: specialGuestName,
        fullName: specialGuestName,
      },
    ],
    [specialGuestName]
  );

  const currentQueenObj = useMemo(
    () =>
      gameQueens.find((q) => q.id === gameState.currentQueenId) || gameQueens[0],
    [gameQueens, gameState.currentQueenId]
  );

  const activeBoxObj: BlindBoxSlot | undefined = useMemo(
    () =>
      gameState.boxes.find((b) => b.boxNumber === gameState.activeBoxNumber),
    [gameState.boxes, gameState.activeBoxNumber]
  );

  const activeRewardObj = useMemo(
    () =>
      activeBoxObj
        ? BLIND_BOX_REWARDS.find((r) => r.id === activeBoxObj.rewardId) ||
          BLIND_BOX_REWARDS[0]
        : null,
    [activeBoxObj]
  );

  const selectedMaleObj = useMemo(
    () => MALE_MEMBERS.find((m) => m.id === gameState.selectedMaleId) || null,
    [gameState.selectedMaleId]
  );

  const canInteractWithStage = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.isHost) return true;
    if (currentUser.id === gameState.currentQueenId) return true;
    if (
      gameState.currentQueenId === SPECIAL_GUEST_ID &&
      rsvps[currentUser.id]?.hasPlusOne
    ) {
      return true;
    }
    return false;
  }, [currentUser, gameState.currentQueenId, rsvps]);

  // Prevent screen flicker before localStorage hydration completes
  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-rose-950/90 to-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-2 border-rose-400/40 border-t-rose-400 animate-spin" />
          <p className="text-xs tracking-widest uppercase text-rose-200/70">
            KTCNMT • 20/10/2026
          </p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // MÀN HÌNH 1: WELCOME AVATAR PICKER (NETFLIX-STYLE PROFILE GRID)
  // ============================================================================
  if (!currentUser) {
    const topRowQueens = FEMALE_MEMBERS.slice(0, 2);
    const bottomRowQueens = FEMALE_MEMBERS.slice(2, 5);

    return (
      <main className="min-h-screen w-full max-w-md mx-auto px-4 py-6 flex flex-col justify-between relative overflow-hidden">
        {/* Decorative ambient glow */}
        <div className="pointer-events-none fixed -top-24 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-rose-500/20 blur-3xl" />
        <div className="pointer-events-none fixed bottom-0 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="space-y-5 relative z-10">
          {/* Top Event Header */}
          <div className="text-center space-y-2 pt-1">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-rose-300/30 text-xs font-medium text-rose-200 shadow-lg">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>PHÒNG KTCNMT • ACV • 19–20/10/2026</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-rose-200 via-pink-100 to-amber-200 bg-clip-text text-transparent">
              Happy Vietnamese Women&apos;s Day
            </h1>
            <p className="text-sm text-rose-100/85 leading-relaxed px-2">
              Chào mừng đại gia đình KTCNMT! Chạm vào ảnh của bạn để mở thiệp
              20/10
            </p>
          </div>

          {/* Khu vực 1: 🌸 05 Bông Hoa KTCNMT (Spotlight Section: 2 trên, 3 dưới căn giữa) */}
          <section className="relative rounded-2xl p-4 bg-gradient-to-b from-rose-500/15 via-white/10 to-amber-500/10 backdrop-blur-md border border-rose-300/35 shadow-[0_0_30px_rgba(244,63,94,0.18)]">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-1.5">
                <span className="text-base">🌸</span>
                <h2 className="text-sm font-bold tracking-wide uppercase bg-gradient-to-r from-rose-300 via-pink-200 to-amber-200 bg-clip-text text-transparent">
                  05 Bông Hoa KTCNMT
                </h2>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-500/25 border border-rose-300/30 text-rose-200 font-medium">
                Queens Spotlight
              </span>
            </div>

            {/* Hàng trên: 2 người căn giữa */}
            <div className="flex justify-center gap-7 mb-4">
              {topRowQueens.map((member) => {
                const isCheckedIn = Boolean(rsvps[member.id]?.attending);
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => handleSelectProfile(member)}
                    className="group flex flex-col items-center gap-2 min-h-[44px] active:scale-95 transition-all focus:outline-none"
                  >
                    <MemberAvatar
                      id={member.id}
                      name={member.shortName}
                      fullName={member.fullName}
                      gender="female"
                      size="xl"
                      checkedIn={isCheckedIn}
                      className="group-hover:scale-105 transition-transform duration-200"
                    />
                    <span className="text-xs font-semibold text-rose-100 group-hover:text-amber-200 transition-colors">
                      {member.shortName}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Hàng dưới: 3 người căn giữa */}
            <div className="flex justify-center gap-5">
              {bottomRowQueens.map((member) => {
                const isCheckedIn = Boolean(rsvps[member.id]?.attending);
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => handleSelectProfile(member)}
                    className="group flex flex-col items-center gap-2 min-h-[44px] active:scale-95 transition-all focus:outline-none"
                  >
                    <MemberAvatar
                      id={member.id}
                      name={member.shortName}
                      fullName={member.fullName}
                      gender="female"
                      size="xl"
                      checkedIn={isCheckedIn}
                      className="group-hover:scale-105 transition-transform duration-200"
                    />
                    <span className="text-xs font-semibold text-rose-100 group-hover:text-amber-200 transition-colors">
                      {member.shortName}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Khu vực 2: 🥂 08 Anh Em KTCNMT (Gentlemen Section: Lưới 4 cột x 2 hàng) */}
          <section className="rounded-2xl p-4 bg-white/10 backdrop-blur-md border border-white/15 shadow-xl">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-1.5">
                <span className="text-base">🥂</span>
                <h2 className="text-sm font-bold tracking-wide uppercase bg-gradient-to-r from-amber-300 to-orange-200 bg-clip-text text-transparent">
                  08 Anh Em KTCNMT
                </h2>
              </div>
              <span className="text-[11px] text-slate-300/80">
                Chạm để điểm danh & gửi lời chúc
              </span>
            </div>

            <div className="grid grid-cols-4 gap-x-2 gap-y-4">
              {MALE_MEMBERS.map((member) => {
                const isCheckedIn = Boolean(rsvps[member.id]?.attending);
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => handleSelectProfile(member)}
                    className="group flex flex-col items-center gap-1.5 min-h-[44px] active:scale-95 transition-all focus:outline-none"
                  >
                    <MemberAvatar
                      id={member.id}
                      name={member.shortName}
                      fullName={member.fullName}
                      gender="male"
                      size="lg"
                      checkedIn={isCheckedIn}
                      className="group-hover:scale-105 transition-transform duration-200"
                    />
                    <span className="text-[11px] font-medium text-slate-200 group-hover:text-amber-200 text-center leading-tight">
                      {member.shortName}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* Footer note */}
        <footer className="pt-5 pb-2 text-center text-[11px] text-slate-400">
          <span>
            ✓ Dấu tích xanh góc ảnh hiển thị thành viên đã xác nhận tham dự
          </span>
        </footer>
      </main>
    );
  }

  // ============================================================================
  // KHUNG GIAO DIỆN CHUNG (GLOBAL SHELL) KHI ĐÃ CHỌN AVATAR
  // ============================================================================
  return (
    <div className="min-h-screen w-full max-w-md mx-auto flex flex-col relative pb-24">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm px-4 py-3 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-rose-400/40 shadow-[0_10px_30px_rgba(0,0,0,0.6)] flex items-center gap-2.5 text-xs font-medium text-rose-100 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* STICKY TOP HEADER */}
      <header className="sticky top-0 z-40 px-4 py-2.5 bg-slate-950/80 backdrop-blur-xl border-b border-white/10 flex items-center justify-between">
        {/* Trái: Huy hiệu ✨ KTCNMT • 20/10 + chấm tròn xanh lá nhấp nháy */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15">
            <span className="text-xs font-bold bg-gradient-to-r from-rose-300 via-pink-200 to-amber-200 bg-clip-text text-transparent">
              ✨ KTCNMT • 20/10
            </span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          </div>
        </div>

        {/* Phải: Cụm Avatar tròn nhỏ (36x36px) + shortName (Triple-Tap Reset ẩn tại đây) */}
        <div
          onClick={handleTopRightAvatarTripleTap}
          role="button"
          tabIndex={0}
          aria-label={`Tài khoản ${currentUser.shortName}`}
          className="flex items-center gap-2 pl-2.5 pr-1.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer select-none active:scale-95 transition-all min-h-[44px]"
        >
          <span className="text-xs font-semibold text-slate-100">
            {currentUser.shortName}
          </span>
          <MemberAvatar
            id={currentUser.id}
            name={currentUser.shortName}
            fullName={currentUser.fullName}
            gender={currentUser.gender}
            size="sm"
            checkedIn={Boolean(rsvps[currentUser.id]?.attending)}
          />
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 px-4 pt-4 space-y-4">
        {/* ====================================================================
            TAB 1: MÀN HÌNH 2A (QUEEN'S PORTAL - DÀNH RIÊNG CHO 05 BẠN NỮ)
           ==================================================================== */}
        {activeTab === "personal" && currentUser.gender === "female" && (
          <div className="space-y-4">
            {/* Thẻ 1: Thiệp Chúc Mừng VIP Cá Nhân Hóa */}
            <section className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-rose-500/20 via-white/10 to-amber-500/15 backdrop-blur-md border border-rose-300/35 shadow-xl">
              <div className="pointer-events-none absolute -right-10 -top-10 w-36 h-36 rounded-full bg-rose-400/20 blur-2xl" />

              <div className="flex flex-col items-center text-center space-y-3 relative z-10">
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-rose-500/25 border border-rose-300/30 text-[11px] font-semibold text-rose-200">
                  <Crown className="w-3.5 h-3.5 text-amber-300" />
                  <span>THIỆP VIP DÀNH RIÊNG CHO BẠN</span>
                </div>

                <MemberAvatar
                  id={currentUser.id}
                  name={currentUser.shortName}
                  fullName={currentUser.fullName}
                  gender="female"
                  size="2xl"
                  highlight
                  checkedIn={Boolean(rsvps[currentUser.id]?.attending)}
                />

                <div>
                  <h2 className="text-xl font-extrabold bg-gradient-to-r from-rose-200 via-pink-100 to-amber-200 bg-clip-text text-transparent">
                    Thân gửi {currentUser.shortName} 🌸
                  </h2>
                  <p className="text-xs text-rose-200/75 mt-0.5">
                    {currentUser.fullName} • Kỷ niệm 20/10/2026
                  </p>
                </div>

                <div className="w-full rounded-xl p-4 bg-slate-950/45 border border-rose-200/20 shadow-inner">
                  <p className="text-sm italic leading-relaxed text-rose-50/95">
                    &ldquo;{currentUser.wish}&rdquo;
                  </p>
                  <p className="text-right text-[11px] font-semibold text-amber-300/90 mt-2">
                    — Từ 08 Anh Em KTCNMT với tất cả sự trân quý 🥂
                  </p>
                </div>
              </div>
            </section>

            {/* Thẻ 2: Lịch Trình & Nhắc Khéo Trang Phục Ngày 19/10 */}
            <section className="rounded-2xl p-4 bg-white/10 backdrop-blur-md border border-white/15 shadow-xl space-y-3.5">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-rose-300" />
                <h3 className="text-sm font-bold uppercase tracking-wide text-rose-200">
                  Lịch Trình & Nhắc Khéo Ngày 19/10
                </h3>
              </div>

              <div className="space-y-3 relative before:absolute before:left-[15px] before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-rose-400 before:via-amber-300 before:to-emerald-400">
                {/* Mốc 1: 08:00 */}
                <div className="relative pl-9">
                  <span className="absolute left-2 top-1 w-3 h-3 rounded-full bg-rose-400 ring-4 ring-rose-400/20" />
                  <div className="rounded-xl p-3 bg-white/5 border border-white/10">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-300">
                      <Clock className="w-3.5 h-3.5" />
                      <span>08:00 | Thứ Hai 19/10</span>
                    </div>
                    <p className="text-xs text-slate-200 mt-1">
                      Tham gia cuộc họp tại Tổng công ty ACV.
                    </p>
                  </div>
                </div>

                {/* Mốc 2: 16:45 - Giờ Biến Hình */}
                <div className="relative pl-9">
                  <span className="absolute left-2 top-1 w-3 h-3 rounded-full bg-amber-300 ring-4 ring-amber-400/30 animate-pulse" />
                  <div className="rounded-xl p-3.5 bg-gradient-to-r from-amber-500/25 via-amber-400/15 to-rose-500/20 border border-amber-300/45 shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-amber-200">
                        16:45 | Giờ Biến Hình 👗
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/25 text-amber-100 font-semibold">
                        Nhắc nhở thân thiện
                      </span>
                    </div>
                    <p className="text-xs text-amber-50/95 leading-relaxed mt-1.5">
                      Sau ngày họp ở ACV, cả phòng sẽ đi thẳng tới nhà hàng. Bạn
                      nhớ mang theo một bộ váy/trang phục đi tiệc thật xinh để
                      thay lúc 16h45 lên hình cho lung linh nhé!
                    </p>
                  </div>
                </div>

                {/* Mốc 3: 18:00 - Tiệc Tối & Trao Hoa */}
                <div className="relative pl-9">
                  <span className="absolute left-2 top-1 w-3 h-3 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20" />
                  <div className="rounded-xl p-3 bg-white/5 border border-white/10 space-y-2.5">
                    <div>
                      <div className="text-xs font-bold text-emerald-300">
                        18:00 | Tiệc Tối & Trao Hoa
                      </div>
                      <p className="text-xs font-semibold text-white mt-0.5">
                        Nhà hàng {RESTAURANT_INFO.name}
                      </p>
                      <p className="text-[11px] text-slate-300">
                        {RESTAURANT_INFO.address}
                      </p>
                    </div>
                    <a
                      href={RESTAURANT_INFO.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 w-full min-h-[44px] px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-xs font-semibold text-amber-200 active:scale-95 transition-all"
                    >
                      <MapPin className="w-4 h-4 text-rose-400" />
                      <span>Mở Google Maps chỉ đường tới The Gangs</span>
                    </a>
                  </div>
                </div>
              </div>
            </section>

            {/* Thẻ 3: Trạm Pre-Order Trà Sữa Sáng 20/10 */}
            <section className="rounded-2xl p-4 bg-white/10 backdrop-blur-md border border-white/15 shadow-xl space-y-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Coffee className="w-4 h-4 text-amber-300" />
                  <h3 className="text-sm font-bold uppercase tracking-wide text-amber-200">
                    Trạm Pre-Order Trà Sữa Sáng 20/10
                  </h3>
                </div>
                <p className="text-xs text-rose-100/85 leading-relaxed">
                  🧋 Đặc quyền Sáng Chính Lễ 20/10: Chọn sẵn món yêu thích để
                  sáng Thứ Ba (20/10) trà sữa chờ sẵn trên bàn làm việc của bạn
                </p>
              </div>

              {/* Chọn món trà sữa */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-200 block">
                  1. Chọn vị trà yêu thích:
                </label>
                <div className="space-y-2">
                  {MILK_TEA_MENU.map((item) => {
                    const isSelected = selectedDrink === item.name;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedDrink(item.name)}
                        className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border text-left flex items-center justify-between gap-2 active:scale-95 transition-all ${
                          isSelected
                            ? "bg-gradient-to-r from-rose-500/35 to-amber-500/25 border-rose-300/60 shadow-[0_0_15px_rgba(244,63,94,0.25)]"
                            : "bg-white/5 border-white/10 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">{item.icon}</span>
                          <div>
                            <p className="text-xs font-semibold text-white">
                              {item.name}
                            </p>
                            <span className="text-[10px] text-amber-200/85">
                              {item.tag}
                            </span>
                          </div>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                            isSelected
                              ? "bg-rose-500 border-rose-300 text-white"
                              : "border-white/25"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Chọn mức đường */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-200 block">
                  2. Chọn mức đường:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SUGAR_LEVELS.map((sugar) => {
                    const active = selectedSugar === sugar;
                    return (
                      <button
                        key={sugar}
                        type="button"
                        onClick={() => setSelectedSugar(sugar)}
                        className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold border active:scale-95 transition-all ${
                          active
                            ? "bg-rose-500/35 border-rose-300 text-white shadow-sm"
                            : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                        }`}
                      >
                        {sugar}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Chọn mức đá */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-200 block">
                  3. Chọn mức đá:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ICE_LEVELS.map((ice) => {
                    const active = selectedIce === ice;
                    return (
                      <button
                        key={ice}
                        type="button"
                        onClick={() => setSelectedIce(ice)}
                        className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold border active:scale-95 transition-all ${
                          active
                            ? "bg-amber-500/35 border-amber-300 text-white shadow-sm"
                            : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                        }`}
                      >
                        {ice}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ghi chú thêm */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200 block">
                  4. Ghi chú thêm (tùy chọn):
                </label>
                <input
                  type="text"
                  value={drinkNote}
                  onChange={(e) => setDrinkNote(e.target.value)}
                  placeholder="VD: Thêm trân châu trắng, không lấy kem cheese..."
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-950/60 border border-white/15 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-rose-400"
                />
              </div>
            </section>

            {/* Thẻ 4: Ghép Xe Lúc 17h15 & Xác Nhận */}
            <section className="rounded-2xl p-4 bg-white/10 backdrop-blur-md border border-white/15 shadow-xl space-y-4">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={joinSharedRide1715}
                  onChange={(e) => setJoinSharedRide1715(e.target.checked)}
                  className="mt-0.5 w-5 h-5 rounded accent-rose-500 shrink-0"
                />
                <span className="text-xs text-slate-100 leading-relaxed">
                  🚗 Đăng ký đi cùng xe (Ô tô / GrabCar chung) của phòng từ cơ
                  quan ra nhà hàng lúc 17h15 chiều 19/10
                </span>
              </label>

              <button
                type="button"
                disabled={savingFemaleForm}
                onClick={handleSubmitFemaleForm}
                className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-amber-400 text-slate-950 font-extrabold text-sm shadow-[0_0_25px_rgba(244,63,94,0.45)] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {savingFemaleForm
                    ? "Đang lưu..."
                    : "🌸 Xác Nhận Tham Dự & Lưu Order Trà Sữa"}
                </span>
              </button>

              {milkTeaOrders[currentUser.id] && (
                <div className="rounded-xl p-3 bg-emerald-500/15 border border-emerald-400/30 flex items-center gap-2 text-xs text-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Đã chốt: <strong>{milkTeaOrders[currentUser.id].drinkName}</strong> (
                    {milkTeaOrders[currentUser.id].sugar},{" "}
                    {milkTeaOrders[currentUser.id].ice})
                  </span>
                </div>
              )}
            </section>
          </div>
        )}

        {/* ====================================================================
            TAB 1: MÀN HÌNH 2B (GENTLEMAN'S HUB - DÀNH RIÊNG CHO 08 ANH EM NAM)
           ==================================================================== */}
        {activeTab === "personal" && currentUser.gender === "male" && (
          <div className="space-y-4">
            {/* Banner chào anh em */}
            <div className="rounded-2xl p-4 bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-slate-900/60 backdrop-blur-md border border-amber-400/30 flex items-center gap-3.5 shadow-xl">
              <MemberAvatar
                id={currentUser.id}
                name={currentUser.shortName}
                fullName={currentUser.fullName}
                gender="male"
                size="lg"
                checkedIn={Boolean(rsvps[currentUser.id]?.attending)}
              />
              <div>
                <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>BAN TỔ CHỨC NAM KTCNMT</span>
                </div>
                <h2 className="text-base font-extrabold text-white">
                  Xin chào {currentUser.shortName}! 🥂
                </h2>
                <p className="text-xs text-slate-300">
                  Cùng chuẩn bị một mùa 20/10 thật chu đáo cho chị em phòng mình
                </p>
              </div>
            </div>

            {/* Thẻ 1: Điểm Danh & Đăng Ký Khách Quý Đi Cùng (+1) */}
            <section className="rounded-2xl p-4 bg-white/10 backdrop-blur-md border border-white/15 shadow-xl space-y-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-amber-200">
                    1. Điểm Danh & Khách Quý Đi Cùng (+1)
                  </h3>
                  <p className="text-xs text-slate-300">
                    Tôi có dẫn theo Vợ / Bạn gái tham dự cùng (+1 Khách quý)
                  </p>
                </div>

                {/* Toggle Switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={hasPlusOne}
                  onClick={() => setHasPlusOne((prev) => !prev)}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out min-h-[44px] items-center ${
                    hasPlusOne ? "bg-amber-400" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-slate-950 shadow ring-0 transition duration-200 ease-in-out ${
                      hasPlusOne ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              {hasPlusOne && (
                <div className="rounded-xl p-3 bg-amber-500/15 border border-amber-300/35 space-y-2">
                  <label className="text-xs font-semibold text-amber-100 block">
                    Nhập Tên gọi thân mật của Vợ / Bạn gái (cập nhật vào Hộp Túi
                    Mù #6 & chuẩn bị hoa):
                  </label>
                  <input
                    type="text"
                    value={plusOneNameInput}
                    onChange={(e) => setPlusOneNameInput(e.target.value)}
                    placeholder="Ví dụ: Chị Hương / Bà xã..."
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-950/70 border border-amber-300/40 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-300"
                  />
                </div>
              )}
            </section>

            {/* Thẻ 2: Đăng Ký Hỗ Trợ Di Chuyển Lúc 17h15 (Ngày 19/10) */}
            <section className="rounded-2xl p-4 bg-white/10 backdrop-blur-md border border-white/15 shadow-xl space-y-3">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-amber-300" />
                <h3 className="text-sm font-bold text-amber-200">
                  2. Đăng Ký Hỗ Trợ Di Chuyển Lúc 17h15 (19/10)
                </h3>
              </div>

              <div className="space-y-2">
                {MALE_TRANSPORT_OPTIONS.map((option) => {
                  const isSelected = maleTransport === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setMaleTransport(option.id)}
                      className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border text-left text-xs font-medium flex items-center justify-between gap-2 active:scale-95 transition-all ${
                        isSelected
                          ? "bg-amber-500/30 border-amber-300 text-white shadow-sm"
                          : "bg-white/5 border-white/10 text-slate-200 hover:bg-white/10"
                      }`}
                    >
                      <span className="leading-relaxed">{option.label}</span>
                      <span
                        className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center border ${
                          isSelected
                            ? "bg-amber-400 border-amber-200 text-slate-950"
                            : "border-white/25"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Thẻ 3: Gửi Lời Chúc Lên Tường KTCNMT */}
            <section className="rounded-2xl p-4 bg-white/10 backdrop-blur-md border border-white/15 shadow-xl space-y-3.5">
              <div className="flex items-center gap-2">
                <MessageSquareHeart className="w-4 h-4 text-rose-300" />
                <h3 className="text-sm font-bold text-amber-200">
                  3. Gửi Lời Chúc Lên Tường KTCNMT
                </h3>
              </div>

              {/* 3 nút Gợi ý lời chúc nhanh */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-300 flex items-center gap-1">
                  <Wand2 className="w-3 h-3 text-amber-300" />
                  Gợi ý lời chúc nhanh (Chạm 1 lần để điền):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_WISH_SUGGESTIONS.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setWishInput(item.text)}
                      className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-300/30 text-[11px] font-medium text-rose-100 active:scale-95 transition-all"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                rows={3}
                value={wishInput}
                onChange={(e) => setWishInput(e.target.value)}
                placeholder="Nhập lời chúc gửi tới 05 bông hoa KTCNMT và chị khách quý..."
                className="w-full p-3 rounded-xl bg-slate-950/60 border border-white/15 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-300 leading-relaxed"
              />

              <button
                type="button"
                disabled={savingMaleForm}
                onClick={handleSubmitMaleForm}
                className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 text-slate-950 font-extrabold text-sm shadow-[0_0_25px_rgba(251,191,36,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Send className="w-4 h-4" />
                <span>
                  {savingMaleForm
                    ? "Đang gửi..."
                    : "🥂 Xác Nhận Tham Dự & Gửi Lời Chúc"}
                </span>
              </button>
            </section>

            {/* Thẻ 4: Bảng Tin Hậu Cần Nội Bộ (Chỉ hiển thị khi gender === "male") */}
            <section className="rounded-2xl p-4 bg-slate-900/85 backdrop-blur-md border border-amber-400/35 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-300" />
                  <h3 className="text-sm font-bold uppercase tracking-wide text-amber-300">
                    Bảng Tin Hậu Cần Nội Bộ (Anh Em Nam)
                  </h3>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-300/30 font-semibold">
                  Internal Only
                </span>
              </div>

              <ul className="space-y-2 text-xs text-slate-200 bg-white/5 p-3.5 rounded-xl border border-white/10">
                <li className="flex items-start gap-2">
                  <span className="text-amber-300 font-bold">•</span>
                  <span>
                    <strong>Tối 19/10 (18h00):</strong> Tặng{" "}
                    <strong>06 phần hoa tươi</strong> ngay đầu bữa tiệc (5 bạn
                    nữ + 1 chị vợ đi cùng) trước khi dùng bữa để chị em chụp ảnh
                    đẹp nhất.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-300 font-bold">•</span>
                  <span>
                    <strong>Sáng 20/10 (09h00):</strong> Đặt{" "}
                    <strong>05 ly trà sữa</strong> trao tận bàn làm việc theo
                    danh sách Realtime bên dưới.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-300 font-bold">•</span>
                  <span>
                    <strong>Dự toán đóng góp chia đều 08 anh em:</strong>{" "}
                    <span className="text-amber-300 font-bold">
                      ~1.750.000 – 2.000.000 VNĐ/người
                    </span>
                    .
                  </span>
                </li>
              </ul>

              {/* Bảng tổng hợp Realtime Đơn Trà Sữa 20/10 của 05 bạn nữ */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-rose-200 flex items-center gap-1.5">
                    <span>🧋</span>
                    <span>Bảng Tổng Hợp Đơn Trà Sữa Sáng 20/10</span>
                  </h4>
                  <span className="text-[11px] font-semibold text-emerald-300">
                    Đã chốt: {stats.orderedTeaCount}/5 ly
                  </span>
                </div>

                <div className="divide-y divide-white/10 rounded-xl border border-white/15 bg-slate-950/60 overflow-hidden">
                  {FEMALE_MEMBERS.map((queen) => {
                    const order = milkTeaOrders[queen.id];
                    return (
                      <div
                        key={queen.id}
                        className="p-3 flex items-center justify-between gap-2.5"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <MemberAvatar
                            id={queen.id}
                            name={queen.shortName}
                            fullName={queen.fullName}
                            gender="female"
                            size="sm"
                            checkedIn={Boolean(rsvps[queen.id]?.attending)}
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">
                              {queen.shortName}
                            </p>
                            {order ? (
                              <>
                                <p className="text-xs text-amber-200 font-medium truncate">
                                  {order.drinkName}
                                </p>
                                <p className="text-[11px] text-slate-300">
                                  {order.sugar} • {order.ice}
                                  {order.note ? ` • "${order.note}"` : ""}
                                </p>
                              </>
                            ) : (
                              <p className="text-[11px] text-slate-400 italic">
                                Chưa chọn món...
                              </p>
                            )}
                          </div>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 font-semibold ${
                            order
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {order ? "Đã chốt" : "Đang chờ"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ====================================================================
            TAB 2: MÀN HÌNH 3 (TƯỜNG LỜI CHÚC & BẢNG ĐIỂM DANH - LIVE WALL)
           ==================================================================== */}
        {activeTab === "wall" && (
          <div className="space-y-4">
            {/* Thanh Thống Kê Nhanh (3 ô số liệu) */}
            <section className="grid grid-cols-3 gap-2.5">
              <div className="rounded-2xl p-3 bg-white/10 backdrop-blur-md border border-white/15 text-center shadow-lg">
                <p className="text-[11px] text-slate-300">Quân số tham dự</p>
                <p className="text-xl font-extrabold text-emerald-300 mt-0.5">
                  {stats.totalAttendees}
                  <span className="text-xs font-normal text-slate-400">/14</span>
                </p>
                <p className="text-[10px] text-slate-400">
                  {stats.attendingMembersCount} TV + {stats.plusOneCount} Khách
                </p>
              </div>

              <div className="rounded-2xl p-3 bg-white/10 backdrop-blur-md border border-white/15 text-center shadow-lg">
                <p className="text-[11px] text-slate-300">Trà sữa 20/10</p>
                <p className="text-xl font-extrabold text-amber-300 mt-0.5">
                  {stats.orderedTeaCount}/5
                </p>
                <p className="text-[10px] text-slate-400">Đơn đã chốt</p>
              </div>

              <div className="rounded-2xl p-3 bg-white/10 backdrop-blur-md border border-white/15 text-center shadow-lg">
                <p className="text-[11px] text-slate-300">Lời chúc</p>
                <p className="text-xl font-extrabold text-rose-300 mt-0.5">
                  {stats.totalWishes}
                </p>
                <p className="text-[10px] text-slate-400">Gửi phái đẹp</p>
              </div>
            </section>

            {/* Tường Lời Chúc Phái Đẹp */}
            <section className="rounded-2xl p-4 bg-white/10 backdrop-blur-md border border-white/15 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-400 fill-rose-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wide text-rose-200">
                    Tường Lời Chúc Phái Đẹp KTCNMT
                  </h3>
                </div>
                <span className="text-[11px] text-slate-300">
                  Chạm ❤️ để thả tim
                </span>
              </div>

              <div className="space-y-3">
                {wishes.map((wish) => {
                  const author = STAFF_MEMBERS.find(
                    (m) => m.id === wish.authorId
                  );
                  return (
                    <div
                      key={wish.id}
                      className="rounded-xl p-3.5 bg-slate-950/55 border border-white/10 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <MemberAvatar
                            id={wish.authorId}
                            name={wish.authorName}
                            fullName={author?.fullName}
                            gender={author?.gender || "male"}
                            size="sm"
                          />
                          <div>
                            <p className="text-xs font-bold text-amber-200">
                              {wish.authorName}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {formatRelativeTime(wish.createdAt)}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleLikeWish(wish.id)}
                          className="min-h-[38px] px-3 py-1 rounded-full bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/35 flex items-center gap-1.5 text-xs font-bold text-rose-200 active:scale-95 transition-all"
                        >
                          <span>❤️</span>
                          <span>{wish.likes}</span>
                        </button>
                      </div>

                      <p className="text-xs text-slate-100 leading-relaxed">
                        {wish.content}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Danh Sách Điểm Danh & Ghép Xe 17h15 */}
            <section className="rounded-2xl p-4 bg-white/10 backdrop-blur-md border border-white/15 shadow-xl space-y-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-300" />
                <h3 className="text-sm font-bold uppercase tracking-wide text-amber-200">
                  Điểm Danh & Điều Phối Ghép Xe 17h15
                </h3>
              </div>

              {/* Nhóm Nữ & Ghép xe 17h15 */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-rose-200">
                  🌸 05 Bông Hoa KTCNMT & Khách Quý (+1):
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  {FEMALE_MEMBERS.map((f) => {
                    const rsvp = rsvps[f.id];
                    const isAttending = Boolean(rsvp?.attending);
                    return (
                      <div
                        key={f.id}
                        className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5">
                          <MemberAvatar
                            id={f.id}
                            name={f.shortName}
                            fullName={f.fullName}
                            gender="female"
                            size="sm"
                            checkedIn={isAttending}
                          />
                          <div>
                            <p className="text-xs font-bold text-white">
                              {f.shortName}
                            </p>
                            <p className="text-[11px] text-slate-300">
                              {isAttending
                                ? rsvp?.joinSharedRide1715
                                  ? "🚗 Đi xe chung lúc 17h15"
                                  : "🛵 Tự túc di chuyển"
                                : "Chưa xác nhận"}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            isAttending
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {isAttending ? "Có mặt ✓" : "Chờ xác nhận"}
                        </span>
                      </div>
                    );
                  })}

                  {/* Hiển thị Khách quý (+1) nếu có anh em đăng ký */}
                  {Object.values(rsvps)
                    .filter((r) => r.attending && r.hasPlusOne)
                    .map((r) => {
                      const husband = STAFF_MEMBERS.find(
                        (m) => m.id === r.memberId
                      );
                      return (
                        <div
                          key={`plus-one-${r.memberId}`}
                          className="p-2.5 rounded-xl bg-gradient-to-r from-rose-500/20 to-amber-500/15 border border-rose-300/35 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2.5">
                            <MemberAvatar
                              id={SPECIAL_GUEST_ID}
                              name={r.plusOneName || "Khách Quý"}
                              gender="female"
                              size="sm"
                              checkedIn
                            />
                            <div>
                              <p className="text-xs font-bold text-rose-100">
                                {r.plusOneName || "Khách Quý Đặc Biệt"} (+1)
                              </p>
                              <p className="text-[11px] text-amber-200/90">
                                Đi cùng {husband?.shortName}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-100 border border-rose-300/40 font-semibold">
                            Khách Quý VIP 🌸
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Nhóm Nam & Phân công phương tiện 17h15 */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-amber-200">
                  🥂 08 Anh Em & Đội Hình Hỗ Trợ Di Chuyển:
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  {MALE_MEMBERS.map((m) => {
                    const rsvp = rsvps[m.id];
                    const isAttending = Boolean(rsvp?.attending);
                    const transportObj = MALE_TRANSPORT_OPTIONS.find(
                      (t) => t.id === rsvp?.transportOption
                    );
                    return (
                      <div
                        key={m.id}
                        className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5">
                          <MemberAvatar
                            id={m.id}
                            name={m.shortName}
                            fullName={m.fullName}
                            gender="male"
                            size="sm"
                            checkedIn={isAttending}
                          />
                          <div>
                            <p className="text-xs font-bold text-white">
                              {m.shortName}
                              {rsvp?.hasPlusOne ? " (+1 Khách quý)" : ""}
                            </p>
                            <p className="text-[11px] text-slate-300">
                              {isAttending && transportObj
                                ? transportObj.shortLabel
                                : "Chưa đăng ký phương tiện"}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                            isAttending
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {isAttending ? "Đã điểm danh ✓" : "Chờ"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ====================================================================
            TAB 3: MÀN HÌNH 4 (SÂN KHẤU MINI-GAME ĐỘNG ĐỒNG BỘ 14 MÁY)
           ==================================================================== */}
        {activeTab === "game" && (
          <div className="space-y-4">
            {/* Header Sân khấu */}
            <section className="rounded-2xl p-4 bg-gradient-to-r from-rose-950/90 via-slate-900/90 to-amber-950/80 backdrop-blur-md border border-rose-300/35 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/25 border border-rose-400/40 text-[11px] font-bold text-rose-200">
                  <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                  <span>LIVE STAGE • ĐỒNG BỘ 14 ĐIỆN THOẠI</span>
                </div>
                <span className="text-[11px] text-amber-300 font-semibold">
                  Đã mở:{" "}
                  {gameState.boxes.filter((b) => b.isOpened).length}/6 túi
                </span>
              </div>
              <h2 className="text-lg font-extrabold bg-gradient-to-r from-rose-200 via-pink-100 to-amber-200 bg-clip-text text-transparent">
                🎁 Túi Mù Nữ Hoàng & Lệnh Bài
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                06 hộp quà bí mật & 06 Lệnh Bài quyền lực dành tặng 05 Bông Hoa
                KTCNMT và Chị Khách Quý tại bàn tiệc The Gangs!
              </p>
            </section>

            {/* ----------------------------------------------------------------
                PHASE A: WAITING (Khi chưa bắt đầu)
               ---------------------------------------------------------------- */}
            {gameState.phase === "WAITING" && (
              <section className="rounded-2xl p-6 bg-white/10 backdrop-blur-md border border-rose-300/30 shadow-xl text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-rose-500/30 to-amber-500/30 border border-rose-300/40 flex items-center justify-center shadow-[0_0_30px_rgba(244,63,94,0.3)] animate-float-slow">
                  <Gift className="w-10 h-10 text-amber-200" />
                </div>
                <div className="space-y-1.5">
                  <span className="text-[11px] uppercase tracking-widest text-amber-300 font-bold">
                    COMING UP AT 18:00 • 19/10/2026
                  </span>
                  <h3 className="text-base font-extrabold text-white leading-snug">
                    Sân khấu Xé Túi Mù Nữ Hoàng sẽ mở sóng tại bàn tiệc The Gangs
                    tối 19/10
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Khi Đạo diễn bấm phát sóng, toàn bộ 14 chiếc điện thoại tại
                    bàn tiệc sẽ tự động chuyển về sân khấu này để cùng xem từng
                    Nữ Chủ Nhân xé túi mù!
                  </p>
                </div>

                {/* Danh sách 06 Nữ Chủ Nhân */}
                <div className="pt-2">
                  <p className="text-[11px] font-semibold text-rose-200 mb-2.5">
                    👑 06 Nữ Chủ Nhân sở hữu Túi Mù đêm nay:
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {gameQueens.map((q) => (
                      <span
                        key={q.id}
                        className="px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-300/30 text-[11px] font-medium text-rose-100"
                      >
                        🌸 {q.shortName}
                      </span>
                    ))}
                  </div>
                </div>

                {currentUser.isHost && (
                  <button
                    type="button"
                    onClick={() => sendGameAction({ action: "START_LIVE" })}
                    className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-amber-400 text-slate-950 font-extrabold text-sm shadow-[0_0_25px_rgba(244,63,94,0.5)] active:scale-95 transition-all"
                  >
                    🚀 Bắt Đầu Game / Gom 14 Máy Vào Sân Khấu Ngay
                  </button>
                )}
              </section>
            )}

            {/* ----------------------------------------------------------------
                PHASE B: SELECTING_BOX (Bàn cờ 6 Túi Mù)
               ---------------------------------------------------------------- */}
            {gameState.phase === "SELECTING_BOX" && (
              <section className="space-y-4">
                {/* Thanh trạng thái lượt mở túi */}
                <div className="rounded-2xl p-3.5 bg-gradient-to-r from-rose-500/30 via-pink-500/20 to-amber-500/25 border border-rose-300/50 shadow-lg flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <MemberAvatar
                      id={currentQueenObj.id}
                      name={currentQueenObj.shortName}
                      fullName={currentQueenObj.fullName}
                      gender="female"
                      size="md"
                      highlight
                    />
                    <div>
                      <p className="text-[11px] font-semibold text-amber-200 uppercase tracking-wide">
                        👑 Đang tới lượt mở túi của:
                      </p>
                      <p className="text-base font-extrabold text-white">
                        {currentQueenObj.shortName}
                      </p>
                    </div>
                  </div>
                  {canInteractWithStage && (
                    <span className="px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 text-[11px] font-extrabold animate-pulse shrink-0">
                      Lượt của bạn!
                    </span>
                  )}
                </div>

                {/* Lưới 06 chiếc Túi Mù */}
                <div className="grid grid-cols-2 gap-3">
                  {gameState.boxes.map((box) => {
                    const reward = BLIND_BOX_REWARDS.find(
                      (r) => r.id === box.rewardId
                    );
                    if (box.isOpened) {
                      return (
                        <div
                          key={box.boxNumber}
                          className="rounded-2xl p-3.5 bg-slate-900/75 border border-white/15 flex flex-col justify-between min-h-[152px] opacity-90"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-400">
                              Túi Mù #{box.boxNumber}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-semibold">
                              Đã mở ✓
                            </span>
                          </div>

                          <div className="my-2 space-y-1">
                            <p className="text-xs font-extrabold text-rose-200">
                              👑 {box.openedByQueenName}
                            </p>
                            <p className="text-[11px] font-semibold text-amber-300 leading-snug">
                              {reward?.code}: {reward?.title}
                            </p>
                          </div>

                          <div className="pt-1.5 border-t border-white/10 text-[11px] text-slate-300">
                            {box.assignedMaleName ? (
                              <span>
                                🎯 Thực thi:{" "}
                                <strong className="text-amber-200">
                                  {box.assignedMaleName}
                                </strong>
                              </span>
                            ) : (
                              <span className="italic text-slate-400">
                                Đã nhận lộc lá
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={box.boxNumber}
                        type="button"
                        onClick={() =>
                          sendGameAction({
                            action: "OPEN_BOX",
                            boxNumber: box.boxNumber,
                          })
                        }
                        className="group relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-rose-500/25 via-pink-500/15 to-amber-500/25 hover:from-rose-500/35 hover:to-amber-500/35 border border-rose-300/45 shadow-[0_0_25px_rgba(244,63,94,0.22)] flex flex-col items-center justify-between min-h-[152px] active:scale-95 transition-all text-center"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-white/15 text-amber-200">
                            #{box.boxNumber}
                          </span>
                          <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
                        </div>

                        <div className="my-1 w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-400 to-amber-300 p-0.5 shadow-[0_0_20px_rgba(251,113,133,0.5)] group-hover:scale-110 transition-transform flex items-center justify-center">
                          <div className="w-full h-full rounded-[14px] bg-slate-950/40 flex items-center justify-center text-2xl">
                            🎁
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-extrabold text-white">
                            Túi Mù #{box.boxNumber}
                          </p>
                          <p className="text-[11px] font-semibold text-amber-200 mt-0.5 animate-pulse">
                            {canInteractWithStage
                              ? "✨ Chạm để xé túi!"
                              : `Chờ ${currentQueenObj.shortName} chọn...`}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ----------------------------------------------------------------
                PHASE C: SHAKING (Hiệu ứng Đang Xé Túi - Kéo dài 2 giây trên cả 14 máy)
               ---------------------------------------------------------------- */}
            {gameState.phase === "SHAKING" && (
              <section className="rounded-2xl p-8 bg-gradient-to-b from-rose-900/50 via-slate-900/80 to-amber-900/40 backdrop-blur-xl border-2 border-amber-300/60 shadow-[0_0_45px_rgba(251,191,36,0.35)] text-center space-y-6 my-2">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 text-xs font-bold text-amber-200">
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>ĐỒNG BỘ TRÊN 14 MÀN HÌNH</span>
                </div>

                {/* Chiếc túi phóng to & rung lắc mạnh liên tục */}
                <div className="py-4 flex justify-center">
                  <div className="w-32 h-32 rounded-3xl bg-gradient-to-tr from-rose-500 via-pink-400 to-amber-300 p-1 shadow-[0_0_50px_rgba(244,63,94,0.8)] animate-box-shake flex items-center justify-center">
                    <div className="w-full h-full rounded-[20px] bg-slate-950/50 flex flex-col items-center justify-center">
                      <span className="text-5xl">🎁</span>
                      <span className="text-xs font-black text-amber-200 mt-1">
                        TÚI MÙ #{gameState.activeBoxNumber}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-lg font-extrabold text-white animate-pulse">
                    🥁 Đang xé Túi Mù số #{gameState.activeBoxNumber} của{" "}
                    <span className="text-amber-300">
                      {activeBoxObj?.openedByQueenName ||
                        currentQueenObj.shortName}
                    </span>
                    ...
                  </h3>
                  <p className="text-xs text-rose-200/80">
                    Hồi hộp chờ xem Lộc Lá & Lệnh Bài Nữ Hoàng nào sẽ lộ diện!
                  </p>
                </div>
              </section>
            )}

            {/* ----------------------------------------------------------------
                PHASE D: REVEALED (Nổ Pháo Giấy & Lật Thẻ Lệnh Bài)
               ---------------------------------------------------------------- */}
            {gameState.phase === "REVEALED" && activeRewardObj && (
              <section className="rounded-2xl p-5 bg-gradient-to-b from-rose-500/25 via-slate-900/90 to-amber-500/25 backdrop-blur-xl border-2 border-rose-300/60 shadow-[0_0_40px_rgba(244,63,94,0.35)] space-y-4 animate-card-flip">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-amber-400/25 border border-amber-300/50 text-xs font-extrabold text-amber-200">
                    🎉 TÚI MÙ #{gameState.activeBoxNumber} ĐÃ MỞ!
                  </span>
                  <span className="text-xs font-bold text-rose-200">
                    {activeRewardObj.badge}
                  </span>
                </div>

                {/* Chủ nhân chiếc túi */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/10 border border-white/15">
                  <MemberAvatar
                    id={activeBoxObj?.openedByQueenId || currentQueenObj.id}
                    name={
                      activeBoxObj?.openedByQueenName ||
                      currentQueenObj.shortName
                    }
                    gender="female"
                    size="lg"
                    highlight
                  />
                  <div>
                    <p className="text-[11px] text-rose-200 uppercase font-semibold">
                      Chủ nhân chiếc túi:
                    </p>
                    <p className="text-lg font-extrabold text-white">
                      {activeBoxObj?.openedByQueenName ||
                        currentQueenObj.shortName}
                    </p>
                  </div>
                </div>

                {/* Nội dung Lộc Lá & Lệnh Bài Nữ Hoàng */}
                <div className="rounded-2xl p-4 bg-slate-950/75 border border-amber-300/40 space-y-2.5 shadow-inner">
                  <div className="inline-block px-3 py-0.5 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 text-xs font-black">
                    {activeRewardObj.code}
                  </div>
                  <h3 className="text-base font-extrabold text-amber-200">
                    {activeRewardObj.title}
                  </h3>
                  <p className="text-xs text-slate-100 leading-relaxed">
                    {activeRewardObj.description}
                  </p>
                </div>

                {/* Nút bấm: Quay Vòng Quay Chọn Chàng Trai Thực Thi */}
                <button
                  type="button"
                  onClick={() => sendGameAction({ action: "SPIN_MALE" })}
                  className="w-full min-h-[50px] py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 text-slate-950 font-black text-sm shadow-[0_0_25px_rgba(251,191,36,0.5)] active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Dices className="w-5 h-5" />
                  <span>🎲 Quay Vòng Quay Chọn Chàng Trai Thực Thi</span>
                </button>
              </section>
            )}

            {/* ----------------------------------------------------------------
                PHASE E: SPINNING_MALE & MALE_SELECTED (Vòng Quay 08 Anh Em Nam Đồng Bộ)
               ---------------------------------------------------------------- */}
            {(gameState.phase === "SPINNING_MALE" ||
              gameState.phase === "MALE_SELECTED") && (
              <section className="rounded-2xl p-4 bg-gradient-to-b from-amber-500/20 via-slate-900/90 to-rose-500/20 backdrop-blur-xl border-2 border-amber-300/50 shadow-2xl space-y-4">
                {/* Tóm tắt Lệnh bài đang quay */}
                {activeRewardObj && (
                  <div className="rounded-xl p-3 bg-slate-950/65 border border-white/15 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-rose-300">
                        👑 Nữ Hoàng:{" "}
                        {activeBoxObj?.openedByQueenName ||
                          currentQueenObj.shortName}
                      </span>
                      <span className="font-bold text-amber-300">
                        {activeRewardObj.code}
                      </span>
                    </div>
                    <p className="text-xs font-extrabold text-white">
                      {activeRewardObj.title}
                    </p>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {activeRewardObj.description}
                    </p>
                  </div>
                )}

                <div className="text-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-200">
                    {gameState.phase === "SPINNING_MALE"
                      ? "🎰 Vòng Quay Đang Tìm Chàng Trai May Mắn..."
                      : "🎯 Đã Tìm Thấy Chàng Trai Thực Thi Lệnh Bài!"}
                  </p>
                </div>

                {/* Dải 08 Avatar của 08 Anh Em Nam */}
                <div className="grid grid-cols-4 gap-3 py-1">
                  {MALE_MEMBERS.map((male, idx) => {
                    const isSpinningHighlight =
                      gameState.phase === "SPINNING_MALE" &&
                      rouletteIndex === idx;
                    const isFinalSelected =
                      gameState.phase === "MALE_SELECTED" &&
                      gameState.selectedMaleId === male.id;
                    const isHighlighted =
                      isSpinningHighlight || isFinalSelected;

                    return (
                      <div
                        key={male.id}
                        className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all duration-150 ${
                          isHighlighted
                            ? "bg-gradient-to-b from-amber-400/35 to-rose-500/25 ring-2 ring-amber-300 shadow-[0_0_25px_rgba(251,191,36,0.9)] scale-105 z-10"
                            : gameState.phase === "MALE_SELECTED"
                            ? "opacity-40 scale-95"
                            : "opacity-75"
                        }`}
                      >
                        <MemberAvatar
                          id={male.id}
                          name={male.shortName}
                          fullName={male.fullName}
                          gender="male"
                          size="lg"
                          highlight={isHighlighted}
                        />
                        <span
                          className={`text-[11px] font-bold text-center leading-tight ${
                            isHighlighted ? "text-amber-200" : "text-slate-300"
                          }`}
                        >
                          {male.shortName}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Kết quả khi dừng vòng quay */}
                {gameState.phase === "MALE_SELECTED" && selectedMaleObj && (
                  <div className="rounded-2xl p-4 bg-gradient-to-r from-amber-500/30 via-rose-500/25 to-amber-500/30 border border-amber-300/60 text-center space-y-3 shadow-lg">
                    <div className="flex items-center justify-center gap-2 text-amber-200">
                      <PartyPopper className="w-5 h-5" />
                      <span className="text-xs font-extrabold uppercase tracking-wider">
                        KẾT QUẢ VÒNG QUAY ĐỒNG BỘ
                      </span>
                    </div>
                    <p className="text-sm font-extrabold text-white leading-relaxed">
                      🎯 Chúc mừng{" "}
                      <span className="text-amber-300 underline decoration-amber-300/60">
                        {selectedMaleObj.shortName}
                      </span>{" "}
                      được chọn thực thi Lệnh Bài của{" "}
                      <span className="text-rose-200">
                        {activeBoxObj?.openedByQueenName ||
                          currentQueenObj.shortName}
                      </span>
                      !
                    </p>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          sendGameAction({ action: "BACK_TO_BOARD" })
                        }
                        className="flex-1 min-h-[44px] py-2.5 px-3 rounded-xl bg-white/15 hover:bg-white/20 border border-white/25 text-xs font-bold text-white active:scale-95 transition-all flex items-center justify-center gap-1.5"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Quay lại Bàn cờ 6 Túi</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => sendGameAction({ action: "SPIN_MALE" })}
                        className="min-h-[44px] py-2.5 px-3 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 border border-amber-300/40 text-xs font-bold text-amber-200 active:scale-95 transition-all flex items-center justify-center gap-1"
                      >
                        <Dices className="w-4 h-4" />
                        <span>Quay lại</span>
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* ----------------------------------------------------------------
                4. THANH ĐIỀU KHIỂN ĐẠO DIỄN ẨN (HOST CONTROL PANEL - HUY DƯƠNG)
               ---------------------------------------------------------------- */}
            {currentUser.isHost && (
              <section className="rounded-2xl p-4 bg-slate-950/90 backdrop-blur-xl border-2 border-amber-400/50 shadow-[0_0_30px_rgba(251,191,36,0.2)] space-y-3.5 mt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-300" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                      Thanh Điều Khiển Đạo Diễn (Host: Anh Dương)
                    </h3>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 font-semibold">
                    Director Mode
                  </span>
                </div>

                {/* Nút Phát sóng / Gom 14 máy vào Game */}
                <button
                  type="button"
                  onClick={() => sendGameAction({ action: "START_LIVE" })}
                  className="w-full min-h-[44px] py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 font-extrabold text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Radio className="w-4 h-4" />
                  <span>🚀 Phát sóng / Gom 14 máy vào Game</span>
                </button>

                {/* Bộ chọn nhanh: 👑 Chuyển lượt cho */}
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold text-slate-300">
                    👑 Chuyển lượt mở túi cho (6 Nữ Chủ Nhân):
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {gameQueens.map((q) => {
                      const isCurrent = gameState.currentQueenId === q.id;
                      const hasOpened = gameState.boxes.some(
                        (b) => b.openedByQueenId === q.id
                      );
                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() =>
                            sendGameAction({
                              action: "SET_QUEEN",
                              queenId: q.id,
                            })
                          }
                          className={`min-h-[40px] px-2 py-1.5 rounded-xl text-[11px] font-bold border active:scale-95 transition-all truncate ${
                            isCurrent
                              ? "bg-rose-500 text-white border-rose-200 shadow-sm"
                              : hasOpened
                              ? "bg-emerald-500/15 text-emerald-200 border-emerald-400/30"
                              : "bg-white/5 text-slate-200 border-white/15 hover:bg-white/10"
                          }`}
                        >
                          {hasOpened ? "✓ " : ""}
                          {q.shortName}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Nút Quay lại Bàn cờ 6 Túi & Nút Reset Mini-Game */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => sendGameAction({ action: "BACK_TO_BOARD" })}
                    className="min-h-[44px] px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-xs font-bold text-white active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>🔙 Bàn cờ 6 Túi</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      sendGameAction({
                        action: "RESET_GAME",
                        keepLive: gameState.isLive,
                      });
                      showToast("♻️ Đã Reset & xào lại 6 hộp Túi Mù mới tinh!");
                    }}
                    className="min-h-[44px] px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-xs font-bold text-rose-200 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>♻️ Reset Mini-Game</span>
                  </button>
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* STICKY BOTTOM NAVIGATION BAR (3 TABS) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40">
        <div className="max-w-md mx-auto px-4 pb-3 pt-1">
          <div className="rounded-2xl bg-slate-950/90 backdrop-blur-xl border border-white/15 shadow-[0_-8px_30px_rgba(0,0,0,0.6)] p-1.5 grid grid-cols-3 gap-1.5">
            {/* Tab 1: 💌 Cá nhân */}
            <button
              type="button"
              onClick={() => setActiveTab("personal")}
              className={`min-h-[46px] rounded-xl py-1.5 px-2 flex flex-col items-center justify-center gap-0.5 text-xs font-bold active:scale-95 transition-all ${
                activeTab === "personal"
                  ? "bg-gradient-to-r from-rose-500/35 to-amber-500/25 text-white border border-rose-300/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>💌 Cá nhân</span>
              <span className="text-[10px] font-normal opacity-80">
                {currentUser.gender === "female"
                  ? "Thiệp & Trà sữa"
                  : "Điểm danh & Hậu cần"}
              </span>
            </button>

            {/* Tab 2: 💬 Tường chung */}
            <button
              type="button"
              onClick={() => setActiveTab("wall")}
              className={`min-h-[46px] rounded-xl py-1.5 px-2 flex flex-col items-center justify-center gap-0.5 text-xs font-bold active:scale-95 transition-all ${
                activeTab === "wall"
                  ? "bg-gradient-to-r from-rose-500/35 to-amber-500/25 text-white border border-rose-300/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>💬 Tường chung</span>
              <span className="text-[10px] font-normal opacity-80">
                {stats.totalAttendees}/14 • {stats.totalWishes} lời chúc
              </span>
            </button>

            {/* Tab 3: 🎁 Mini-Game */}
            <button
              type="button"
              onClick={() => setActiveTab("game")}
              className={`relative min-h-[46px] rounded-xl py-1.5 px-2 flex flex-col items-center justify-center gap-0.5 text-xs font-bold active:scale-95 transition-all ${
                activeTab === "game"
                  ? "bg-gradient-to-r from-rose-500/35 to-amber-500/25 text-white border border-rose-300/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {gameState.isLive && (
                <span className="absolute -top-1.5 right-2 px-1.5 py-0.2 rounded-full bg-rose-600 text-[9px] font-black text-white tracking-wider animate-pulse shadow-[0_0_10px_rgba(225,29,72,0.9)]">
                  LIVE
                </span>
              )}
              <span>🎁 Mini-Game</span>
              <span className="text-[10px] font-normal opacity-80">
                Xé Túi Mù 19/10
              </span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}
