# Sacrament VTT 2.0 — Feature-preserving integration

This release introduces `/vtt-full/`: the **complete existing VTT client** with a separate, non-destructive visual theme. It retains original `vtt.js`, `rules.js`, `dice.js`, `loot.js`, sheets, server commands, and browser session storage keys.

`/vtt-next/` remains the isolated design prototype, **not** the multiplayer replacement.

## Deployment: important

**Do not deploy only the `site` folder using Netlify Drop.** That omits the Netlify Functions that run the authoritative multiplayer backend. Deploy this entire repository as a NEW Git-connected Netlify site (or via Netlify CLI with functions enabled). Build command and publish directory are in `netlify.toml`. Node 22 required.

For Netlify Blobs, the new site will have its **own storage**. Existing tables from the original production site do not automatically transfer to this preview site. Preserve the original site unchanged.

## Feature parity and next work

`/vtt-full/` preserves all original VTT interactions because it runs the existing client and rules without changing their logic. This is a first visual integration, not a finished UX redesign. Next: componentise GM controls incrementally, add GM/player browser regression tests, and validate permissions, latency and persistence on the deployed preview.

The original `/vtt/` is unchanged.
