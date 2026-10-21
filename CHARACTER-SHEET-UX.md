# Character sheet UX and light palette

A warm parchment sheet with deep botanical green headings, oxblood action buttons, muted sage controls and ink text. Light colours are **scoped to the hero sheet** (`#sheetOverlay` and `#sheetHere`) so the dark VTT, loot designer and main website remain unchanged.

## Improvements
- Consistent card padding, section hierarchy and two-column spacing.
- Better label/input separation, taller editable fields and resizable notes.
- More readable stat tiles, health hearts, equipment pills and gear rows.
- 42px minimum button targets, clear hover and visible keyboard focus.
- Single-column layout at 850px, compact layout at 500px.
- Preserves existing markup, event handlers, character data, validation and multiplayer behaviour.

## QA
Production build and JS syntax checks can be run without a browser. Visually verify an editable sheet, a read-only sheet, the VTT sheet overlay, loot designer (must remain dark), mobile width and all equipment actions. No real-browser visual QA has been performed.
