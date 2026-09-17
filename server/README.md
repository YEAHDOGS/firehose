# Firehose archive server

Express API over your extracted Twitter/X archive. The Firehose SPA can
stream from it instead of importing files in the browser.

## Setup

1. Request your archive: X → Settings → Your account → **Download an archive**.
2. Unzip it. Copy its `data` folder here:

   ```
   server/archive-data/data/tweets.js
   server/archive-data/data/profile.js   (optional)
   ```

   Or set `ARCHIVE_DIR` to the extracted archive root (the folder containing `data/`).
3. Install + run:

   ```
   npm install
   npm start
   ```

   API listens on `http://localhost:3000` (`PORT` env overrides).

4. In the Firehose app: ⚙ Settings → **Archive server** → enter the URL → Connect.
   If the app is served by this same server (see below), a **Connect server**
   button appears automatically.

## One process hosts app + API

Build the SPA from the project root (`npm run build`), then `npm start` here —
`server.js` serves `../dist` statically alongside the API.

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | `{ ok, tweets, screenName, years }` |
| GET | `/api/profile` | `{ screenName }` |
| GET | `/api/years` | `[2021, 2022, …]` |
| GET | `/api/stats` | totals per year / per type + date range |
| GET | `/api/tweets?date=03-31` | tweets for MM-DD across all years, sorted by time of day |
| GET | `/api/tweets?date=03-31&types=post,reply&years=2023,2024` | filtered |

Everything is read-only. Your archive stays on your machine.
