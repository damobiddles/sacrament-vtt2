# Brand assets

**Logo face (owner's decision, 2026-11-01):** the wordmark is UnifrakturMaguntia (Google Fonts, SIL Open Font Licence), drawn as outlines in the four logo SVGs under `site/brand/assets/`, so the files need no font. The same face sets the "Sacrament RPG" name in the website's top bar and footer, the "Sacrament" mark on My heroes, and every website page title (h1). It is **never used on the table** (`/vtt/`): blackletter is too hard to read during play. The rules live in `site/blackletter.css`, which `landing.css` imports (every public page) and `/character/` links; the table loads neither. The font file and its licence are in `site/fonts/` and offered on `/brand/`. `test/print-sheet.test.mjs` and `e2e/brand-footer.spec.mjs` guard this.

The share image `site/og-image.png` (1200 by 630) was redrawn on 2026-11-01 with the same wordmark (UnifrakturMaguntia, "ment" in `--blood-hi`), the label and tagline in Cormorant Garamond, and the rune mark. The logo outlines were made with fontTools from `site/fonts/UnifrakturMaguntia-Book.ttf`, ink height 34 px (horizontal) and 40 px (stacked).

Headings below the page title, character names and every table heading stay in Cormorant Garamond Bold; reading text and controls stay in Source Sans 3. The rune artwork is unchanged.

The Ko-fi cup SVG is the monochrome Ko-fi mark from Simple Icons: https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/kofi.svg (Simple Icons assets are distributed under CC0; brand trademarks remain with their owners). It is used locally for the requested cup-logo support badge, without the remote widget script.
