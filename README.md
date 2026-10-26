# Petal user manual

An interactive field guide for the Petal iOS app, built with React, TypeScript,
React Router framework mode, and Vite.

**[Open the manual](https://petal-user-manual-b5af91119565.herokuapp.com/)**

## Demo

https://github.com/user-attachments/assets/0997eeb6-a4d0-480e-b3b5-ef053e2da991

The live timeline illustration includes smooth playback, sticky section headers,
event ripples, momentum dragging, rubber-banding, and a draggable song overview scrubber.
It is an interactive illustration; it does not send MIDI or play audio.

## Requirements

- Node.js **24 LTS**, matching the production runtime in `package.json`.
- npm, included with Node.js.
- Git and access to this GitHub repository.
- The Heroku CLI and access to the existing app for deployment.

No Firebase credentials, API keys, database, or `.env` file are needed.

## Local setup

```sh
git clone git@github.com:nickbolton/petal-manual.git
cd petal-manual
npm ci --include=dev
npm run dev
```

Open **http://127.0.0.1:5173**. Vite updates the browser as you edit the source.
Use `npm ci` to install the exact dependency versions in `package-lock.json`;
commit both package files when intentionally changing dependencies.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server with hot reload. |
| `npm run check` | Generate route types, check TypeScript, and check server syntax. |
| `npm run build` | Build browser assets and pre-render every chapter. |
| `npm test` | Run server, rendered-page, timeline, gesture, and theme tests. Build first. |
| `npm start` | Serve the production build on port 3000, or the `PORT` environment variable. |
| `npm run heroku-postbuild` | Heroku's automatic build hook; runs `npm run build`. |

### Verify a change

```sh
npm run check
npm run build
npm test
```

### Preview production locally

```sh
npm run build
npm start
```

Open **http://localhost:3000**. To choose another port:

```sh
PORT=3001 npm start
```

Changes require another build when using the production server. Restart the
server after rebuilding so its generated-file inventory is refreshed.

## Project structure

```text
app/
  components/       Manual layout, chapter navigation, search, and theme
  routes/           Chapter pages and not-found UI
  timeline/         React timeline markup and animation/gesture controller
  content.ts        Typed chapter content
  root.tsx          HTML document and root providers
  entry.client.tsx  React hydration with Strict Mode
  routes.ts         Route definitions
  style.css         Manual styling
  timeline.css      Timeline styling
public/             Favicon, transport icons, and static 404 page
test/               Automated checks
server.mjs          Production HTTP server and health endpoint
react-router.config.ts
vite.config.ts
```

Generated output in `build/` and generated route types in `.react-router/` are
ignored by Git. Edit the source, not the generated files.

## Editing the manual

Chapter content lives in `app/content.ts`. Each chapter has an ID, navigation
title, introduction, tags, and sections containing authored HTML. This HTML is
trusted repository content, not user input.

- The overview is `/`; every other chapter uses `/<chapter-id>`.
- Section links use `/<chapter-id>#<chapter-id>-<section-id>`.
- Add chapters to the content array; the build pre-renders every listed chapter.
- Navigation, search, and pagination are derived from that same content.
- Preserve the existing section IDs when changing headings.

Each chapter's complete HTML is generated at build time. React hydrates the page
in the browser and handles subsequent chapter navigation. Content edits become
live after rebuilding and deploying. Unknown URLs return HTTP 404.

Dark/light mode is saved in localStorage under `petal-manual-theme` and restored
before paint. The preference persists across chapter navigation and reloads.

## GitHub workflow

Repository: **https://github.com/nickbolton/petal-manual**

The `origin` remote points to GitHub. The local `main` branch tracks
`origin/main`; Heroku uses a separate remote.

For a normal change:

```sh
git switch -c your-change
# Make and verify your changes.
git add <changed-files>
git commit -m "Describe the change"
git push -u origin your-change
```

Open a pull request against `main`. After merging:

```sh
git switch main
git pull --ff-only origin main
```

## Deploy to Heroku

Existing application: **`petal-user-manual`**

Live site: **https://petal-user-manual-b5af91119565.herokuapp.com/**

### Configure a fresh checkout

```sh
heroku login
heroku git:remote --app petal-user-manual
```

Check the remotes:

```sh
git remote -v
```

Expected destinations:

```text
origin  git@github.com:nickbolton/petal-manual.git
heroku  https://git.heroku.com/petal-user-manual.git
```

### Deploy verified main

```sh
git switch main
git pull --ff-only origin main
npm ci --include=dev
npm run check
npm run build
npm test
git push heroku main
```

Heroku installs dependencies, runs `heroku-postbuild`, and starts the web process
from `Procfile`: `node server.mjs`. The server uses Heroku's assigned `PORT` and
serves the generated `build/client` pages and assets. There is no runtime
server-side React rendering and no database or additional add-ons.

Deployments are performed through the Heroku remote; pushing only to GitHub does
not deploy the site.

### Check the deployment

```sh
heroku ps --app petal-user-manual
heroku releases --app petal-user-manual
curl --fail https://petal-user-manual-b5af91119565.herokuapp.com/healthz
```

The health endpoint should return `ok`. Also open `/timeline`, refresh a chapter
directly, check the saved theme, and try a nonexistent URL to verify the 404 page.

### Logs and rollback

```sh
heroku logs --tail --app petal-user-manual
heroku releases --app petal-user-manual
heroku rollback vNN --app petal-user-manual
```

Replace `vNN` with a known-good release from the release list. A Heroku rollback
does not change GitHub; also revert the relevant source commit before the next
deployment if the change should stay reverted.

The existing app uses a Basic web dyno (up to $7/month). To stop serving it:

```sh
heroku ps:scale web=0 --app petal-user-manual
```

Restore service with `web=1`.

## Timeline implementation

The illustration follows Petal's iOS dimensions and styling: 60-point beats with
2-point dividers, 48-point section titles, 16-point section corners, a stationary
200-point playhead, and a 48-point overview with 4-point event dots.

Playback uses transform-only Web Animations with a shared clock for the timeline,
sticky headers, and overview marker. React renders the interface; the dedicated
controller handles animation and gestures without per-frame React state updates.

The sample events follow a fixed sparse pattern. Section entries fire a random
1–3 ripples at runtime. The illustration starts when visible, pauses offscreen,
and respects manual pause. Reduced Motion disables autoplay and uses manual
bar-by-bar stepping instead. Vertical page scrolling and its momentum do not
scrub or pause playback; timeline and overview drags start only after clear
horizontal movement. No MIDI or audio is sent.

## Troubleshooting

- **Missing build or production pages:** run `npm run build` before `npm start`
  or `npm test`.
- **Build tools missing:** run `npm ci --include=dev`; production-only installs
  omit Vite, TypeScript, and the React Router build tools.
- **Wrong Node version:** switch to Node 24 LTS, then reinstall dependencies.
- **Stale local production assets:** rebuild and restart `npm start`.
- **Heroku rejected the deploy:** inspect the build output and
  `heroku logs --tail --app petal-user-manual`.
- **Animation looks choppy over screen sharing:** compare directly on the desktop
  or phone; the remote display's frame rate can differ from the site's rendering.

## Content notes

The guide reflects the Petal iOS and esp32-petal source reviewed in October 2026.
Illustrations are interface diagrams, not screenshots of the app. Keep the guide
in step with app and firmware releases.

Only generated pages, public assets, and `/healthz` are exposed by the production
server. Source files and configuration are not served. Inline React and theme
bootstrap scripts are authorized using exact CSP hashes.
