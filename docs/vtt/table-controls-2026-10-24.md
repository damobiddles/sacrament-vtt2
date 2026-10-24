# Table controls and brand updates — 24 October 2026

Owner-approved scope: current brand fonts, YouTube footer link, a Ko-fi cup-logo badge, scene deletion, d10 rests with existing scaling, obstacle attacks and GM-controlled turns. The owner explicitly chose **Hold the GM layout redesign** after two compact-layout attempts failed. The player-style GM strip and stronger visual GM/player role distinction are therefore deferred, and the existing GM layout is retained.

## Implemented

- Brand font downloads now provide Cormorant Garamond upright/italic variable fonts and Source Sans 3, with their Open Font Licences. All four horizontal/stacked wordmarks use outlined Cormorant Garamond Bold (700); the original rune groups remain intact.
- The shared public footer links to the requested Dungeon Jukebox YouTube channel. The support badge has a locally stored Ko-fi cup mark, preserving readable text and the same donation destination without the remote widget.
- The GM can delete a non-live scene after an explicit confirmation. The live/last scene is protected by the server. Scene cards, drawings and pointers are cleaned up; heroes, their equipment and privately held cards survive. Uploaded pictures are retained because other scenes may reference them. Another GM tab leaves a deleted prepared view when its state updates. The confirmation state resets between tables and repeated presses are guarded.
- Party rest uses d10s to reduce Horror, retaining one die per two living heroes, rounded up. Healing, rest allowances, dead-hero handling, old roll history and Undo behavior are preserved.
- A selected obstacle can use the existing Attack a hero workflow, as an enemy can. Standalone GM dice remain available. The GM hero-roll option is retained for covering an absent player or helping with a roll while its redesign is on hold.
- Only the GM advances turns. The GM button says Next turn; players have no End Turn button, their guidance tells them to notify the GM, and forged player endTurn commands are rejected by the server.

## Verification

The new rules/permission tests failed before implementation and pass afterwards. The final quick/full run passed 439 unit cases; two browser expectations still referred to d6 rest text and non-attacking obstacles. Those expectations were updated for the owner-approved behavior. The affected 13 browser cases then passed, including scene confirmation/cancellation, obstacle damage, GM turn advancement and brand/footer assets. The main browser run and affected rerun together cover 132 laptop cases, with one existing skip. Full contrast groups, compatibility suites (65/75/26), and the required phone smoke check pass. Lint and type checking pass with the existing 52 lint warnings and zero errors. No limits were increased or accessibility/privacy checks waived.

The held redesign was removed rather than concealing the compact-layout problem. The original sheet focus/reflow test at 683×500 passes again using the existing GM strip. Moving GM hero controls into a new compact layout and adding role-colour headers remain follow-up work; the attempted panel-based route could cover controls at that size.

Evidence is under `/workspace/sacrament-audit/`: `gm-full-final.log`, `gm-release-checks.log`, `gm-units-fixed.log`, `gm-brand.log`, `current-brand-fonts.png` and `current-logo-wordmarks.png`. Live verification uses disposable tables only. Physical devices, Safari and GitHub workflow status remain unverified from this environment.
