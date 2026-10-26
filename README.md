# Petal user manual

A React + TypeScript field guide for the Petal iOS app, built with React Router
framework mode and Vite. All 12 chapters are pre-rendered at build time; navigation
and search run in the browser. The existing design and iOS-style timeline are preserved.

## Development

Use Node 24 LTS, matching Heroku's runtime.

```sh
npm ci --include=dev
npm run dev
```

Development: http://127.0.0.1:5173. Production preview:

```sh
npm run check
npm run build
npm test
npm start
```

The production server listens on http://localhost:3000 (or PORT). Build before
running tests, which verify the generated chapter pages as well as React behavior.

## Source

- `app/content.ts`: typed chapter content; authored HTML is trusted repository content.
- `app/components/`: manual layout, chapter navigation, search, and persistent theme.
- `app/timeline/`: React markup and the typed animation/gesture controller.
- `app/routes/`: clean chapter URLs and not-found UI.
- `app/style.css`, `app/timeline.css`: retained visual styling.
- `public/`: transport icon assets, favicon, and static 404 page.
- `server.mjs`: production static server and health endpoint.

The overview is `/`; other chapters use `/<chapter-id>`. Sections use standard
fragment identifiers. There are no legacy hash-route redirects. Generated output
in `build/` and React Router type output are ignored by Git.

Dark/light mode is remembered in localStorage under `petal-manual-theme` and
restored before paint. The root provider persists across chapter navigation.

## GitHub and Heroku

Source: https://github.com/nickbolton/petal-manual

Live: https://petal-user-manual-b5af91119565.herokuapp.com/

`main` tracks `origin/main`; `heroku` remains a separate deployment remote.

```sh
git push origin main
git push heroku main
```

Heroku installs the build dependencies, runs `heroku-postbuild` to pre-render the
manual, then serves `build/client` using Node 24. The Basic dyno remains on the
existing app (up to $7/month); no additional services or add-ons are required.
Only generated pages, public assets, and `/healthz` are exposed. Unknown URLs
return HTTP 404. Inline React/theme bootstrapping scripts are authorized by exact
CSP hashes; arbitrary inline JavaScript remains blocked.

Content reflects the local Petal iOS and esp32-petal source reviewed in October
2026. Illustrations are interface diagrams, not screenshots or live MIDI controls.

## Timeline illustration

The illustration follows the iOS source constants: 60-point beat cells, 2-point
dividers, 48-point section titles, a 59-point sticky-header margin, a stationary
200-point white playhead, and a 48-point overview scrubber. Section colors and
transport icon assets come from Petal. Sample song data is illustrative.

The leading-edge sticky calculation matches SongTimelineLayout: titles remain
inside their own section and leave one beat clear at its trailing edge. Play,
pause, rewind, timeline dragging, keyboard seeking, and section jumping work
locally without sending MIDI. Reduced-motion mode advances one bar per click.

Playback uses transform-only Web Animations on the browser compositor, with one
shared animation origin for the timeline, sticky headers, and overview marker.
There is no JavaScript playback frame loop. Headers animate in a separate overlay,
and a fixed pool of 12 ripple elements is scheduled on the same animation clock.
The caption updates once per bar. Playback does not allocate event DOM nodes or
perform per-frame geometry reads or motion-style writes.
Motion stays linear and does not snap to beats. Only Play/Pause, Stop, and the section overview are presented as
buttons; ornamental navigation and settings controls are omitted.

The illustration starts when at least 15% of its app panel enters the viewport,
pauses when it leaves, and resumes on re-entry. A new chapter illustration starts
at the beginning. Manual pause is respected while it remains onscreen. Reduced
Motion disables autoplay and retains manual bar-by-bar stepping.

Timeline section corners use the app's 16-point radius; scrubber segments use
4 points. Both beat and measure labels sit below the colored strip. Light beat
numbers occupy the upper row; bold measure numbers occupy the lower row, matching
SongMeasureCell's 45-point marker area.

Scrubber events use 4-point white circles, centered vertically, with the iOS
half-point placement formula. The scrubber's playhead and section widths share
the same native beat scale. Safari text selection is suppressed during timeline
drags and restored on pointer release, cancellation, lost capture, or teardown.

The illustration uses a fixed sparse event pattern. Section entries emit a random
1–3 rings on each crossing, visually staggered by 70 ms to distinguish them.
Pointer dragging follows the hand directly and releases with exponential momentum
using the normal iOS scroll deceleration rate; grabbing or using controls cancels it.
