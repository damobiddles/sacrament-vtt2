# Sacrament UI sizing

Applies to the website, VTT entry screen, GM and player controls, and character
sheets. Shared values live in `site/theme.css`. Use the existing tokens and
component classes; update their original rules instead of appending competing
size overrides. The art, palette and existing two font families stay unchanged.

| Element | Default at a 16px browser root |
| --- | --- |
| Reading text, field values, primary buttons, tray actions | 16px (`--ui-text`) or larger |
| Compact controls, field labels, status and secondary metadata | 14px minimum (`--ui-text-small`) |
| Primary controls and sheet actions | 44px minimum height (`--ui-control-height`) |
| Compact desktop controls | 40px minimum height (`--ui-compact-height`) |
| Compact controls on phones or touch devices | 44px minimum height |
| Primary button padding | 10px vertically, 16px horizontally |
| Compact button padding | 8px vertically, 12px horizontally where space permits |
| Spacing | 4, 8, 12, 16px (`--ui-space-1` through `--ui-space-4`) |
| Dice | 72px desktop, 64px phone; 28px numerals |

Use Source Sans 3 for controls, numbers and reading text. Reserve Cormorant
Garamond for headings and atmosphere. Use sentence case for VTT actions;
website display buttons may retain their brand styling. Avoid widely spaced
uppercase labels in dense controls. Reading text needs about
1.5 line height; button labels need at least 1.3.

Do not shrink text to make a phone layout fit. Wrap button rows, let the tray
scroll, and keep labels inside their controls. In narrow windows the scene and
tray share a scroll area so the Activity strip cannot cover tray actions. Use border-box sizing where
padding must fit within a bounded area. A persistent dice result must scroll
within the scene; its damage/continue button must remain reachable by mouse,
touch and keyboard. Keep the existing reduced-motion and dice-off settings.

The scene's spatial cards/tokens are an explicit exception: their geometry
and lettering scale with the scene. Important full text and HP must remain
available in the selected card's tray. Do not apply scene-relative units to
ordinary UI controls. Browser text enlargement must remain enabled; use rem
for text rather than forcing the root size.

## Checks before publishing a UI sizing change

Use disposable tables. Check both roles, all four GM tabs, selected cards,
attack targeting, damage/continue, physical dice fields, and character sheets.
Run `e2e/ui-sizing.spec.mjs`, existing tray-spacing and compact GM layout checks,
the dice/result checks, contrast checks and `npm run phone-check` at 360×640.
Check a larger browser text size, long labels, keyboard focus and scrolling.
Phone emulation is evidence of layout only, not a substitute for real-device
or assistive-technology testing. Passing size checks does not prove usability.
