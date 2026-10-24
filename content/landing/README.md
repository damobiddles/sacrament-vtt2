# The Sacrament RPG website: where to write things

Everything on the home page and its pages (https://playsacrament.com/, /the-game/, /how-to-play/ and so on) comes from the files in this folder. Edit a file, save it, and the page changes the next time the site is built.

| To change... | Edit this file |
|---|---|
| The front page (a couple of sentences and three small boxes) | `home.md` |
| About the game | `the-game.md` |
| The setting (your text goes in the marked boxes) | `setting.md` |
| The how-to-play guide | `how-to-play.md` |
| The feedback page | `feedback.md` |
| The support page | `support.md` |
| The privacy page (a draft for you to review) | `privacy.md` |
| The terms of use page (a draft for you to review) | `terms.md` |
| The donate link, the contact email | `site.json` |
| A news post (shown at /news/) | one file in `blog/`, named like `2026-10-20-my-title.md` |

## Writing in these files

* A blank line starts a new paragraph. `## Heading` is a heading. `- item` is a bullet. `**bold**` is bold. `[words](https://link)` is a link.
* A box that starts with `> YOUR TEXT HERE` shows as a bright "write this" box. Replace the whole line with your text (without the `>`) when you have written it.
* A news post (shown at /news/) begins with three lines between `---` marks: `title`, `date` (YYYY-MM-DD) and `summary`.
* Each site build automatically shows the newest news post (by its `date`) on the home page, with its summary and a Read more link. Publish a new post as usual; no separate home-page edit is needed.
* Add `image: /art/your-image.webp` and `image_alt: A short description` in a post's opening metadata to use the same image for social sharing and the home-page preview. Use a local image path ending in .webp, .png, .jpg or .jpeg. Without one, the standard Sacrament sharing image is used.
* The donate link: the full address (starting with `https://`) in `site.json`. It is set to the Ko-fi page (https://ko-fi.com/sacramentrpg). If it is ever emptied, the page shows a clearly marked placeholder instead of a button.
* Inside a sentence, `[[YOUR TEXT HERE: ...]]` shows as a small highlighted note. Replace it, brackets and all, with your text.

## Feedback submissions

The Feedback page uses Netlify Forms (`vtt-feedback`). The owner reads messages in the Netlify site dashboard under Forms, without publishing their email or using email notifications. Form detection must remain enabled on Netlify. There are no visitor accounts or required email addresses. Spam protection uses a hidden honeypot field. A local preview can check the form but cannot store a Netlify submission.

## Current Loot Tables

`/loot/` is generated from `site/sheet/gear.js`, the same catalogue the VTT reads. Introductory text lives in `loot.md`. Add or edit loot in the catalogue, then build/publish; do not maintain a second item list. Private GM loot notes never appear on this page.

Current VTT rules are in `player-guide.md` and `gm-guide.md`, published at `/player-guide/` and `/gm-guide/`. The first-game checklist links both. Update these alongside rules or control changes; distinguish automatic mechanics from GM rulings. They are public pages and must never include private setting material.

The website navigation and footer have one definition in `site/nav.js`, shared by the landing builder and older public pages. `resources.md` and the resource cards in `build-landing.mjs` produce `/resources/`. The builder also writes `sitemap.xml` from its pages and posts; never add retired redirects or private tools to it. Current news stays at `/news/`; `/blog/` remains a legacy redirect.
