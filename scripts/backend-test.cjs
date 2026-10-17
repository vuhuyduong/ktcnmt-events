// Run: docker exec ktcnmt-events node scripts/backend-test.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) {
  return resolve.call(
    this,
    name.startsWith("@/") ? path.join(root, "src", name.slice(2)) : name,
    ...args,
  );
};
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
        target: ts.ScriptTarget.ES2020,
      },
    }).outputText,
    filename,
  );
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ktcnmt-backend-"));
process.env.STATE_FILE_PATH = path.join(temp, "state.json");
const store = require("../src/lib/store.ts");
async function main() {
  const initial = store.getState();
  assert.equal(
    Object.keys(initial.rsvps).length,
    0,
    "new storage must have zero synthetic RSVPs",
  );
  assert.equal(
    initial.wishes.length,
    0,
    "new storage must have zero synthetic wishes",
  );
  assert.equal(
    fs.existsSync(process.env.STATE_FILE_PATH),
    true,
    "use isolated configured storage",
  );
  const legacy = structuredClone(initial);
  legacy.rsvps["quynh-nhu"] = {
    memberId: "quynh-nhu",
    attending: true,
    updatedAt: new Date().toISOString(),
  };
  legacy.rsvps["huy-duong"] = {
    memberId: "huy-duong",
    attending: true,
    hasPlusOne: true,
    plusOneName: "Legacy guest",
    updatedAt: new Date().toISOString(),
  };
  assert.deepEqual(
    store.getDynamicQueens(legacy),
    [],
    "legacy attendance does not establish explicit confirmation",
  );
  assert.throws(
    () => store.pickRandomMaleForGame(legacy),
    /No attending/,
    "legacy male attendance is not draw eligible",
  );
  const before = fs.readFileSync(process.env.STATE_FILE_PATH, "utf8");
  const originalWrite = fs.writeFileSync;
  fs.writeFileSync = () => {
    throw new Error("disk unavailable");
  };
  assert.throws(
    () =>
      store.updateState((s) => {
        s.wishes.push({
          id: "real",
          authorId: "a",
          authorName: "A",
          content: "real",
          likes: 0,
          createdAt: new Date().toISOString(),
        });
      }),
    /disk unavailable/,
  );
  fs.writeFileSync = originalWrite;
  assert.equal(
    store.getState().wishes.length,
    0,
    "failed writes roll back memory",
  );
  assert.equal(fs.readFileSync(process.env.STATE_FILE_PATH, "utf8"), before);
  global.__ktcnmtStateCache = undefined;
  fs.writeFileSync(process.env.STATE_FILE_PATH, "{invalid");
  assert.throws(
    () => store.getState(),
    /state|JSON|Expected|property/i,
    "corrupt data must fail closed",
  );
  assert.equal(
    fs.readFileSync(process.env.STATE_FILE_PATH, "utf8"),
    "{invalid",
  );
  fs.writeFileSync(process.env.STATE_FILE_PATH, before);
  global.__ktcnmtStateCache = undefined;
  const { NextRequest } = require("next/server");
  const api = require("../src/app/api/state/route.ts");
  const game = require("../src/app/api/game/route.ts");
  const req = (url, body, cookie) =>
    new NextRequest(`http://localhost${url}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(
        url === "/api/game" && body && !Object.hasOwn(body, "expectedQueenId")
          ? {
              ...body,
              expectedQueenId: store.getState().gameState.currentQueenId,
            }
          : body,
      ),
    });
  assert.equal(
    (await api.POST(req("/api/state", { action: "LIKE_WISH", wishId: "x" })))
      .status,
    401,
    "writes require session",
  );
  delete process.env.EVENT_SESSION_SECRET;
  delete process.env.EVENT_MEMBER_CODES_JSON;
  delete process.env.EVENT_ADMIN_CODE;
  const session = require("../src/app/api/session/route.ts");
  const login = async (memberId) => {
    const r = await session.POST(req("/api/session", { memberId }));
    assert.equal(r.status, 200, "roster choice needs no configuration");
    return r.headers.get("set-cookie").split(";")[0];
  };
  const nhu = await login("quynh-nhu");
  const anh = await login("ngoc-anh");
  const admin = await login("huy-duong");
  assert.equal(
    (await session.POST(req("/api/session", { memberId: "unknown" }))).status,
    400,
  );
  assert.equal(
    (
      await (
        await session.GET(
          new NextRequest("http://localhost/api/session", {
            headers: { cookie: admin },
          }),
        )
      ).json()
    ).isAdmin,
    true,
    "host role follows roster",
  );
  assert.equal(
    (
      await api.POST(
        req(
          "/api/state",
          {
            action: "SUBMIT_FEMALE_RSVP",
            memberId: "ngoc-anh",
            attendanceStatus: "attending",
          },
          nhu,
        ),
      )
    ).status,
    403,
    "member spoof rejected",
  );
  assert.equal(
    (await api.POST(req("/api/state", { action: "unknown" }, nhu))).status,
    400,
  );
  assert.equal(
    (await api.POST(req("/api/state", null, nhu))).status,
    400,
    "null request is invalid input",
  );
  assert.equal((await game.POST(req("/api/game", null, nhu))).status, 400);
  assert.equal((await session.POST(req("/api/session", null))).status, 400);
  process.env.EVENT_PUBLIC_ORIGIN = "https://event.example";
  const originRequest = (origin, forwarded) =>
    new NextRequest("http://0.0.0.0:2010/api/session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin,
        ...(forwarded
          ? { "x-forwarded-host": forwarded, "x-forwarded-proto": "https" }
          : {}),
      },
      body: JSON.stringify({ memberId: "quynh-nhu" }),
    });
  assert.equal(
    (await session.POST(originRequest("https://event.example"))).status,
    200,
    "configured public origin accepted behind proxy",
  );
  assert.equal(
    (await session.POST(originRequest("https://evil.example", "evil.example")))
      .status,
    403,
    "forwarded headers cannot grant origin trust",
  );
  delete process.env.EVENT_PUBLIC_ORIGIN;
  const submit = {
    action: "SUBMIT_FEMALE_RSVP",
    memberId: "quynh-nhu",
    attendanceStatus: "attending",
    dietaryNote: "Ăn chay",
  };
  assert.equal((await api.POST(req("/api/state", submit, nhu))).status, 200);
  const stableRsvp = store.getState().rsvps["quynh-nhu"];
  assert.equal(
    stableRsvp.source,
    "member-session",
    "new confirmation records session provenance",
  );
  const saveConsole = console.error;
  console.error = () => {};
  fs.writeFileSync = () => {
    throw new Error("disk unavailable");
  };
  let failedSave;
  try {
    failedSave = await api.POST(
      req("/api/state", { ...submit, attendanceStatus: "declined" }, nhu),
    );
  } finally {
    fs.writeFileSync = originalWrite;
    console.error = saveConsole;
  }
  assert.equal(failedSave.status, 500, "storage errors reach HTTP response");
  assert.deepEqual(
    store.getState().rsvps["quynh-nhu"],
    stableRsvp,
    "failed API save cannot mutate cached RSVP",
  );

  const ownState = await (
    await api.GET(
      new NextRequest("http://localhost/api/state", {
        headers: { cookie: nhu },
      }),
    )
  ).json();
  assert.equal(
    ownState.rsvps["quynh-nhu"].dietaryNote,
    undefined,
    "retired form fields are not newly accepted",
  );
  const otherState = await (
    await api.GET(
      new NextRequest("http://localhost/api/state", {
        headers: { cookie: anh },
      }),
    )
  ).json();
  assert.deepEqual(otherState.rsvps, {});
  const historicOrder = {
    memberId: "quynh-nhu",
    drinkName: "Historical choice",
    sugar: "50%",
    ice: "normal",
    note: "Keep private",
    updatedAt: new Date().toISOString(),
  };
  store.updateState((s) => {
    s.milkTeaOrders["quynh-nhu"] = historicOrder;
    s.rsvps["quynh-nhu"].dietaryNote = "Historic note";
  });
  for (const attendanceStatus of ["attending", "declined", "maybe"]) {
    assert.equal(
      (
        await api.POST(
          req(
            "/api/state",
            { ...submit, attendanceStatus, joinSharedRide1715: true },
            nhu,
          ),
        )
      ).status,
      200,
    );
    assert.deepEqual(
      store.getState().milkTeaOrders["quynh-nhu"],
      historicOrder,
      "travel saves preserve historical orders",
    );
    assert.equal(
      store.getState().rsvps["quynh-nhu"].dietaryNote,
      "Historic note",
      "unrelated stored notes survive",
    );
    assert.equal(
      store.getState().rsvps["quynh-nhu"].attending,
      attendanceStatus === "attending",
    );
  }
  await api.POST(req("/api/state", submit, nhu));
  const publicState = await (
    await api.GET(new NextRequest("http://localhost/api/state"))
  ).json();
  assert.deepEqual(publicState.rsvps, {});
  assert.equal(
    publicState.milkTeaOrders,
    undefined,
    "retired private orders never enter payloads",
  );
  assert.deepEqual(
    publicState.queens,
    [],
    "waiting public state must not disclose RSVP participant list",
  );
  assert.deepEqual(
    publicState.gameState.boxes,
    [],
    "waiting public state must not disclose attendance via box count",
  );

  assert.equal(
    (await game.POST(req("/api/game", { action: "START_LIVE" }, nhu))).status,
    403,
  );
  assert.equal(
    (await game.POST(req("/api/game", { action: "START_LIVE" }, admin))).status,
    200,
  );
  assert.equal(
    (
      await game.POST(
        req("/api/game", { action: "OPEN_BOX", boxNumber: 1 }, anh),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await game.POST(
        req("/api/game", { action: "OPEN_BOX", boxNumber: 1 }, nhu),
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await game.POST(
        req("/api/game", { action: "OPEN_BOX", boxNumber: 1 }, nhu),
      )
    ).status,
    409,
  );
  const shaking = await (
    await game.GET(new NextRequest("http://localhost/api/game"))
  ).json();
  assert.equal(
    shaking.gameState.boxes[0].rewardId,
    "",
    "reward hidden until revealed",
  );
  assert.equal(
    (await game.POST(req("/api/game", { action: "SPIN_MALE" }, nhu))).status,
    409,
  );
  store.updateState((s) => {
    s.gameState.phase = "REVEALED";
    s.gameState.phaseStartedAt = Date.now();
  });
  assert.equal(
    (await game.POST(req("/api/game", { action: "SPIN_MALE" }, nhu))).status,
    409,
    "no attending male draw",
  );
  assert.equal(
    (
      await api.POST(
        req(
          "/api/state",
          {
            action: "SUBMIT_MALE_RSVP",
            memberId: "huy-duong",
            attendanceStatus: "attending",
            gameCompanion: true,
            requestId: "unique-wish",
            wishContent: "Chúc vui",
          },
          admin,
        ),
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await api.POST(
        req(
          "/api/state",
          {
            action: "SUBMIT_MALE_RSVP",
            memberId: "huy-duong",
            attendanceStatus: "attending",
            gameCompanion: true,
            requestId: "unique-wish",
            wishContent: "Chúc vui",
          },
          admin,
        ),
      )
    ).status,
    200,
  );
  assert.equal(store.getState().wishes.length, 1);
  assert.equal(store.getState().wishes[0].likes, 0);
  const wishId = store.getState().wishes[0].id;
  await api.POST(req("/api/state", { action: "LIKE_WISH", wishId }, nhu));
  await api.POST(req("/api/state", { action: "LIKE_WISH", wishId }, nhu));
  assert.equal(store.getState().wishes[0].likes, 1, "likes deduped per member");
  assert.equal(
    (await game.POST(req("/api/game", { action: "SPIN_MALE" }, nhu))).status,
    200,
  );
  const spin = await (
    await game.GET(new NextRequest("http://localhost/api/game"))
  ).json();
  assert.equal(spin.gameState.selectedMaleId, null);
  assert.equal(spin.gameState.boxes[0].assignedMaleId, null);
  assert.equal(
    (await game.POST(req("/api/game", { action: "RESET_GAME" }, nhu))).status,
    403,
  );
  store.updateState((s) => {
    s.gameState.phase = "MALE_SELECTED";
    s.gameState.phaseStartedAt = Date.now();
  });
  assert.equal(
    (await game.POST(req("/api/game", { action: "BACK_TO_BOARD" }, admin)))
      .status,
    200,
  );
  assert.equal(store.getState().gameState.phase, "COMPLETED");
  const malformed = { ...store.getState(), wishes: [{ id: 42 }] };
  fs.writeFileSync(process.env.STATE_FILE_PATH, JSON.stringify(malformed));
  global.__ktcnmtStateCache = undefined;
  assert.throws(
    () => store.getState(),
    /Invalid persisted state/,
    "valid JSON with invalid record must fail closed",
  );
  const seedState = {
    ...initial,
    wishes: [
      {
        id: "wish-seed-1",
        authorId: "huy-duong",
        authorName: "D",
        content: "seed",
        likes: 8,
        createdAt: new Date().toISOString(),
      },
      {
        id: "real-wish",
        authorId: "huy-duong",
        authorName: "D",
        content: "Keep real wish",
        likes: 7,
        createdAt: new Date().toISOString(),
      },
    ],
  };
  fs.writeFileSync(process.env.STATE_FILE_PATH, JSON.stringify(seedState));
  global.__ktcnmtStateCache = undefined;
  assert.deepEqual(
    store.getState().wishes.map((w) => w.id),
    ["real-wish"],
  );
  const legacyPublic = await (
    await api.GET(new NextRequest("http://localhost/api/state"))
  ).json();
  assert.equal(
    legacyPublic.wishes[0].likes,
    0,
    "unverified legacy likes are not public real interactions",
  );
  assert.equal(
    store.getState().wishes[0].likes,
    7,
    "legacy stored count remains until actual interaction",
  );
  await api.POST(
    req("/api/state", { action: "LIKE_WISH", wishId: "real-wish" }, nhu),
  );
  const likedLegacy = await (
    await api.GET(new NextRequest("http://localhost/api/state"))
  ).json();
  assert.equal(likedLegacy.wishes[0].likes, 1);
  assert.equal(
    store.getState().wishes[0].legacyLikes,
    7,
    "original legacy count preserved privately",
  );
  assert.equal(likedLegacy.wishes[0].legacyLikes, undefined);
  const backup = fs
    .readdirSync(temp)
    .find((name) => name.includes(".before-seed-removal-"));
  assert.ok(backup);
  assert.equal(
    JSON.parse(fs.readFileSync(path.join(temp, backup), "utf8")).wishes.length,
    2,
  );
  assert.equal(
    store.createInitialBoxes(13).length,
    13,
    "all confirmed guests can have a box",
  );
  const beforeLegacyGame = structuredClone(store.getState());
  store.updateState((draft) => {
    draft.rsvps = {
      "quynh-nhu": {
        memberId: "quynh-nhu",
        attending: true,
        updatedAt: new Date().toISOString(),
      },
    };
    draft.gameState = {
      ...store.createDefaultGameState(1),
      isLive: true,
      phase: "SELECTING_BOX",
      currentQueenId: "quynh-nhu",
    };
  });
  assert.equal(
    (
      await game.POST(
        req("/api/game", { action: "OPEN_BOX", boxNumber: 1 }, nhu),
      )
    ).status,
    409,
    "legacy active game cannot grant a turn without confirmed participants",
  );
  store.updateState((draft) => Object.assign(draft, beforeLegacyGame));
  await game.POST(req("/api/game", { action: "RESET_GAME" }, admin));
  assert.equal(
    (await game.POST(req("/api/game", { action: "START_LIVE" }, admin))).status,
    409,
    "empty participant list cannot start",
  );
  await api.POST(req("/api/state", submit, nhu));
  await game.POST(req("/api/game", { action: "START_LIVE" }, admin));
  await api.POST(
    req("/api/state", { ...submit, attendanceStatus: "declined" }, nhu),
  );
  assert.equal(
    store.getDynamicQueens(store.getState()).length,
    1,
    "RSVP changes cannot mutate live roster",
  );
  assert.equal(
    (await game.POST(req("/api/game", { action: "SKIP_TURN" }, nhu))).status,
    200,
  );
  assert.equal(
    store.getState().gameState.phase,
    "COMPLETED",
    "last skip completes game",
  );
  for (const phase of ["REVEALED", "MALE_SELECTED"]) {
    await api.POST(req("/api/state", submit, nhu));
    await game.POST(req("/api/game", { action: "RESET_GAME" }, admin));
    await game.POST(req("/api/game", { action: "START_LIVE" }, admin));
    await game.POST(
      req("/api/game", { action: "OPEN_BOX", boxNumber: 1 }, nhu),
    );
    store.updateState((s) => {
      s.gameState.phase = phase;
      s.gameState.phaseStartedAt = Date.now();
    });
    assert.equal(
      (await game.POST(req("/api/game", { action: "SKIP_TURN" }, nhu))).status,
      200,
      "can decline a revealed task gracefully",
    );
    assert.equal(store.getState().gameState.phase, "COMPLETED");
  }
  await game.POST(req("/api/game", { action: "RESET_GAME" }, admin));
  await api.POST(req("/api/state", submit, nhu));
  await api.POST(req("/api/state", { ...submit, memberId: "ngoc-anh" }, anh));
  await game.POST(req("/api/game", { action: "START_LIVE" }, admin));
  const staleSkip = { action: "SKIP_TURN", expectedQueenId: "quynh-nhu" };
  assert.equal(
    (await game.POST(req("/api/game", staleSkip, admin))).status,
    200,
  );
  assert.equal(
    (await game.POST(req("/api/game", staleSkip, admin))).status,
    409,
    "duplicate admin skip must not skip the next queen",
  );
  assert.equal(store.getState().gameState.currentQueenId, "ngoc-anh");
  assert.deepEqual(store.getState().gameState.skippedQueenIds, ["quynh-nhu"]);
  assert.equal(
    (
      await api.POST(
        req(
          "/api/state",
          { action: "LIKE_WISH", wishId: "real-wish" },
          "ktcnmt_member=unknown",
        ),
      )
    ).status,
    401,
    "unknown identities rejected",
  );
  assert.equal(
    (await session.POST(req("/api/session", { memberId: "quynh-nhu" }))).status,
    200,
    "fresh browser works without environment codes",
  );
  console.log(
    "Backend storage, roster identity, privacy, RSVP, idempotency and game checks passed.",
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => fs.rmSync(temp, { recursive: true, force: true }));
