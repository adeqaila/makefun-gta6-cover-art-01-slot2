// Shot mode: the app reads its own ?shot= query and poses itself for a
// screenshot, so every screenshot is the app drawing itself — never an
// edit or a composite. Supported shots:
//   ?shot=cover           sticker + bubblegum cover, fills the window
//   ?shot=cover-portrait  same cover, portrait window (1080 x 1350 art)
//   ?shot=editor          full editor, sticker + bubblegum
//   ?shot=editor-comic    full editor, comic + lemonade
// Anything else is the plain editor with the champion defaults.

export function readShot() {
  const q = new URLSearchParams(window.location.search);
  const shot = q.get('shot') || '';
  const presets = {
    cover: { layout: 'sticker', grade: 'bubblegum', title: 'LITTLE STARS',
      tagline: 'Little Vice', badge: 'CUTE', cute: 5, coverOnly: true },
    'cover-portrait': { layout: 'sticker', grade: 'bubblegum', title: 'LITTLE STARS',
      tagline: 'Little Vice', badge: 'CUTE', cute: 5, coverOnly: true },
    editor: { layout: 'sticker', grade: 'bubblegum', title: 'LITTLE STARS',
      tagline: 'Little Vice', badge: 'CUTE', cute: 5, coverOnly: false },
    'editor-comic': { layout: 'comic', grade: 'lemonade', title: 'KITE DAYS',
      tagline: 'Little Vice', badge: 'CUTE', cute: 5, coverOnly: false },
  };
  return { name: shot, preset: presets[shot] || null };
}

export function applyShotPreset(state, preset) {
  if (!preset) return state;
  const next = { ...state };
  next.layout = preset.layout;
  next.grade = preset.grade;
  next.title = preset.title;
  next.tagline = preset.tagline;
  next.badge = preset.badge;
  next.cute = preset.cute;
  return next;
}
