# Active Context: KTCNMT 20/10 Event Web App

## Current Focus
Completed ACV favicon & logo integration, updated venue to **The Street (Chi nhánh 9) – 134 Nguyễn Thái Học, P. Bến Thành** at **19h00 ngày 19/10**, and implemented dynamic female attendee & Blind Box scaling (`5 bạn nữ KTCNMT + Vợ/Bạn gái của các bạn nam`, pre-seeded with Vợ Anh Thái & Vợ Anh Cường).

## Recent Changes
- **Favicon & ACV Logo:** Generated square favicon ([icon.png](file:///home/antigravity/workspace/ktcnmt-events/src/app/icon.png), [apple-icon.png](file:///home/antigravity/workspace/ktcnmt-events/src/app/apple-icon.png), [favicon.ico](file:///home/antigravity/workspace/ktcnmt-events/public/favicon.ico)) and header badge ([acv-logo.png](file:///home/antigravity/workspace/ktcnmt-events/public/acv-logo.png)) from the uploaded ACV logo.
- **Event Venue & Time Update:** Updated [roster.ts](file:///home/antigravity/workspace/ktcnmt-events/src/data/roster.ts) and [page.tsx](file:///home/antigravity/workspace/ktcnmt-events/src/app/page.tsx) to **The Street (Chi nhánh 9)**, `19h00 ngày 19/10`, `134 Nguyễn Thái Học, P. Bến Thành`, Google Maps link `https://maps.app.goo.gl/j3tjn4kV7pEUrBmY7`.
- **Dynamic Female Count & Blind Boxes:** Updated [store.ts](file:///home/antigravity/workspace/ktcnmt-events/src/lib/store.ts), [state/route.ts](file:///home/antigravity/workspace/ktcnmt-events/src/app/api/state/route.ts), and [game/route.ts](file:///home/antigravity/workspace/ktcnmt-events/src/app/api/game/route.ts) with `getDynamicQueens()` and `syncBoxesWithQueens()`. Pre-configured `anh-thai` and `manh-cuong` with `hasPlusOne: true` (default 5 + 2 = 7 chị em & 7 hộp Túi Mù, automatically growing/shrinking as male members toggle `+1`).

## Next Steps
- Commit and push changes to GitHub (`origin/main`) for automatic Railway deployment.
