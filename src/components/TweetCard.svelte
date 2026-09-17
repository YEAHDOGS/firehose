<!-- TweetCard.svelte — one tweet on the replay timeline. -->
<script>
  import { linkify, prettyTime } from "../lib/archive.js";

  let { tweet, screenName } = $props();

  const YEAR_COLORS = [
    "bg-red-500/15 text-red-300 border-red-500/30",
    "bg-amber-500/15 text-amber-300 border-amber-500/30",
    "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    "bg-sky-500/15 text-sky-300 border-sky-500/30",
    "bg-violet-500/15 text-violet-300 border-violet-500/30",
    "bg-pink-500/15 text-pink-300 border-pink-500/30",
  ];

  const typeMeta = {
    post: { label: "POST", cls: "text-white/60 border-white/15" },
    reply: { label: "REPLY", cls: "text-sky-300 border-sky-500/30" },
    retweet: { label: "RT", cls: "text-emerald-300 border-emerald-500/30" },
  };

  let yearColor = $derived(YEAR_COLORS[tweet.year % YEAR_COLORS.length]);
  let meta = $derived(typeMeta[tweet.type] ?? typeMeta.post);
</script>

<article class="tweet-fly rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:p-4">
  <div class="flex items-center gap-2 text-[11px] sm:text-xs">
    <span class="rounded-full border px-2 py-0.5 font-bold tracking-wide {yearColor}">
      {tweet.year}
    </span>
    <span class="rounded-full border px-2 py-0.5 font-semibold tracking-wide {meta.cls}">
      {meta.label}
    </span>
    <span class="ml-auto font-mono text-white/50">{prettyTime(tweet.secs)}</span>
  </div>

  {#if tweet.type === "reply" && tweet.replyTo}
    <p class="mt-2 text-[11px] sm:text-xs text-white/40">
      replying to <span class="text-sky-400">@{tweet.replyTo}</span>
    </p>
  {/if}
  {#if tweet.type === "retweet" && tweet.retweetOf}
    <p class="mt-2 text-[11px] sm:text-xs text-white/40">
      retweeted from <span class="text-emerald-300">@{tweet.retweetOf}</span>
    </p>
  {/if}

  <p class="mt-1.5 text-sm sm:text-[15px] leading-relaxed text-white/90 break-words">
    {@html linkify(tweet.text)}
  </p>

  <div class="mt-2 flex items-center gap-4 text-[11px] sm:text-xs text-white/35">
    {#if screenName}<span>@{screenName}</span>{/if}
    {#if tweet.fav > 0}<span>♥ {tweet.fav}</span>{/if}
    {#if tweet.rt > 0}<span>⟳ {tweet.rt}</span>{/if}
  </div>
</article>

<style>
  .tweet-fly {
    animation: fly-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  @keyframes fly-in {
    from { opacity: 0; transform: translateX(48px) scale(0.98); }
    to { opacity: 1; transform: translateX(0) scale(1); }
  }
  @media (prefers-reduced-motion: reduce) {
    .tweet-fly { animation: none; }
  }
</style>
