# Sacrament optimisation pass 1

Based on the original uploaded `sacramentweb-main.zip`, not the experimental VTT 2.0 variants.

## Verified
- Node 22.16.0: production build passes.
- `npm test`: 341 tests pass; one test file fails to load because `@netlify/blobs` is not installed in this environment. This is a test-environment blocker, not proof of an application bug.
- `node --check site/vtt/vtt.js`: passes.

## Fix made
- `site/vtt/vtt.js`: distinguish `pointercancel` from `pointerup`. Previously both invoked `endPointer()` and a cancelled token drag could be committed as a move; an interrupted drawing gesture could also be submitted. Now cancellation clears the temporary gesture and redraws without sending it. Normal pointerup remains unchanged.

## Still unverified
- Live multiplayer browser flows, cross-client sync, Netlify Blobs integration, and real touch-device behaviour. The new fix has not been exercised in a browser and should be tested on a staging site before production deployment.

## Next investigation
- Run `npm ci` and full tests in a network-enabled environment.
- Run existing `npm run vtt-e2e`, `npm run vtt-flow`, and latency tests.
- Measure common GM workflows before making UX changes.
