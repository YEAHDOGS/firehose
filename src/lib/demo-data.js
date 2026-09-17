// @ts-nocheck
/**
 * Fictional demo dataset for Firehose. Every tweet here is invented —
 * it exists so the GitHub Pages demo has something to replay before the
 * user imports their own archive. Nothing here is a real person's data.
 */

const FICTIONAL_TEXTS = [
  "shipping the timeline replay today. tweets fly in at the exact second they were posted. this is the good stuff",
  "day 412 of building in public. nobody is watching. that's the point.",
  "hot take: your camera roll is a better diary than your journal",
  "just found a tweet from 3 years ago where i predicted exactly this. time traveler behavior",
  "the best feature is the one you don't have to explain",
  "deleting 40,000 emails. digital minimalism arc begins now",
  "RT @fictionaldev: ship it broken, fix it live, apologize never",
  "replying to my own tweet from 2021 like it's a different person. because it is.",
  "new rule: if the demo needs a tutorial, the demo is wrong",
  "currently explaining to my mom what an API is. send help",
  "the archive doesn't lie. past me had takes. present me has regrets.",
  "built a thing that replays your own history at you. therapy is expensive, this was free",
  "RT @madeupnews: local man discovers his old tweets, immediately logs off",
  "nothing humbles you like your own search history",
  "v2 idea: the firehose but for your group chats. absolutely not. never.",
  "today's replay brought to you by the letter Q and poor decisions",
  "if you're reading this in the demo, these tweets are all fake. the vibes are real though",
  "somewhere there's a tweet of mine aging like milk. the archive knows where",
  "productivity tip: reread your own timeline yearly. free cringe, priceless lessons",
  "RT @notarealperson: 'done is better than perfect' — me, shipping bugs since 2019",
  "the timeline is a river. the archive is a dam. firehose opens the floodgates",
  "dear future me: the password is still password123. love, past me",
  "just realized i've been tweeting into the void for a decade. the void tweets back now",
  "every retweet is a tiny time capsule someone else packed for you",
];

const FICTIONAL_REPLIES = [
  ["fictionaldev", "this is exactly right and you know it"],
  ["madeupnews", "source: trust me bro"],
  ["notarealperson", "ok but have you tried turning it off and on again"],
  ["demo_dog", "woof. (translation: agreed)"],
  ["fictionaldev", "quoting this for the group chat"],
];

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pad = (n) => String(n).padStart(2, "0");

function makeTweet(year, mmdd, secs, text, type, extra = {}) {
  const [mo, da] = mmdd.split("-").map(Number);
  return {
    id: `demo-${year}-${mmdd}-${secs}`,
    ts: Date.UTC(year, mo - 1, da, Math.floor(secs / 3600), Math.floor((secs % 3600) / 60), secs % 60),
    year,
    mmdd,
    secs,
    text,
    type,
    replyTo: extra.replyTo || null,
    retweetOf: extra.retweetOf || null,
    fav: extra.fav ?? 0,
    rt: extra.rt ?? 0,
    lang: "en",
  };
}

/**
 * Build the fictional demo dataset. Covers today's MM-DD across 2021–2026
 * plus a spread of sample dates, so the demo always has something to replay.
 */
export function buildDemoData() {
  const now = new Date();
  const todayMmdd = `${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const years = [2021, 2022, 2023, 2024, 2025, 2026];
  const sampleDates = ["01-15", "02-14", "04-01", "06-21", "09-17", "10-31", "12-25", todayMmdd];
  const dates = [...new Set(sampleDates)];
  const tweets = [];
  let seed = 1337;
  for (const mmdd of dates) {
    for (const year of years) {
      const rand = mulberry32(seed);
      seed += 1;
      const count = 2 + Math.floor(rand() * 4);
      for (let i = 0; i < count; i++) {
        const secs = Math.floor(rand() * 86400);
        const roll = rand();
        let text, type, extra = {};
        if (roll < 0.62) {
          text = FICTIONAL_TEXTS[Math.floor(rand() * FICTIONAL_TEXTS.length)];
          type = "post";
        } else if (roll < 0.82) {
          const [who, what] = FICTIONAL_REPLIES[Math.floor(rand() * FICTIONAL_REPLIES.length)];
          text = `@${who} ${what}`;
          type = "reply";
          extra = { replyTo: who };
        } else {
          const rtText = FICTIONAL_TEXTS[Math.floor(rand() * FICTIONAL_TEXTS.length)];
          const who = ["fictionaldev", "madeupnews", "notarealperson"][Math.floor(rand() * 3)];
          text = `RT @${who}: ${rtText}`;
          type = "retweet";
          extra = { retweetOf: who };
        }
        extra.fav = Math.floor(rand() * 120);
        extra.rt = Math.floor(rand() * 30);
        tweets.push(makeTweet(year, mmdd, secs, text, type, extra));
      }
    }
  }
  tweets.sort((a, b) => a.ts - b.ts);
  return tweets;
}

export const DEMO_SCREEN_NAME = "demo_dog";
export const DEMO_NOTICE = "Demo data — every tweet here is fictional. Import your own archive to replay your real timeline.";
