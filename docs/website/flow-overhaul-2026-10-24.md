# Website flow and consistency overhaul — 24 October 2026

The owner authorised a complete website flow and user-experience pass, including implementation and publication. Existing artwork, downloads, table addresses, stored heroes, game arithmetic and server permissions are preserved.

## Decisions and changes

- One public navigation and footer definition in `site/nav.js` is used by both the landing-page builder and older public pages. Primary sections are Home, Start here, The game, The setting, Resources, News and Feedback. Guides/rules belong to Start here; loot/brand/playtest pages belong to Resources. Interactive workspaces keep the compact home link.
- The home page explains the game and offers clear routes for discovery, a first session, and tools/artwork. Existing Join a game, Run a game and character buttons remain, along with all three approved illustrations and the automatically updated latest-post image/preview.
- Start here has direct player/GM jumps. The game explains roles, the play loop, what the VTT handles and the need for a separate voice call. Game/setting pages end with useful next steps.
- Resources is a generated hub for current tools, guides, loot and artwork. It shows image previews with original download links. Unavailable placeholder products are removed from the browsing flow; the historical playtest is clearly separated.
- News is labelled consistently and posts link back to the current rules. A stale launch-post email/coming-forum instruction is replaced with the existing private feedback form. Historical rule text remains labelled as historical.
- Feedback explains what to include, privacy and the lack of personal replies without contact fields. The existing Netlify form name, fields and confirmation route are preserved. Help and next-step links follow the form. No real submissions are needed for the audit.
- Brand-kit labels now match the actual Cormorant Garamond/Source Sans 3 theme. Earlier logo/print font downloads and all artwork remain available. The palette description matches the current theme; sample text uses the public Church setting.
- A keyboard skip link and corrected heading levels improve reading/navigation. The 404 page offers clear recovery routes. Public navigation has a 44-pixel target height and retains the corrected site-owned Ko-fi button.
- The sitemap is generated from current routes and news posts. It includes the VTT and every current post, and excludes private tools, noindex confirmation pages and retired blog/support redirects. Resources HTML and the sitemap are build outputs; their URLs remain the same.
- Duplicate header CSS is consolidated. The inventory points to the current repository and no longer describes Sacrament as two different games or the sitemap as incomplete.

## Verification and limits

The navigation mismatch and absent skip link were reproduced by failing browser tests before implementation. New tests compare navigation and active sections across public page types, verify the shared footer, exercise keyboard skipping, follow visitor journeys, load artwork previews and check routes from the generated sitemap. Laptop layouts for home, Resources, brand kit and feedback were inspected.

Quick checks passed: lint (52 existing warnings, no errors), type checking, 434 existing unit tests and quick contrast. The new sitemap case and updated heading expectation pass in the affected landing-build tests, bringing the unit set to 435 cases in total. The heading assertion changed from h3 to h2 to match the corrected document hierarchy; no contrast threshold or timeout was weakened.

The full remaining release run is recorded in `/workspace/sacrament-audit/site-final-checks.log`, with earlier reproducer/quick evidence in `site-before.log` and `site-quick.log`. Visual evidence is `site-final-home.png`, `site-final-resources.png`, `site-final-brand.png` and `site-final-feedback.png`.

Live verification should distinguish deployed assets from the GitHub workflow result: GitHub API access is blocked in this environment. Physical phones, Safari and real assistive technology remain unverified; routine publication uses the required simulated phone smoke check. Actual Netlify form delivery is not re-submitted: existing form configuration and confirmation links are preserved and checked.

Completed release verification: 129 laptop browser cases passed with one existing skip; both full contrast groups passed; compatibility suites passed 65/65, 75/75 and 26/26; the required quick phone check passed. Ten affected inventory/lore/name-guard tests also passed after the final copy review. No limits were increased and no behavior or privacy assertion was removed.
