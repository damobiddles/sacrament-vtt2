# Table safety and recovery

A table keeps its own connection state. Replies, retries, pointer updates and unfinished image uploads from a previous table must not affect a table opened afterwards. Gameplay pauses while an uncertain save is checked, then queued actions continue after a successful read.

Each possession at a table has a persistent `key`, distinct from its catalogue `id`. Two identical swords have different keys. Equipment commands (`sheet` remove/move and `useItem`) must send `gearKey` from the displayed possession. The server resolves that key rather than trusting an array position. Existing saved tables acquire keys automatically without removing items. Older open pages that send only positions receive a message asking them to refresh. A removed key is never reassigned to a new possession.

Heart-granting equipment changes maximum health while preserving existing wounds. A hero at 15/20 becomes 5/10 when the extra Heart is removed, and returns to 15/20 when it is equipped again. Equipment never raises a hero who is already at zero. If removing an extra Heart puts a living hero at zero, the normal dying countdown starts.

The Table tab offers **Save your recovery link**. This displays a private link and **Save recovery file**, which downloads a text file containing that link. Keep it somewhere safe and private: anyone holding it can return with your access. If the browser cannot remember the table, this warning appears automatically. The link can reopen the table even when browser storage is blocked. A recovery file does not expire or revoke older links.

Regression checks:

- `node --test test/vtt-safety-regressions.test.mjs`
- `CHROMIUM=/usr/bin/chromium npx playwright test e2e/session-recovery.spec.mjs --workers=1`

Run browser/build checks in a disposable validation copy: the current landing-page generator rewrites tracked HTML. Before publishing, run `npm run check:full`, which includes the fast phone check. The wider audit contains additional improvements beyond these safety fixes.
