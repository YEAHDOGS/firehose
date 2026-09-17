// @ts-nocheck
/**
 * Firehose archive parser — Twitter/X archive format.
 * Reads the `window.YTD.tweets.partN = [...]` JS files (and plain JSON
 * exports) and normalizes entries into a flat, sortable tweet record.
 * No dependencies, no network — everything runs client-side.
 */

const MONTHS = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

/**
 * Parse one archive file's text into raw tweet objects.
 * Accepts `window.YTD.tweets.part0 = [...]` payloads and bare JSON arrays.
 * @param {string} text
 * @returns {Array<object>}
 */
export function parseArchiveFile(text) {
  const trimmed = text.trim();
  let json = trimmed;
  const eq = trimmed.indexOf("=");
  if (/^window\.YTD\./.test(trimmed) && eq !== -1) {
    json = trimmed.slice(eq + 1).trim().replace(/;\s*$/, "");
  }
  const arr = JSON.parse(json);
  if (!Array.isArray(arr)) throw new Error("Archive payload is not an array");
  // Entries are { tweet: {...} } in real archives; tolerate bare tweets too.
  return arr.map((e) => (e && e.tweet ? e.tweet : e)).filter(Boolean);
}

/**
 * Parse "Wed Oct 10 20:19:24 +0000 2018" into parts.
 * @param {string} createdAt
 * @returns {{year:number, mmdd:string, secs:number, ts:number} | null}
 */
export function parseCreatedAt(createdAt) {
  if (typeof createdAt !== "string") return null;
  const m = createdAt.match(/^\w{3} (\w{3}) (\d{2}) (\d{2}):(\d{2}):(\d{2}) [+-]\d{4} (\d{4})$/);
  if (!m) return null;
  const month = MONTHS[m[1]];
  if (!month) return null;
  const year = Number(m[6]);
  const mmdd = `${month}-${m[2]}`;
  const secs = Number(m[3]) * 3600 + Number(m[4]) * 60 + Number(m[5]);
  const ts = Date.UTC(year, Number(month) - 1, Number(m[2]), Number(m[3]), Number(m[4]), Number(m[5]));
  return { year, mmdd, secs, ts };
}

/**
 * Classify a tweet as post | reply | retweet.
 * @param {object} t raw tweet
 */
export function classifyTweet(t) {
  const text = t.full_text || t.text || "";
  if (/^RT @\w+:/.test(text)) return "retweet";
  if (t.in_reply_to_screen_name || t.in_reply_to_status_id_str) return "reply";
  return "post";
}

/**
 * Normalize one raw tweet into a Firehose record. Returns null when unusable.
 * @param {object} t raw tweet
 */
export function normalizeTweet(t) {
  if (!t) return null;
  const id = t.id_str || String(t.id || "");
  const parts = parseCreatedAt(t.created_at);
  if (!id || !parts) return null;
  const text = t.full_text || t.text || "";
  const type = classifyTweet(t);
  let retweetOf = null;
  if (type === "retweet") {
    const m = text.match(/^RT @(\w+):/);
    retweetOf = m ? m[1] : null;
  }
  return {
    id,
    ts: parts.ts,
    year: parts.year,
    mmdd: parts.mmdd,
    secs: parts.secs,
    text,
    type,
    replyTo: t.in_reply_to_screen_name || null,
    retweetOf,
    fav: Number(t.favorite_count || 0),
    rt: Number(t.retweet_count || 0),
    lang: t.lang || null,
  };
}

/**
 * Parse + normalize a batch of archive file texts.
 * @param {Array<string>} fileTexts
 * @returns {{tweets: Array<object>, skipped: number}}
 */
export function importArchiveFiles(fileTexts) {
  const tweets = [];
  let skipped = 0;
  const seen = new Set();
  for (const text of fileTexts) {
    let raw;
    try {
      raw = parseArchiveFile(text);
    } catch {
      skipped += 1;
      continue;
    }
    for (const t of raw) {
      // Firehose export passthrough (previously normalized records).
      if (t && t.fhv === 1 && t.id && t.mmdd && typeof t.secs === "number") {
        if (!seen.has(t.id)) {
          seen.add(t.id);
          tweets.push(t);
        } else {
          skipped += 1;
        }
        continue;
      }
      const n = normalizeTweet(t);
      if (!n || seen.has(n.id)) {
        skipped += 1;
        continue;
      }
      seen.add(n.id);
      tweets.push(n);
    }
  }
  tweets.sort((a, b) => a.ts - b.ts);
  return { tweets, skipped };
}

/** Escape HTML then linkify URLs, @mentions and #hashtags. */
export function linkify(text) {
  const esc = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return esc
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
    .replace(/(^|\s)@(\w{1,15})/g, '$1<span class="text-sky-400">@$2</span>')
    .replace(/(^|\s)#(\w+)/g, '$1<span class="text-sky-400">#$2</span>');
}

/** Serialize normalized tweets for export / re-import round-trip. */
export function exportJson(tweets) {
  return JSON.stringify(tweets.map((t) => ({ ...t, fhv: 1 })));
}

/** Best-effort screen name extraction from profile.js / account.js text. */
export function extractScreenName(text) {
  const m = text.match(/"(?:screen_name|screenName|username)"\s*:\s*"([A-Za-z0-9_]{1,15})"/);
  return m ? m[1] : null;
}

/** "03-31" -> "Mar 31" */
export function prettyMmdd(mmdd) {
  const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const [m, d] = mmdd.split("-").map(Number);
  return `${names[m - 1]} ${d}`;
}

/** seconds since midnight -> "14:22" */
export function prettyTime(secs) {
  const h = String(Math.floor(secs / 3600)).padStart(2, "0");
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
  return `${h}:${m}`;
}

/** seconds since midnight -> "14:22:10" (clamped to 23:59:59) */
export function prettyClock(secs) {
  const c = Math.min(Math.floor(secs), 86399);
  const s = String(c % 60).padStart(2, "0");
  return `${prettyTime(c)}:${s}`;
}
