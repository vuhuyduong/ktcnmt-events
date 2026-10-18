// Run: node scripts/countdown-test.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

require.extensions[".tsx"] = (module, filename) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2020,
      },
    }).outputText,
    filename,
  );

const { getEventCountdown } = require("../src/components/EventCountdown.tsx");
assert.equal(
  typeof getEventCountdown,
  "function",
  "countdown exposes its time-based state",
);

// Check consecutive ticks around each phase boundary, including UTC input.
for (const [time, remaining, label] of [
  ["2026-10-18T19:00:00+07:00", 86400, "19:00 · 19/10/2026"],
  ["2026-10-19T18:59:59+07:00", 1, "19:00 · 19/10/2026"],
  ["2026-10-19T19:00:00+07:00", 0, "19:00 · 19/10/2026"],
  ["2026-10-19T19:59:59+07:00", 0, "19:00 · 19/10/2026"],
  ["2026-10-19T20:00:00+07:00", 43200, "08:00 · 20/10/2026"],
  ["2026-10-20T07:59:59+07:00", 1, "08:00 · 20/10/2026"],
  ["2026-10-19T13:00:00Z", 43200, "08:00 · 20/10/2026"],
]) {
  const state = getEventCountdown(Date.parse(time));
  assert.ok(state, `countdown is visible at ${time}`);
  assert.equal(state.remaining, remaining, `remaining seconds at ${time}`);
  assert.ok(state.label.startsWith(label), `target label at ${time}`);
  assert.match(state.ariaLabel, /giờ Việt Nam/, `accessible timezone at ${time}`);
}

for (const time of [
  "2026-10-20T08:00:00+07:00",
  "2026-10-20T19:00:00+07:00",
  "2026-10-21T00:00:00+07:00",
]) {
  assert.equal(getEventCountdown(Date.parse(time)), null, `hidden at ${time}`);
}

console.log("Countdown targets, boundaries, timezone and expiry checks passed.");
