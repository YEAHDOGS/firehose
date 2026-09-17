// @ts-nocheck
/** Firehose shared state — data, settings, playback. */
import { writable, derived } from "svelte/store";

export const SPEED_OPTIONS = [
  { label: "1× real time", value: 1 },
  { label: "60×", value: 60 },
  { label: "240×", value: 240 },
  { label: "All at once", value: 0 },
];

/** All normalized tweets currently loaded. */
export const tweets = writable([]);

/** 'demo' | 'file' | 'api' | null */
export const dataSource = writable(null);

/** Screen name of the archive owner (or demo persona). */
export const screenName = writable(null);

/** Base URL of the Firehose Express server, when in API mode. */
export const apiBase = writable("http://localhost:3000");

/** Server-detected flag: the SPA is being served by the Express server. */
export const serverDetected = writable(false);

export const settings = writable({
  showPosts: true,
  showReplies: true,
  showRetweets: true,
  years: [], // empty = all years
  speed: 60,
});

const today = new Date();
const pad = (n) => String(n).padStart(2, "0");

/** Selected replay day as "MM-DD". Year is ignored — every year replays. */
export const selectedMmdd = writable(`${pad(today.getMonth() + 1)}-${pad(today.getDate())}`);

/** Distinct years present in the loaded tweets. */
export const availableYears = derived(tweets, ($tweets) => {
  const s = new Set($tweets.map((t) => t.year));
  return [...s].sort((a, b) => a - b);
});

/** Tweets matching the selected day + type/year filters, sorted by time of day. */
export const dayQueue = derived(
  [tweets, selectedMmdd, settings],
  ([$tweets, $mmdd, $settings]) => {
    return $tweets
      .filter((t) => t.mmdd === $mmdd)
      .filter((t) =>
        (t.type === "post" && $settings.showPosts) ||
        (t.type === "reply" && $settings.showReplies) ||
        (t.type === "retweet" && $settings.showRetweets)
      )
      .filter((t) => $settings.years.length === 0 || $settings.years.includes(t.year))
      .sort((a, b) => a.secs - b.secs || a.year - b.year);
  }
);

/** Per-year counts for the selected day (respects type toggles, ignores year filter). */
export const dayYearCounts = derived([tweets, selectedMmdd, settings], ([$tweets, $mmdd, $s]) => {
  const counts = {};
  for (const t of $tweets) {
    if (t.mmdd !== $mmdd) continue;
    if (!((t.type === "post" && $s.showPosts) || (t.type === "reply" && $s.showReplies) || (t.type === "retweet" && $s.showRetweets))) continue;
    counts[t.year] = (counts[t.year] || 0) + 1;
  }
  return counts;
});
