/**
 * Firehose archive server — Express API over an extracted Twitter/X archive.
 *
 * Setup:
 *   1. Unzip your Twitter/X archive somewhere.
 *   2. Copy its `data` folder into ./archive-data/  (so ./archive-data/data/tweets.js exists)
 *      — or point ARCHIVE_DIR at the extracted archive root.
 *   3. npm install && npm start   (serves API on :3000, plus the built SPA if ../dist exists)
 *
 * The SPA (../dist, built with `npm run build` in the project root) is served
 * statically, so one process hosts the app AND the API. The app auto-detects
 * the server and offers one-tap connect.
 */
const express = require("express");
const fs = require("fs");
const path = require("path");
const { loadArchive } = require("./parse");

const PORT = Number(process.env.PORT || 3000);
const ARCHIVE_DIR = process.env.ARCHIVE_DIR || path.join(__dirname, "archive-data");

const { tweets, skipped, screenName, files } = loadArchive(ARCHIVE_DIR);
const years = [...new Set(tweets.map((t) => t.year))].sort((a, b) => a - b);

console.log(`[firehose] loaded ${tweets.length} tweets from ${files.length} file(s)` +
  (screenName ? ` (@${screenName})` : "") +
  (skipped ? ` (${skipped} skipped)` : ""));
if (tweets.length === 0) {
  console.log(`[firehose] no tweets found — place your archive's data/ folder at ${path.join(ARCHIVE_DIR, "data")}`);
}

const app = express();

// CORS: the SPA may be hosted elsewhere (e.g. GitHub Pages) while the
// archive server runs on your own machine.
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  next();
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, tweets: tweets.length, screenName, years });
});

app.get("/api/profile", (req, res) => {
  res.json({ screenName });
});

app.get("/api/years", (req, res) => {
  res.json(years);
});

app.get("/api/stats", (req, res) => {
  const perYear = {};
  const perType = { post: 0, reply: 0, retweet: 0 };
  for (const t of tweets) {
    perYear[t.year] = (perYear[t.year] || 0) + 1;
    if (perType[t.type] !== undefined) perType[t.type] += 1;
  }
  res.json({
    total: tweets.length,
    perYear,
    perType,
    range: tweets.length ? {
      from: new Date(tweets[0].ts).toISOString().slice(0, 10),
      to: new Date(tweets[tweets.length - 1].ts).toISOString().slice(0, 10),
    } : null,
  });
});

// GET /api/tweets?date=03-31&types=post,reply,retweet&years=2023,2024
// date is required (MM-DD); types/years optional filters.
app.get("/api/tweets", (req, res) => {
  const date = req.query.date;
  if (!/^\d{2}-\d{2}$/.test(date || "")) {
    return res.status(400).json({ error: "query param date=MM-DD is required" });
  }
  const types = req.query.types ? String(req.query.types).split(",") : null;
  const yrs = req.query.years ? String(req.query.years).split(",").map(Number) : null;
  const out = tweets.filter((t) =>
    t.mmdd === date &&
    (!types || types.includes(t.type)) &&
    (!yrs || yrs.includes(t.year))
  );
  res.json(out);
});

// Serve the built SPA so one process hosts app + API.
const dist = path.join(__dirname, "..", "dist");
if (fs.existsSync(path.join(dist, "index.html"))) {
  app.use(express.static(dist));
  app.get(/.*/, (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(dist, "index.html"));
  });
  console.log("[firehose] serving SPA from ../dist");
}

app.listen(PORT, () => {
  console.log(`[firehose] API listening on http://localhost:${PORT}`);
});
