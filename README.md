# Petal user manual

A dependency-free, responsive HTML manual for the Petal iOS app.

- Open dist/index.html directly, or serve dist with any static HTTP server.
- Chapter content lives in dist/content.js; presentation in style.css; navigation and search in app.js.
- All illustrations are illustrative interface diagrams, not screenshots.
- Search, chapter links, print, theme selection, mobile navigation, and the timeline demo run locally.
- Content was checked against the local Petal iOS and esp32-petal source in October 2026.
- This guide describes the current development app. Keep it in step with releases.

## Heroku

Live app: https://petal-user-manual-b5af91119565.herokuapp.com/

The standalone Git repository deploys directly to the Heroku remote. The app runs
on the heroku-24 stack using Node 24 LTS, with no runtime npm dependencies or add-ons.

```sh
npm test
npm run check
npm start
```

Local server: http://localhost:3000 (or set PORT).

Deploy committed changes:

```sh
git push heroku HEAD:main
heroku ps --app petal-user-manual
```

The Basic web dyno is billed by Heroku (up to $7/month). To stop serving:

```sh
heroku ps:scale web=0 --app petal-user-manual
```

Only dist assets and /healthz are exposed by the server. Source, configuration,
and tests cannot be requested over HTTP. No account data or credentials are included.

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
The JavaScript frame loop only updates captions and reports occasional events;
it does not perform geometry reads or write motion styles during playback.
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
