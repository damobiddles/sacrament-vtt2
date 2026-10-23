# The Sacrament RPG website: where to write things

Everything on the home page and its pages (https://playsacrament.com/, /the-game/, /how-to-play/ and so on) comes from the files in this folder. Edit a file, save it, and the page changes the next time the site is built.

| To change... | Edit this file |
|---|---|
| The front page (a couple of sentences and three small boxes) | `home.md` |
| About the game | `the-game.md` |
| The setting (your text goes in the marked boxes) | `setting.md` |
| The how-to-play guide | `how-to-play.md` |
| The newsletter page | `newsletter.md` |
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
