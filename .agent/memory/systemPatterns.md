# System Patterns: KTCNMT 20/10 Event Web App

## Tech Stack
- **Framework:** Next.js 14+ (App Router), TypeScript, React 18.
- **Styling & UI:** Tailwind CSS, `lucide-react`, `canvas-confetti`, CSS keyframes & transitions.
- **Persistence (Zero-DB Config):**
  - Single JSON state file at `/app/data/state.json` (mapped via `./data:/app/data` volume in Docker, or `process.cwd() + '/data/state.json'`).
  - Cached in `globalThis` for fast reads/writes with atomic write-through to disk.
  - Auto-initialized with sensible default state if `/app/data/state.json` does not exist.
- **API Routes:**
  - `GET / POST /api/state`: Manages RSVPs, milk tea pre-orders, wishes, and wish likes.
  - `GET / POST /api/game`: Manages synchronized Mini-Game state machine (`WAITING`, `SELECTING_BOX`, `SHAKING`, `REVEALED`, `SPINNING_MALE`, `MALE_SELECTED`), host controls, blind box assignments, and male roulette selection.
- **Smart Avatar Component (`<MemberAvatar />`):**
  - Loads `/avatars/{id}.jpg` and falls back on error to a glowing gradient circle with 2-letter initials.
