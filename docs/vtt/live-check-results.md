# Live check: what was run against the deployed site, and what was not

## Current status (read this first)

**Deployed code.** https://playsacrament.com is built by Netlify from `main`. The site does not report which commit it was built from, so that is inferred, not read from the site: `main` is at `5853936`, and it contains both fixes, in this order of the history:

| Commit | What | Time (UTC, 2026-10-19) |
|---|---|---|
| `3500bad` | **Storage-token fix**: a Blobs store is made for every request (the "Token expired" outage) | 18:38 |
| `019c4d8` | **Scene-toolbar fix**: the "Preparing" label no longer covers the toolbar | 19:03 |
| `03c4a5a` | Tests only: card lifecycle and drawing checks added to `flow.cjs` | after 19:03 |
| `5853936` | Docs only | 19:13 |

Both fixes are confirmed on the live site by what it does, not by a version number: the served `/vtt/vtt.css` contains the scene fix, and since the token fix no table read or write has failed with a storage error (a long-lived warm instance has not been observed; see the incident section below).

**Latest complete live runs** (against that site, started 19:17 UTC, from the sandbox through the proxy, real Chromium, disposable tables):

| Run | Result |
|---|---|
| `live-check.mjs` (HTTP: join, 24 simultaneous commands, retries, reordering, hidden information, runtime, strong reads) | **24 passed, 0 failed** |
| `scripts/vtt/e2e.cjs` (full browser play-through: GM and two players, whole encounter, offline banner, small screens) | **65 passed, 0 failed** |
| `scripts/vtt/flow.cjs` (clicks under load, slow and dropped replies, targeting, hearts, uploads, leave, Point, scenes, cards, drawing) | **52 passed, 0 failed** |

The e2e figure is the complete run; earlier text that said to "see the table below" for it referred to this table, which was missing from the previous version of this file. Everything below the current-status block is a dated record: where a later section corrects an earlier one, the earlier one is marked **SUPERSEDED**.

**Not verified:** the builder's publish (needs the passphrase), latency on the live site, real phones/Safari/touch, the rules against the book, a function instance kept warm for hours.

## Older record (b565df7 and after)

Site at that time: https://playsacrament.com (deployed from `main`, commit `b565df7`). These are real requests to the real function and the real Netlify Blobs store.
Nothing here is a stand-in. Run again with `node scripts/vtt/live-check.mjs https://playsacrament.com [--deep]` and
`VTT_BASE=https://playsacrament.com node scripts/vtt/e2e.cjs` (from a machine that can reach the site; here it needed `NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt`).

## The function's runtime (asked of the deployed function itself, not read from the build setting)

| Question | Answer from the live function |
|---|---|
| Node version the function runs on | **v22.23.2** (needs 22.12 or later for `@netlify/blobs` 11): met |
| Store in use | Netlify Blobs (`blobs`) |
| Strong-consistency reads available | **Yes** (the platform supplies the uncached URL) |

## HTTP checks (24 passed, 0 failed; also 23 of 23 with `--deep`)

* A table was made on the site (a real conditional write: `onlyIfNew`).
* **Join and resume:** the same join key sent three times is one player; the token resumes; the GM token resumes the GM view; a wrong or missing token is refused (401); an unknown table is 404; a taken hero cannot be claimed twice.
* **Concurrent actions, conditional writes:** 24 simultaneous commands from the GM and two players (12 ghoul hits, 4 and 3 HP edits, 3 timer ticks, a Target change and a progress change) were **all accepted, and every one is in the stored table** (ghoul 8, Thorne 6, Wisp 7, countdown 1, gate 5, Target 14). That batch took about 2.1–2.7 s because conflicting saves were retried; if saves had overwritten each other, totals would be short.
* **Retries:** the same roll sent three times at once, and again later, is one roll with one result (the same d20); Effort rolled once; Apply sent three times at once changed the gate once; a damage edit sent three times was taken once; two commands sent in the wrong order were both applied once; a late pointer did not disturb gameplay.
* **Old commands (`--deep`):** a command repeated after 410 others was refused as stale (409) and changed nothing.
* **Hidden information:** a player was never sent GM notes, a hidden card, a hidden timer's name or label, or any of HP, maximum, progress, countdown or remaining for a card whose numbers are hidden, in state, command answers or undo answers. The GM sees them. Players still see their own dice. Another person's action ids are refused.

## Browser check on the live site (59 passed, 0 failed)

The whole play-through (a GM and two players in separate browser sessions, plus a fourth and several more on a second table): join, hero choice, the gate turn in five clicks, secrets, other people's things, HP once per click, undo that leaves other changes, the countdown and its alert, loot reveal and gift, quick adds, hidden numbers, double-clicking Join, a reload in the middle of a roll, **+ Hero**, requests deliberately held back so they arrive in the wrong order, a roll while the pointer's requests are slow, laptop and phone sizes, and **a dropped connection**: the status shows *Offline: retrying*, the change is applied once when the connection returns, and it reads *Saved* again. It also found, on the first live run, that after pressing **+ Card** the panel kept showing the previous card for the length of a round trip, so typing could rename the wrong card. That is fixed (the panel says *Adding…*).

