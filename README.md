# Sacrament website

[![Netlify Status](https://api.netlify.com/api/v1/badges/a949477b-09ee-472d-8e2d-dbb4fa3b5723/deploy-status)](https://app.netlify.com/projects/sacramentrpg/deploys)

The site for **Sacrament RPG**: the home page, the Basic Rules, a hero builder, a live table where a GM and their players share a screen, and the news and updates. Static pages plus a few Netlify functions.

Working on it? Read `CLAUDE.md` first: it has the exact commands and the rules for every session.

## What is here

| Part | Where |
|---|---|
| Home page and its pages (`/`, `/the-game/`, `/how-to-play/`, `/news/` and so on) | text in `content/landing/`, built into `site/` by `scripts/build-landing.mjs` (not committed) |
| **The table** (`/vtt/`): a GM and players in their browsers, cards, tokens, dice, hearts, turns | `site/vtt/` (screen, rules arithmetic), `netlify/functions/vtt.mjs` and `_shared/vtt-*.mjs` (the server side; saves to Netlify Blobs); notes in `docs/vtt/` |
| The Basic Rules (`/rules/`) and the hero builder (`/character/`) | `site/rules/`, `site/character/`, with the shared game code in `site/game/` and the earlier rules' files in `site/legacy/` (used to bring earlier characters over) |
| Updates blog (`/blog/`) | `content/blog/*.md`, built by `scripts/build-blog.mjs` |
| The owner's overview of everything (`/inventory/`, unlisted) | `scripts/inventory/items.mjs`, built with `npm run inventory` |
| Passphrase-protected ability builder (`/builder/`) | `private/builder.html`, `netlify/functions/builder.mjs`, `nodes.mjs` |
| Design notes for the rules | `docs/hearts/`, with `scripts/hearts/` (simulator, validation, browser test) |

Only `site/` is published (see `netlify.toml`). Pushing to `main` deploys.

## Run it on your computer

`npm install`, then `npm run vtt` and open http://localhost:8788/vtt/ (tables are saved in `.vtt-data/`). Checks are in `CLAUDE.md`: quick checks after every change (`npm run check`), the full suite before deploying (`npm run check:full`).

## Netlify settings

Environment variable `DESIGNER_PASSPHRASE` is the passphrase for `/builder/`. The home page's old playtest sign-up form has been removed; its earlier submissions (a Netlify Form named `sign-up`) stay under **Forms** in Netlify.
