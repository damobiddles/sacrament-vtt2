# Ko-fi contrast failure — 24 October 2026

The owner supplied a failed GitHub contrast check: `.kofitext` was white on the widget's configured pale blue (`#72a4f2`), measured at 2.6:1 instead of the required 4.5:1 on `/` and `/how-to-play/`.

The cloud environment rejects requests to `storage.ko-fi.com` with proxy HTTP 403. The remotely drawn button therefore did not appear in local checks, while GitHub could load it. An enabled-JavaScript browser also had no visible donation link when that script was blocked: the fallback existed only in noscript.

The navigation now renders a normal site-owned support link to the exact same Ko-fi destination. It uses the site's dark red and light text, has visible focus styling and a 44-pixel minimum height, and opens safely in a new tab. No remote widget or image is needed. Contrast thresholds and check time limits are unchanged.

The regression test models the reported widget colours before the fix and reproduces its contrast failure. After the fix, both the home page and quick start are checked with the third-party script available or blocked, including normal, hover and focus states. Build/browser assertions now check the working donation link and absence of the remote script, rather than requiring the faulty dependency. A laptop screenshot was inspected.

The full release check is recorded in `/workspace/sacrament-audit/kofi-full.log`; the reproducer and affected checks are `kofi-before.log` and `kofi-after.log`. GitHub workflow status cannot be read from this environment (API HTTP 403), so local test results and confirmed live behavior must be distinguished from the GitHub run result. This addresses the reported failure; other failed runs have not been inspected.

The full local release run passed: lint (52 existing warnings, zero errors), type checking, 434 unit tests, 125 laptop browser tests with one existing skip, both full contrast groups, compatibility suites of 65/75/26 checks and the quick phone smoke check. GitHub’s new workflow result still needs independent confirmation.