## The existing builder

* `/builder/` shows the sign-in page without a session (401); a wrong passphrase is refused (401); publishing without a session is refused (401).
* `/api/nodes` (the public read of the published library, through the upgraded Blobs client in production) answers 200 with the existing library.
* **Not checked: signing in and publishing.** That needs the designer passphrase, and publishing overwrites the live library. To check it: sign in at `/builder/`, press Publish, and confirm `/api/nodes` still answers 200.

## Not verified, and why

* **Table expiry and cleanup.** The live runs left test tables in Blobs (a few kilobytes each; there is no delete).
* **Latency under real conditions from a real player's connection.** Measured only from this environment: a command's own answer took roughly 0.2–0.6 s alone, and polling adds up to about a second. Cold starts were not isolated.
* **That the Blobs conditional write is honoured by the edge under heavy concurrency beyond 24 at once.** 24 at once held.
* **Anything about the rules themselves**: nothing is verified against any rulebook.
* Real devices and browsers other than Chromium; the touch drag on a phone; Safari.

## Notes added before the first usability playtest

* The checks above were run at the commit named at the top. Changes since then (the damage-flow target fix) have a separate section below once re-run live.
* The "Not verified" list here and the *Status of claims* table in `README.md` are meant to agree; if they differ, the README table is the later one.

### After the damage-flow fix (commit 51e11be): superseded by the section below

The first live re-run was mixed (Effort click sometimes producing nothing; one HP check failing). Causes and fixes are in the next section.

### Core-loop fixes (commit a34c7c9, plus a diagnostic change to the service)

**Causes found (both reproduced locally before any fix, in `scripts/vtt/flow.cjs`: 2 of 6 Effort clicks and 1 of 6 HP clicks lost):**
1. **Application defect: clicks lost to redraws.** The page redrew its panel and strip whenever new state arrived (every poll that carried a change, and a deferred redraw fired when focus left a box). A press that straddled a redraw (mouse down on a button, the button replaced, mouse up on its replacement) produced no click. The shorter the press and the busier the table, the rarer; a human press (about 100 ms) on a table where others are acting hits it. Fix: nothing is redrawn while a control is held down; what arrived is drawn just after the release.
2. **Test defect, and a near-miss in the interface.** In the earlier live run the new roll's Effort buttons were "ready" because the previous roll's panel was still on screen; the click went to the old roll and the new roll then replaced it. Fix in the interface: while a roll is on its way the panel shows "Rolling…" and offers nothing from the previous roll. Fix in the tests: they wait for the new roll to be the one on show.
3. Smaller: the typed Effort die was read after the panel had been redrawn (lost); the Effort and Apply buttons could be pressed again while pending; the HP strip did not show pending clicks; a refusal said only "That did not work".

**Behaviour now:** Rolling…, Rolling Effort…, Applying… are shown and the buttons are off; HP clicks show at once as pending, each is its own action, a retry of one reuses its id and applies once; a refused action says what happened and "Nothing was changed"; the target of a pending Effort is fixed when it appears and changes only with **Change target to ...**.

**Live results (playsacrament.com, after the deploy; HTTP via the sandbox proxy, real Chromium):**
* `live-check.mjs`: 24 passed, 0 failed.
* `scripts/vtt/flow.cjs` (Effort under table churn with human-length presses; six rapid HP presses under churn; 1.5 s added to every request with four rapid HP clicks; a reply lost after the server applied the change; a refused action; Effort and Apply triple-clicked on the slow line; stable and changeable target): 16 passed, 0 failed, three runs in a row.
* Full browser play-through `scripts/vtt/e2e.cjs`: 65 passed, 0 failed (one complete run).
* Locally: 139 unit tests, 65 browser checks, 16 flow checks.

**SUPERSEDED (cause found later: see "The storage outages: cause found and fixed") — was: unexplained live storage outage.** After the deploy of a34c7c9, from about 14:15 to about 14:55 UTC (2026-10-19), every attempt to make a table on the live site answered 503 "Could not make a table". That path fails only when Netlify Blobs refuses the write; server code had not changed since the last passing live run, `@netlify/blobs` is pinned at 11.1.4, and reads (`/api/nodes`) stayed up. It cleared by itself or with the following redeploy (which also added a log line and a "(storage: ...)" note to that error); **the cause was not established**, and it would have stopped a playtest. If it recurs, the function log for `vtt` will show "the store refused a write".
* Still not verified: latency on the live site, real phones/Safari/touch, the rules, the builder publish.

