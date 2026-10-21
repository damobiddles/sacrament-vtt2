# Sacrament — Optimisation Pass 2

## Scope
Original Claude-built `/vtt/` codebase with the Pass 1 pointer-cancellation fix. No VTT 2.0 redesign code included.

## Executed checks
- `node --test test/*.test.mjs`: **341 passed, 1 failed to load**, 342 total, ~4.7 seconds.
- Failed file: `test/vtt-blobs-client.test.mjs`, because `@netlify/blobs` is not installed in this environment. This is an environment failure, not a demonstrated application regression.
- `node scripts/vtt/latency.cjs 3`: **not run successfully** because Playwright could not be resolved; no latency numbers were obtained.

## Findings and priorities
1. **P0: complete environment setup.** Install locked dependencies, then rerun full tests, lint and typecheck. Don't interpret a missing package as a Sacrament defect.
2. **P1: multiplayer latency baseline.** Run `npm run vtt-latency` with a working Chromium/Playwright installation; collect median and p95 for GM-to-player state propagation. Existing benchmark tests target changes with 0, 150 and 400 ms injected delays.
3. **P1: gesture regression.** Browser-test pointercancel during token movement and ink drawing; confirm no server commands are sent and the visual state resets. Pass 1 changes this path but it has not yet been browser-tested.
4. **P1: concurrency and reconnect.** Use the existing GM/player browser flow tests to check simultaneous actions, late replies, scene changes and refresh/rejoin.
5. **P2: focus and rerender.** Review `site/vtt/vtt.js` panel updates using `innerHTML`, particularly while editing card fields and during polling. Existing code includes guards against replacement during pointer presses; measure actual failures before changing them.

## Release gate
No production release recommendation until all dependencies are installed, the full suite passes, the browser flows complete, and a GM/player scenario has been checked interactively.

## Code changes in this pass
No new source modifications. The earlier pointer-cancellation fix remains the only code change in the current optimisation branch. This pass is a measured diagnostic update, not a new feature release.
