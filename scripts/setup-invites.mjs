#!/usr/bin/env node
// Generate credentials offline. Never run this against a deployed state file.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
function option(name) {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
}
const outputArg = option("--output-dir");
const baseArg = option("--base-url");
if (!outputArg || !baseArg || args.length !== 4) {
  console.error(
    "Usage: node scripts/setup-invites.mjs --base-url https://event.example --output-dir /private/path/outside-repo",
  );
  process.exit(1);
}
const base = new URL(baseArg);
if (
  !["http:", "https:"].includes(base.protocol) ||
  base.username ||
  base.password ||
  base.search ||
  base.hash
)
  throw new Error(
    "Use an HTTP(S) app URL without credentials, query, or fragment.",
  );
fs.mkdirSync(path.resolve(outputArg), { recursive: true, mode: 0o700 });
const output = fs.realpathSync(path.resolve(outputArg));
const repo = fs.realpathSync(root);
if (output === repo || output.startsWith(`${repo}${path.sep}`))
  throw new Error("Credential output must be outside the repository.");
fs.chmodSync(output, 0o700);
const source = fs
  .readFileSync(path.join(root, "src/data/roster.ts"), "utf8")
  .split("export const STAFF_MEMBERS")[1]
  .split("export const FEMALE_MEMBERS")[0];
const members = [
  ...source.matchAll(/^\s*\{\s*id: "([^"]+)",([\s\S]*?)^\s*\},/gm),
].map((match) => ({
  id: match[1],
  name: match[2].match(/shortName: "([^"]+)"/)[1],
  isHost: /isHost: true/.test(match[2]),
}));
if (!members.length || !members.some((member) => member.isHost))
  throw new Error(
    "Could not identify roster and host; no credentials created.",
  );
const secret = () => randomBytes(32).toString("base64url");
const codes = Object.fromEntries(
  members.map((member) => [member.id, secret()]),
);
const admin = secret();
const writePrivate = (name, content) =>
  fs.writeFileSync(path.join(output, name), content, {
    mode: 0o600,
    flag: "wx",
  });
const link = (id, code) => {
  const url = new URL(base);
  url.hash = new URLSearchParams({ member: id, code }).toString();
  return url.toString();
};
writePrivate(
  "event-auth.env",
  `EVENT_SESSION_SECRET=${secret()}\nEVENT_MEMBER_CODES_JSON='${JSON.stringify(codes)}'\nEVENT_ADMIN_CODE=${admin}\nSTATE_FILE_PATH=/app/data/state.json\nEVENT_PUBLIC_ORIGIN=${base.origin}\n`,
);
writePrivate(
  "member-invitations.tsv",
  "name\tmemberId\tinvitationUrl\n" +
    members
      .map(
        (member) =>
          `${member.name}\t${member.id}\t${link(member.id, codes[member.id])}`,
      )
      .join("\n") +
    "\n",
);
writePrivate(
  "host-invitations.tsv",
  "name\tmemberId\tinvitationUrl\n" +
    members
      .filter((member) => member.isHost)
      .map(
        (member) => `${member.name}\t${member.id}\t${link(member.id, admin)}`,
      )
      .join("\n") +
    "\n",
);
console.log(
  `Private configuration and invitation files written to ${output}. Existing files are never overwritten. Distribute only each person's own link; keep host links private.`,
);