### Hearts deploy (commit 5b8b6a6) and a pattern of storage trouble after deploys

* Merged and deployed the HP hearts. After the deploy, **writes to the store failed again for about 2 minutes** (making a table: 503 with `storage: {"etag":"","modified":true}`, i.e. the store refused the write; this is the second time, after the 40-minute episode above). Then, for several minutes, 7 of 24 simultaneous commands answered 503 "unavailable". A further deploy (commit adding the error name to that message) followed, after which it stopped.
* **SUPERSEDED (this was a symptom of the expired Blobs token, see the later incident section; no deploy-timing rule is needed once the token fix is live).** Pattern as then understood: **storage writes are unreliable for some minutes after each deploy**. Not proven to be the cause (the two diagnostic deploys also happened in that window), and the underlying exception was never captured because it cleared before the new diagnostic was live. Practical rule: **do not deploy within about 15 minutes of a playtest, and run `live-check.mjs` just before it.**
* After it settled: `live-check.mjs` 24/24 three times in a row, `flow.cjs` 18/18, full `e2e.cjs` 65/65, all against https://playsacrament.com with the hearts live.

### Image uploads (live)

Deployed and run against https://playsacrament.com: `live-check.mjs` 24/24; `flow.cjs` 23/23 including section 9 (a background and a card picture uploaded by the GM, fetched by a player as `image/webp`, and a non-picture refused with the background unchanged); full `e2e.cjs` as reported below. Not tested live: a large real photo (the tests use a 1-pixel PNG, so the in-browser shrinking of big images and the 2.5 MB limit are exercised only by unit tests), and Safari/phones.

### The storage outages: cause found and fixed (2026-10-19, during the first playtest)

During the playtest the table showed "Offline: reconnecting". Reads of the live table answered 503 with `BlobsInternalError: Netlify Blobs has generated an internal error (Failed to decode token: Token expired)`.

**Cause (application defect).** The function made its Blobs store once and kept it for the life of the warm function instance. The store carries an access token that Netlify issues and that expires; a warm instance that kept one answered every request with "Token expired" until it was recycled. A fresh deploy brings fresh instances, which is why trouble followed deploys: old and new instances answered at random, so some requests worked and some failed (the "7 of 24 returned 503" and the two multi-minute episodes earlier). The earlier note "storage is unreliable after deploys" was a symptom, not the cause.

**Fix.** `makeHandler` in `netlify/functions/vtt.mjs` makes the store and service for every request, and `builder.mjs` no longer keeps its store either (same latent bug; the builder publish path was never exercised live). Regression tests in `test/vtt-blobs-client.test.mjs`: the mock refuses a replaced token, a kept store is shown to fail, and the handler is shown to make a store per request (a table can be made and used across requests while each earlier token is refused).

