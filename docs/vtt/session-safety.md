# Table safety and recovery

A table keeps its own connection state. Replies, retries, pointer updates and unfinished image uploads from a previous table must not affect a table opened afterwards. Gameplay pauses while an uncertain save is checked, then queued actions continue after a successful read.

Each possession at a table has a persistent `key`, distinct from its catalogue `id`. Two identical swords have different keys. Equipment commands (`sheet` remove/move and `useItem`) must send `gearKey` from the displayed possession. The server resolves that key rather than trusting an array position. Existing saved tables acquire keys automatically without removing items. Older open pages that send only positions receive a message asking them to refresh. A removed key is never reassigned to a new possession.

Heart-granting equipment changes maximum health while preserving existing wounds. A hero at 15/20 becomes 5/10 when the extra Heart is removed, and returns to 15/20 when it is equipped again. Equipment never raises a hero who is already at zero. If removing an extra Heart puts a living hero at zero, the normal dying countdown starts.

The Table tab offers **Save your recovery link**. This displays a private link and **Save recovery file**, which downloads a text file containing that link. Keep it somewhere safe and private: anyone holding it can return with your access. If the browser cannot remember the table, this warning appears automatically. The link can reopen the table even when browser storage is blocked. A recovery file does not expire or revoke older links.

Regression checks:

- `node --test test/vtt-safety-regressions.test.mjs`
- `CHROMIUM=/usr/bin/chromium npx playwright test e2e/session-recovery.spec.mjs --workers=1`

Run browser/build checks in a disposable validation copy: the current landing-page generator rewrites tracked HTML. Before publishing, run `npm run check:full`, which includes the fast phone check. The wider audit contains additional improvements beyond these safety fixes.

## Safer play and map controls

Local hero reads retain every existing valid hero, including lists above 30. Creation and conversion stop at 30; existing heroes can still be selected, edited and downloaded. Failed writes are visible, retain the latest in-memory changes and offer retry plus a JSON download. Unreadable stored JSON is not overwritten; the download includes it for recovery. The download currently preserves data for recovery; a file-import screen is not part of this change.

The GM's Table tab removes a player only after a second confirmation. Their credential is revoked, their heroes become unowned, private possessions return hidden, and their place is freed. Rejoining with the same invitation is allowed but receives a fresh credential, including when the browser reuses its previous join-attempt key. Old saved join credentials remain compatible until removed.

Drawings and pointers carry a scene ID. Players receive only the live scene's annotations, including on pointer-only polls; the GM can prepare annotations privately. Existing unscoped annotations attach to the previously live scene before any scene change. Undo and Clear affect the selected scene only; drawing at capacity does not evict another scene's ink. Older GM pages without a scene ID must refresh before annotating a multi-scene table. Test requests and the HTTP checker send the current scene explicitly.

Live sheets offer Ready to use above the build fields. These buttons use the same stable possession keys and authoritative item actions as the existing equipment controls.

Fill width changes only the local viewport. The board remains 16:10 and keeps its normalized coordinates; the viewport scrolls vertically when necessary. Fit map restores the whole-board view. The map controls remain outside the scrolling content.
