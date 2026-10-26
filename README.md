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
