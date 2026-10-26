# Scene packs — local implementation

The GM Scene tab contains Export scene and Import scene. There are no new Play or
footer controls. A pack is one `.sacrament-scene` JSON file with a versioned,
allowlisted manifest and embedded raster image bytes. JSON replaces the proposed
ZIP container to avoid an archive dependency and decompression/path-traversal
risks. GMs still download/select one file. Limits: 28 MB file, 20 MB decoded image
bytes, 2.5 MB/image, 60 images, 149 encounter cards (one additional instructions
card), 120 strokes/160 points. Destination table limits are checked independently.

Export is read-only. It uses the authoritative state, selecting only unowned
card/token kinds on the chosen scene (legacy unscoped cards only on the live
scene). Heroes, char-linked tokens, loot kinds and cards with embedded loot are
excluded. Only permitted fields are copied; never serialize a projected game or
spread an entire card into the file. All existing GM notes are excluded. A blank
optional instructions field makes sharing deliberate. Descriptions/drawings/images
can contain personal material: the GM must review them. Hidden cards are readable
by anyone who receives the file. It is not an encrypted backup.

Browser export fetches referenced images, checks bounded dimensions/size, decodes
and re-encodes them to remove metadata and external dependencies. Linked image
hosts must allow browser copying; otherwise the GM must upload a copy directly.
No server fetches untrusted image URLs. GIFs become still pictures. Duplicate
source URLs share one embedded image. Original tables are not needed after export.

Import validates known format/version, exact allowed fields, finite bounded values,
references, MIME, image signatures/dimensions, sizes and SHA-256 checksums. Browser
also decodes every image before enabling import; server independently checks the
manifest, types, headers, limits and checksums. Header checking is not a complete
server-side raster decoder. SVG, scripts, HTML assets, external image refs,
ownership and loot fields are refused. Text is always escaped/rendered as text.

The GM starts a staging job with a unique retry id. Staged bytes are not registered
as table images and are not served by image URLs. Each upload can be retried.
A server-only nonce prevents a cancelled request from writing into a replacement
job. One conditional, deduplicated command creates all scene/card/drawing ids,
registers the images and removes the job. Incomplete imports never add a scene.
Capacity is rechecked at commit; existing drawings are never evicted. No shared
turn, Target, round, Horror, characters, loot or house rules are imported.
Imported enemy tokens join their new scene’s order alongside destination heroes;
the active scene’s order is unchanged. Precise card placement is preserved. HP is
full, progress zero, timers reset and paused. Card reveal flags/hide-numbers are
preserved within the new, unshown scene. Explicit instructions become a hidden
GM-notes card. The GM reviews and reveals through existing Scene controls.

New names get numbered suffixes; existing scenes are never overwritten. Reusing
an import request returns its committed scene even beyond the normal action cache.
Separate deliberate imports of the same pack require confirmation. A successful
import adds only a private destination activity event, not the source history.

Cancel removes pending metadata and uploaded bytes. Abandoned staging jobs expire
after 30 minutes and are cleaned up on the next successful scene begin; at most two
pending jobs reserve capacity per table. There is no background cleanup scheduler.
A closed/offline browser can therefore leave temporary storage until that cleanup.
Do not claim immediate cleanup after every network interruption.

The website Resources card links to `/scenes/`. Its first reviewed pack is The
Sealed Gate, built deliberately with `node scripts/build-scene-pack.mjs`; this is
an authored publication snapshot, not a live table or auto-updating rules catalogue.
Packs live under `/downloads/scenes/`, outside the page builder’s cleared output
folders. The markdown page is built by the existing landing builder. No user submissions,
accounts or scene hosting service were added. Website previews use public art;
actual public downloads contain encounter spoilers and the included GM instructions.

Checks: scene-packs unit/service tests, scene-packs browser tests, existing scene
turn/drawing/image/privacy cases, phone smoke check, lint/type checks and the normal
isolated unit suite. Real devices, Safari, hosted-storage import and a deployment
must be verified separately before claiming them working live.
