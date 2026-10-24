# Character creation and first-session guidance — 24 October 2026

Requested by the owner: easier character creation, onboarding and separate rules breakdowns for players and GMs. This changes guidance and the entry journey, not game arithmetic, stored keys, permissions or existing characters.

## Changes

- My heroes explains generate → keep/customise → join/bring. Each focus has a short description. Suggested names and vows can be edited before keeping, and a disclosure explains the numbers.
- Saving a generated hero focuses the next-step heading. Saved sheets show unspent score/Effort points or equipment warnings. Join and backup/restore links are easy to find; the sheet now precedes the backup controls.
- Joining explains player name versus character. Unclaimed players can create a hero in a separate tab, then bring it without reloading the table. A storage/focus listener refreshes the unclaimed player's view. Bring resolves by stable local hero ID rather than list position.
- Claimed players have an expandable first-turn checklist and help links that open separately from their table.
- `/how-to-play/` is a short role-based checklist. `/player-guide/` and `/gm-guide/` explain the current rules, with linked contents and examples. They distinguish VTT automation, table options and GM rulings. All pages are public and contain no private setting material.
- `/rules/` links to the current guides first. The earlier tabletop draft is retained, explicitly labelled and collapsed because it contains proposals that differ from the VTT.
- My heroes and both guides explain that local heroes and their table copies are independent. Existing backup/restore, migration, storage limits and failure handling remain in place.

## Verification

The initial full release run passed lint, type checking, 434 unit tests and quick contrast. Laptop browser coverage passed 120 cases with one existing skip; two failures were investigated: a new guide assertion said “and” where the GM text said “or”, and the existing dialog test sampled focus before its asynchronous restoration. The assertions now accept the actual wording and wait for the exact opening button to regain focus, respectively. The latter is stricter than merely checking focus is not on the body.

The new-tab hero refresh bug was reproduced by a browser test failing to find the newly kept hero at an idle table. The storage/focus refresh and stable-ID selection fixed it. The affected run passed all 16 selected cases, covering both failures, creation, backups, claiming/bringing and live character sheets. One pre-existing phone case in the selected sheet file ran incidentally; this was not a full phone suite. Ordinary coverage skips phone cases.

Full laptop contrast including both new guide pages passed. Compatibility checks finished at 65/65, 75/75 and 26/26. The flow check caught an omitted explicit empty-table status; the guidance now keeps “There are no heroes yet” alongside the new creation route. The reference-page check now opens the earlier-draft disclosure before checking its unchanged tables and Horror example. The final three onboarding cases also passed again.

The required 360×640 smoke check caught overlapping help-link bounding boxes on the entry page. A wrapping flex layout gives each link its own area; the unchanged smoke check then passed. The final laptop entry screen also passed a WCAG A/AA axe check and was visually inspected. No test limits were raised and no assertions about game behavior were removed. Passing evidence is in `onboarding-final-checks.log` (full contrast and 65-case suite), `onboarding-final-affected.log` (onboarding and 75-case suite), `onboarding-release-last.log` (26-case suite) and `onboarding-phone-fixed.log`. The main and affected browser runs together cover the full laptop set plus the new second-tab regression.

Screenshots of creation, next steps, both guides and the unclaimed player's tray were inspected. A separate live verification uses a disposable empty table and a fresh browser; it checks the exact published assets, guide routes, generation, new-tab refresh, bringing, first-turn help, reload persistence and independence of the local copy.

Real devices, Safari and real assistive technology remain unverified. The guidance was checked against the current implementation, not an external rulebook. Update both role guides whenever rules or controls change.
