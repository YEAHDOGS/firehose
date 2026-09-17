/**
 * Firehose archive parser (Node). Reads an extracted Twitter/X archive
 * from ./archive-data/data/*.js and normalizes tweets into Firehose records.
 * Mirrors src/lib/archive.js in the SPA — keep the two in sync.
 */
const fs = require("fs");
const path = require("path");

const MONTHS = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

function parseCreatedAt(createdAt) {
  if (typeof createdAt !== "string") return null;
  const m = createdAt.match(/^\w{3} (\w{3}) (\d{2}) (\d{2}):(\d{2}):(\d{2}) [+-]\d{4} (\d{4})$/);
  if (!m || !MONTHS[m[1]]) return null;
  const year = Number(m[6]);
  const mmdd = `${MONTHS[m[1]]}-${m[2]}`;
  const secs = Number(m[3]) * 3600 + Number(m[4]) * 60 + Number(m[5]);
  const ts = Date.UTC(year, Number(MONTHS[m[1]]) - 1, Number(m[2]), Number(m[3]), Number(m[4]), Number(m[5]));
  return { year, mmdd, secs, ts };
}

function classify(t) {
  const text = t.full_text || t.text || "";
  if (/^RT @\w+:/.test(text)) return "retweet";
  if (t.in_reply_to_screen_name || t.in_reply_to_status_id_str) return "reply";
  return "post";
}

function normalize(t) {
  const id = t.id_str || String(t.id || "");
  const parts = parseCreatedAt(t.created_at);
  if (!id || !parts) return null;
  const text = t.full_text || t.text || "";
  const type = classify(t);
  const m = type === "retweet" ? text.match(/^RT @(\w+):/) : null;
  return {
    id, ts: parts.ts, year: parts.year, mmdd: parts.mmdd, secs: parts.secs,
    text, type,
    replyTo: t.in_reply_to_screen_name || null,
    retweetOf: m ? m[1] : null,
    fav: Number(t.favorite_count || 0),
    rt: Number(t.retweet_count || 0),
    lang: t.lang || null,
  };
}

function parseFileText(text) {
  const trimmed = text.trim();
  let json = trimmed;
  const eq = trimmed.indexOf("=");
  if (/^window\.YTD\./.test(trimmed) && eq !== -1) {
    json = trimmed.slice(eq + 1).trim().replace(/;\s*$/, "");
  }
  const arr = JSON.parse(json);
  return arr.map((e) => (e && e.tweet ? e.tweet : e)).filter(Boolean);
}

function extractScreenName(text) {
  const m = text.match(/"(?:screen_name|screenName|username)"\s*:\s*"([A-Za-z0-9_]{1,15})"/);
  return m ? m[1] : null;
}

/**
 * Load an archive from a folder containing data/tweets*.js (+ profile.js).
 * @param {string} archiveDir e.g. ./archive-data
 */
function loadArchive(archiveDir) {
  const dataDir = path.join(archiveDir, "data");
  const tweets = [];
  const seen = new Set();
  let skipped = 0;
  let screenName = null;

  if (!fs.existsSync(dataDir)) {
    return { tweets, skipped, screenName, files: [] };
  }
  const files = fs.readdirSync(dataDir).filter((f) => /^tweets.*\.js$/.test(f)).sort();
  for (const f of files) {
    let raw;
    try {
      raw = parseFileText(fs.readFileSync(path.join(dataDir, f), "utf8"));
    } catch {
      skipped += 1;
      continue;
    }
    for (const t of raw) {
      const n = normalize(t);
      if (!n || seen.has(n.id)) { skipped += 1; continue; }
      seen.add(n.id);
      tweets.push(n);
    }
  }
  for (const f of ["profile.js", "account.js"]) {
    const p = path.join(dataDir, f);
    if (fs.existsSync(p) && !screenName) {
      screenName = extractScreenName(fs.readFileSync(p, "utf8"));
    }
  }
  tweets.sort((a, b) => a.ts - b.ts);
  return { tweets, skipped, screenName, files };
}

module.exports = { loadArchive };
