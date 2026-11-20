[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/adeqaila/makefun-gta6-cover-art-01-slot2/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/adeqaila/makefun-gta6-cover-art-01-slot2/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

# Little Vice Cover Club

A GTA 6-style cover art maker with a sticker-sheet heart: four photos on a
pastel card, tilted die-cut panels with white borders, a speech-bubble
tagline, a CUTE badge and a cute meter of hearts — exported as a PNG to
share. Runs fully offline in the browser; photos never leave the machine.

- 4 photo slots (upload your own or use the samples), click a panel to
  pick it, drag to pan, zoom per panel.
- 6 layouts: Sticker sheet, Comic strip, Hero + 3, Grid 4, Full bleed,
  Vertical strip.
- 4 pastel grades that keep skin warm: Bubblegum, Lemonade, Mint, Berry.
- Speech-bubble tagline, cute meter ♥♥♥♥♥, sticker borders everywhere,
  deterministic pastel confetti, grain, soft vignette, halftone title band.
- Undo/redo (20 steps, Ctrl+Z / Ctrl+Y) and 4 export sizes:
  1080×1080, 1080×1350, 1920×1080, 1080×1920.

Serve it with `node serve.ts` and open http://localhost:8080. The entry
program is `main.ts` (Node 22); it copies `app/` and `screenshots/` to
`/output` and writes `/output/dossier.json`.

Fonts Anton and Pacifico are vendored under `app/fonts/` under the SIL
Open Font License 1.1 (license texts beside them). Sample photos are
model-generated fictional children, wholesome and fully clothed. No
Rockstar Games logo, artwork, or font is used anywhere.