**Live after the fix:** `live-check.mjs` 24/24 in 7 of 8 runs (the other run's one failure is the next item); `flow.cjs` 23/23. The fix has not yet been observed across a long-lived function instance (hours); if "Token expired" returns, that would show the token is also refused within a request.

**A flaky check, fixed.** One live run failed "no hidden figure reaches a player" on the number `89`. The check looked for the digits anywhere not next to another digit, so `89` inside a random token (for example `Ab89x`) counted. It is a false positive of the check, not a leak (six further live runs passed); the check (and the same pattern in `test/vtt-playtest.test.mjs`) now ignores digits that touch letters, and still catches `now 71/89` and JSON numbers.

### Regression check after "scene management stopped working" (scene fix deployed)

**Scene management: what broke.** While a scene was being *prepared* (the GM chose or made a scene other than the live one), the amber "Preparing: players do not see this scene" label sat on top of the toolbar and took the clicks. At 1366 px wide **+ Obstacle and + Card** were covered; at 1100 px **+ Enemy** too; at 900 px **Point, Draw and + Enemy**. So a GM could make and name a scene but could not then put anything in it, which reads as "scene management is broken". Nothing in the scene commands, saving or visibility had changed: the scene lifecycle itself (create, prepare, add cards, background, reveal, switch back, reload) worked and still works.

**Which change introduced it.** Commit `dabbc55` ("Sacrament RPG Table stabilisation"), which added **+ Enemy** and **+ Obstacle** to the toolbar. Before it the toolbar was short enough to stay clear of the centred banner; the layout files themselves were untouched. Established by measuring button boxes and `elementFromPoint` against the banner at 1366/1100/900/700/390 px on `dabbc55` and on `HEAD` (both overlap, identically); the original table (`4992da0`) has a different scene panel and could not be compared directly. It was not found earlier because the browser tests only *looked at* a prepared scene and never pressed a toolbar button while preparing.

**Fix.** The banner moves to the bottom centre of the table and no longer takes clicks (an alert's own buttons still do). One CSS rule. Regression test: `flow.cjs` section 12 presses + Enemy, + Card, + Obstacle, Point, Draw and Select with real clicks while a scene is being prepared, with the GM's connection slowed; with the old CSS that test times out on the first click.

**What the new scene tests also verify** (local and live): creating and naming a scene; preparing it privately with the players' live scene unchanged; its cards absent from the players' state and from every raw answer they were sent; a background on that scene only; reveal; choosing the first scene (prepares it, players stay on the Crypt); returning (same cards, same position and HP for the ghoul, the countdown's value, the GM's private notes); reload of both screens. **Rename, reorder and delete scenes never existed** in the Sacrament RPG Table: checked in Git history, all 10 versions of `site/vtt/vtt.js` (from the first, `4992da0`) have the same scene controls (the scene chooser, Prepare, Reveal, a background address, and a per-card Scene chooser) and none has a rename, reorder or delete control or sends a rename; there is no scene delete or reorder command in the server in any version (`git log -S` for `sceneDelete`, `sceneRename`, `sceneRemove`, `sceneOrder`, `sceneReorder` and their variants finds nothing). The server's `sceneUpdate` accepts a `name`, but no version of the page has ever sent one, so renaming is a server capability that was never put in the interface. (The other "scene" in the repository, in the Sacrament table `/play/`, is its Target Number selector, and in the archived earlier game it is only text.) So these are missing features, not regressions, and none was tested. The Target is table-wide by design, not per scene.

**Results.** Local: 149 unit, 65 browser, 52 flow, hearts-ui 51, table-test 39 and 10. Live (https://playsacrament.com after the deploy): `live-check.mjs` 24/24 twice, `flow.cjs` 52/52, `e2e.cjs` 65/65 (the complete run is in the current-status table at the top); the site pages `/`, `/play/`, `/character/`, `/rules/`, `/resources/`, `/adventure/`, `/blog/`, `/vtt/` and `/api/nodes` answer 200 and `/builder/` answers 401 (the passphrase gate, as designed). The builder's publish was not run.


### Usability fixes and the second walkthrough (2026-10-19, evening)

Changes (all in `site/vtt/vtt.js`, `vtt.css`, the home page and Resources, one in the server's `project()`): queued HP shown beside every HP control; no fresh attempt after a failure until the table has been read again; the reason on the status pill and a request log (`window.__vtt.net()`); "(you)" and "(acting)" identity; a route in from the home page and Resources; invitation links lead with Join; a roll hint on a selected enemy or obstacle; disclosure marks; the no-heroes wording; a phone layout (scene stays full width, panel can be put away, one-row toolbar, scroll with the stat strip pinned); and four defects the second walkthrough found, each with a failing-then-passing regression test:
1. **A GM's unassigned heroes were all marked "(you)"** (`null === null`: a GM has no player id and an unassigned hero has no owner). Now players' own hero says "(you)" and the GM's acting hero "(acting)", matching the strip.
2. **Edits lost when moving between fields in the hero panel.** A redraw held back while typing fired when focus moved from one field to the next and destroyed the field just clicked into (Weapons stayed 0 after typing 3). It now waits until focus leaves the panel's fields.
3. **A focused checkbox froze the figures beside it** (lowering a countdown's maximum left "now" showing 4 while the card said 2).
4. **A roll left open when the players were moved to another scene**, and a roll applied to a card they can no longer see, read "Not applied yet". The page now clears it on a scene change and the server tells the player it was applied without naming the card.
Also: the home page header grew a second row and the rune graphic sat over the buttons once the Sacrament RPG Table button was added (found in the walkthrough; fixed and tested).

**The seven-second delay: cause UNKNOWN.** The captured delay was on the GM's page: three HP presses showed "Saving…" for about 7 s and then "Offline: retrying", and all three applied once. At that moment `curl` to the live function answered in about 0.3 to 0.5 s, and a later `live-check.mjs` passed 24/24. Request timing from a real browser to the live site (6 rounds of three presses, with and without two other browsers polling): each POST 170 to 280 ms, polls median 146 ms, none failed. The page now records every request (time, kind, status, duration, reason) so that the next occurrence can be read instead of guessed at, and the pill's hover text says why it is retrying. The "Offline: retrying" seen again during the second walkthrough (adding a card) also cleared by itself within seconds. Nothing in the evidence points to Netlify or to the sandbox's proxy more than the other; both remain possible.

**Live results after the final deploy:** `live-check.mjs` 24/24; `flow.cjs` 83/83 (run twice, the first run had two counting checks that treated a resend of the same action as a second action; they now count distinct action ids); `e2e.cjs` 65/65. Local: 150 unit tests, 65 browser, 83 flow, hearts-ui 51; `table-test` passes 39 or 37 (its count varies between runs on unchanged code: two Sacrament-table checks are timing-dependent; not touched by this work).
