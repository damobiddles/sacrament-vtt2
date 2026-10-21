# Optimisation Pass 3: multi-pointer gesture isolation

## Confirmed source-level issue
The original pointer handlers did not check `pointerId` on `pointermove` or `pointerup`. With a second touch/pointer active, its movement could affect a first pointer's token drag or ink gesture, and its release could commit the first gesture.

## Change
- Ignore secondary pointer-down events while a gesture is active.
- Bind drawing and pointing to the initiating pointer.
- Bind token drag movement and completion to the original pointer ID.
- Preserve the Pass 1 cancellation handling.
- No rules, server API, permissions or storage formats changed.

## Verification
- `node --check site/vtt/vtt.js`
- `npm run build`
- Browser multi-touch and multiplayer regression tests remain required. Do not claim those passed.

## Manual reproduction
On a touch-capable device, start dragging a token with one finger. Place and move a second finger, then release it. The token must remain controlled by the first finger and only commit when that finger releases. Repeat with drawing and pointing tools. Cancel the first gesture to confirm no action is sent.
