# StructureMyLearning UX Mocks

Phase 1 UX mocks are available as a static review board:

- [Open the UX mock board](ux-mocks/index.html)
- Desktop frames target `1440 x 900`.
- Mobile frames target `390 x 844`.

## Screens Covered

- Login and registration auth pattern.
- Dashboard with guide cards, progress, empty state direction, and delete confirmation pattern.
- New Guide prompt entry and generation loading state.
- Guide detail outline with ordered topics and completion status.
- Topic detail reading experience with markdown-style lesson content.
- Account settings.
- 404 fallback.

## Design Direction

- Quiet learning-workspace interface with high scanability.
- Neutral canvas, restrained ink colors, blue primary actions, green progress, amber generation status, and red destructive actions.
- Cards use 8px radius or less.
- App shell navigation stays compact on desktop and becomes a bottom tab bar on mobile.
- AI generation states reserve stable space so screens do not jump during 5-15 second waits.
- Reading views prioritize line length, topic context, and previous/next navigation.

## Review Notes

These mocks are static design artifacts, not application scaffold code. They intentionally live under `docs/` so Phase 2 can still create the real `client/` and `server/` directories after approval.
