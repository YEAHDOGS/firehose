# 🔥 Firehose — Twitter Archive Time Machine

Your Twitter/X archive, replayed like it happened live. Pick any calendar day —
say March 31st — and every tweet you posted on March 31st in 2023, 2024, 2025,
2026 flies onto the timeline at the exact second it was originally posted.

One page, one interface. No backend required.

## How it works

- **Import your archive** (button, top right): select your archive's `data/tweets.js`
  files (plus `tweets-part*.js` if present). Everything is parsed **in your browser** —
  your archive never leaves your device.
- **Pick a date**: the year is ignored. Every year you tweeted on that month/day replays together.
- **Press play**: the 24-hour clock runs and tweets fly in at their original time of day.
  Speeds: 1× real time, 60×, 240×, or all at once. Scrub the clock, or hit **Next** to
  jump to the next tweet.
- **Settings (⚙)**: toggle posts / replies / retweets, filter years, connect an
  archive server, export your loaded tweets as JSON, or clear data.

The GitHub Pages demo ships with **entirely fictional demo data** (clearly labeled
in the app) so the replay works before you import anything.

## Archive server (optional)

Prefer to host the archive instead of importing files? `server/` is an Express
API that reads an extracted archive folder and serves it over GET endpoints:

```
cd server
# place your archive's data/ folder at server/archive-data/data/
npm install
npm start   # http://localhost:3000
```

Then in the app: ⚙ Settings → Archive server → Connect. If the app itself is
served by the server (it serves `../dist` statically), a **Connect server** button
appears automatically. See `server/README.md` for the endpoint list.

## Develop

```
npm install
npm run dev      # Vite dev server
npm run test:run # vitest (parser + replay engine tests)
npm run build    # production build to dist/
```

## Privacy

- File imports are parsed locally with zero network calls.
- API mode only contacts the server address you explicitly enter.
- The demo dataset is fictional — no real person's data anywhere in this repo.

Made by DOGS — https://wearedogs.net
