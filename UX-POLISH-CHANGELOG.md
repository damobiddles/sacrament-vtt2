# Sacrament VTT: UI spacing and UX polish

This is a conservative, CSS-only refinement of the latest no-top-bar version. It does not change any JavaScript, rules, server functions, session storage or multiplayer behaviour.

## Changes
- More consistent padding and vertical rhythm in the inspector, GM sections and entry forms.
- Slightly more flexible desktop inspector width, while preserving the map-first layout.
- Clearer spacing between character actions, steppers and encounter rows.
- Improved activity log and player-strip spacing without introducing new panels.
- Consistent keyboard focus rings, disabled cursor states and hover feedback.
- Narrow-screen adjustments to avoid desktop padding wasting mobile space.
- Reduced-motion support for new hover transitions.

## Verify manually
Open a GM table, select a token, use all GM tabs, scroll the inspector, expand activity, roll from the player strip, and test a 375px-wide phone viewport. Confirm the map remains usable and no control is clipped. No browser-interaction test was completed for this CSS pass.
