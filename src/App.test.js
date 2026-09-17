import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseArchiveFile, parseCreatedAt, classifyTweet, normalizeTweet,
  importArchiveFiles, exportJson, extractScreenName, linkify,
  prettyMmdd, prettyTime, prettyClock,
} from './lib/archive.js';
import { createPlayer } from './lib/player.js';
import { buildDemoData } from './lib/demo-data.js';

const RAW_TWEET = {
  id_str: "123",
  created_at: "Sat Mar 31 14:22:10 +0000 2024",
  full_text: "hello world https://example.com",
  in_reply_to_screen_name: null,
  favorite_count: "5",
  retweet_count: "2",
  lang: "en",
};

const ARCHIVE_TEXT =
  'window.YTD.tweets.part0 = [{"tweet":' + JSON.stringify(RAW_TWEET) + "}]";

describe("archive parser", () => {
  it("parses window.YTD payloads", () => {
    const raw = parseArchiveFile(ARCHIVE_TEXT);
    expect(raw).toHaveLength(1);
    expect(raw[0].id_str).toBe("123");
  });

  it("parses bare JSON arrays", () => {
    const raw = parseArchiveFile(JSON.stringify([RAW_TWEET]));
    expect(raw).toHaveLength(1);
  });

  it("rejects non-arrays", () => {
    expect(() => parseArchiveFile('window.YTD.tweets.part0 = {"a":1}')).toThrow();
  });

  it("parses created_at into year/mmdd/secs", () => {
    const p = parseCreatedAt("Sat Mar 31 14:22:10 +0000 2024");
    expect(p).toMatchObject({ year: 2024, mmdd: "03-31", secs: 14 * 3600 + 22 * 60 + 10 });
  });

  it("rejects malformed created_at", () => {
    expect(parseCreatedAt("not a date")).toBeNull();
    expect(parseCreatedAt(null)).toBeNull();
  });

  it("classifies posts, replies, retweets", () => {
    expect(classifyTweet({ full_text: "just a post" })).toBe("post");
    expect(classifyTweet({ full_text: "@x hi", in_reply_to_screen_name: "x" })).toBe("reply");
    expect(classifyTweet({ full_text: "RT @x: wow" })).toBe("retweet");
  });

  it("normalizes a tweet record", () => {
    const n = normalizeTweet(RAW_TWEET);
    expect(n).toMatchObject({ id: "123", year: 2024, mmdd: "03-31", type: "post", fav: 5, rt: 2 });
  });

  it("captures retweet attribution", () => {
    const n = normalizeTweet({ ...RAW_TWEET, full_text: "RT @someone: hi" });
    expect(n.type).toBe("retweet");
    expect(n.retweetOf).toBe("someone");
  });

  it("dedupes and sorts on import", () => {
    const other = { ...RAW_TWEET, id_str: "124", created_at: "Sat Mar 31 09:00:00 +0000 2024" };
    const text = 'window.YTD.tweets.part0 = [{"tweet":' + JSON.stringify(RAW_TWEET) +
      '},{"tweet":' + JSON.stringify(RAW_TWEET) + '},{"tweet":' + JSON.stringify(other) + "}]";
    const { tweets, skipped } = importArchiveFiles([text]);
    expect(tweets).toHaveLength(2);
    expect(skipped).toBe(1);
    expect(tweets[0].id).toBe("124"); // sorted by time
  });

  it("round-trips through exportJson", () => {
    const { tweets } = importArchiveFiles([ARCHIVE_TEXT]);
    const back = importArchiveFiles([exportJson(tweets)]);
    expect(back.tweets).toHaveLength(1);
    expect(back.tweets[0].id).toBe("123");
  });

  it("extracts screen names defensively", () => {
    expect(extractScreenName('{"screen_name":"cooluser"}')).toBe("cooluser");
    expect(extractScreenName('{"username":"cooluser"}')).toBe("cooluser");
    expect(extractScreenName("nothing here")).toBeNull();
  });

  it("linkifies safely", () => {
    const html = linkify('<b>x</b> https://example.com @user #tag');
    expect(html).not.toContain("<b>");
    expect(html).toContain('href="https://example.com"');
  });

  it("formats dates and times", () => {
    expect(prettyMmdd("03-31")).toBe("Mar 31");
    expect(prettyTime(14 * 3600 + 22 * 60 + 10)).toBe("14:22");
    expect(prettyClock(3661)).toBe("01:01:01");
  });
});

describe("demo data", () => {
  it("builds fictional tweets across years for today", () => {
    const now = new Date();
    const mmdd = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const tweets = buildDemoData();
    expect(tweets.length).toBeGreaterThan(20);
    const todayTweets = tweets.filter((t) => t.mmdd === mmdd);
    expect(todayTweets.length).toBeGreaterThan(5);
    expect(new Set(tweets.map((t) => t.year)).size).toBeGreaterThanOrEqual(5);
  });
});

describe("player", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const queue = [
    { id: "a", secs: 3600, year: 2024 },
    { id: "b", secs: 7200, year: 2023 },
    { id: "c", secs: 7200, year: 2024 },
  ];

  it("releases tweets as the clock passes them", () => {
    const p = createPlayer();
    let state;
    p.subscribe((s) => (state = s));
    p.load(queue, 60);
    p.play();
    vi.advanceTimersByTime(60_000); // 60s real * 60x = 3600s clock -> first tweet
    expect(state.visible.map((t) => t.id)).toEqual(["a"]);
    expect(state.playing).toBe(true);
    p.destroy();
  });

  it("pauses and seeks", () => {
    const p = createPlayer();
    let state;
    p.subscribe((s) => (state = s));
    p.load(queue, 60);
    p.seek(8000);
    expect(state.visible).toHaveLength(3);
    p.play();
    p.pause();
    expect(state.playing).toBe(false);
    p.destroy();
  });

  it("jumpToNext skips to the next tweet", () => {
    const p = createPlayer();
    let state;
    p.subscribe((s) => (state = s));
    p.load(queue, 60);
    p.jumpToNext();
    expect(state.clock).toBe(3600);
    expect(state.visible).toHaveLength(1);
    p.destroy();
  });

  it("finishes at end of day", () => {
    const p = createPlayer();
    let state;
    p.subscribe((s) => (state = s));
    p.load(queue, 0); // all at once
    p.play();
    expect(state.done).toBe(true);
    expect(state.visible).toHaveLength(3);
    p.destroy();
  });
});
