# Active Context: KTCNMT 20/10 Event Web App

## Current Focus
Updated local Docker port to `2010` (`http://localhost:2010`), integrated 11 member profile photos into `public/avatars/` with custom face focal framing in `MemberAvatar.tsx`, added `railway.json` & production build in `Dockerfile`, and initialized the Git repository (`main` branch, remote `git@github.com:vuhuyduong/ktcnmt-events.git`).

## Recent Changes
- **Port Change (`2010`):** Updated [package.json](file:///home/antigravity/workspace/ktcnmt-events/package.json), [Dockerfile](file:///home/antigravity/workspace/ktcnmt-events/Dockerfile), and [docker-compose.yml](file:///home/antigravity/workspace/ktcnmt-events/docker-compose.yml) to use port `2010` locally (`${PORT:-2010}` for seamless Railway compatibility).
- **Member Avatars Integrated:** Extracted 11 member photos (`quynh-nhu.jpg`, `ngoc-anh.jpg`, `my-dung.jpg`, `quynh-nga.jpg`, `mong-bang.jpg`, `anh-thai.jpg`, `manh-cuong.jpg`, `van-thuan.jpg`, `ba-kien.jpg`, `gia-khang.jpg`, `hai-minh.jpg`) into `public/avatars/` and added `AVATAR_FOCUS_CLASSES` in [MemberAvatar.tsx](file:///home/antigravity/workspace/ktcnmt-events/src/components/MemberAvatar.tsx) so full-body and portrait shots center cleanly on each member's face.
- **Git & Railway Preparation:** Created [.gitignore](file:///home/antigravity/workspace/ktcnmt-events/.gitignore), [railway.json](file:///home/antigravity/workspace/ktcnmt-events/railway.json), updated [README.md](file:///home/antigravity/workspace/ktcnmt-events/README.md) with Railway deployment guide, and committed all files to `main`.

## Next Steps
- Verify container startup on port `2010` (`http://localhost:2010`).
- Provide GitHub push command / repository creation instructions and Railway deployment guide to user.
