# KTCNMT interaction contract

The approved 17/10/2026 audit is the implementation brief. Runtime permissions are enforced in `src/lib/auth.ts` and API routes; invite setup and data lifecycle are documented in `README.md`. `DESIGN.md` records visual direction; `src/app/globals.css` owns runtime tokens.

| Capability     | Canonical owner         | Source of truth  | Allowed variants                                                                                      | Verification                                                                 |
| -------------- | ----------------------- | ---------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Select/Listbox | Native select           | src/app/page.tsx | Platform-owned mobile popup and keyboard handling are intentional                                     | Narrow viewport, keyboard selection and long options                         |
| Form           | Registration form       | src/app/page.tsx | Explicit attendance, transport and beverage groups; no preselected answers; app-owned text validation | Delayed initialization, dirty draft, save failure, independent RSVP/beverage |
| Navigation     | Bottom navigation       | src/app/page.tsx | Three pages, scroll to heading on explicit navigation; presentation hides unrelated chrome            | Keyboard, narrow viewport, tab change does not lose draft                    |
| Feedback       | Inline status and error | src/app/page.tsx | Persistent saved summary, local errors, destructive confirmation inline                               | HTTP failures, offline, reset failure, screen reader live status             |

Inputs remain native and labels are associated. Form validation uses text errors and focuses the first invalid field; server validation remains authoritative. Pending saves disable fields to preserve the exact submitted draft. Textareas use content sizing with a minimum height. Changing member warns before discarding edits; navigation between pages preserves the draft.

Public readers see the event invitation, voluntarily published wishes and game stage. Only the authenticated member can edit their RSVP and beverage selection; only a separately authenticated administrator receives logistics and host controls. Common links remain readable before invite configuration; no identity or permissions are derived from localStorage.

Game participants are snapshotted from confirmed RSVPs when the administrator starts. Confirmation is not check-in: the administrator must reconcile actual presence and available gifts first. Unopened rewards and pending roulette results stay server-side. No test or seed activity is production content.
