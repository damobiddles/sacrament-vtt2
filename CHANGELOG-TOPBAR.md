# VTT top bar removal

Removed the shared Sacrament logo/navigation bar **only on `/vtt/`** using the existing `data-no-nav` opt-out in `nav.js`. Set `--navh: 0px` for the VTT so both the lobby and in-game tabletop use the reclaimed height, including mobile layouts. The in-game Target, round, turn and other controls remain. No game logic or server changes.
