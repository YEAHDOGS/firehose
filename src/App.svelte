<!-- App.svelte — Firehose: your Twitter/X archive as a real-time replay. One page, one interface. -->
<script>
  import { onMount, tick } from "svelte";
  import {
    tweets, dataSource, screenName, apiBase, serverDetected,
    settings, selectedMmdd, availableYears, dayQueue, dayYearCounts,
    SPEED_OPTIONS,
  } from "./lib/store.js";
  import { createPlayer } from "./lib/player.js";
  import {
    importArchiveFiles, extractScreenName, prettyMmdd, prettyClock,
  } from "./lib/archive.js";
  import { buildDemoData, DEMO_SCREEN_NAME, DEMO_NOTICE } from "./lib/demo-data.js";
  import TweetCard from "./components/TweetCard.svelte";
  import ImportModal from "./components/ImportModal.svelte";
  import SettingsDrawer from "./components/SettingsDrawer.svelte";
  import badge from "./assets/made-by-dogs.png";

  const player = createPlayer();

  let showSettings = $state(false);
  let showImport = $state(false);
  let importBusy = $state(false);
  let importResult = $state(null);
  let apiError = $state(null);
  let follow = $state(true);
  let dateValue = $state(new Date().toISOString().slice(0, 10));
  let timelineEl = $state(null);

  // API mode: years come from the server; otherwise from loaded tweets.
  let apiYears = $state([]);
  let years = $derived($dataSource === "api" ? apiYears : $availableYears);

  // Reload the player's queue whenever the filtered day queue changes.
  $effect(() => {
    const q = $dayQueue;
    player.load(q, $settings.speed);
  });
  $effect(() => {
    player.setSpeed($settings.speed);
  });

  // Keep the selected MM-DD in sync with the date picker.
  $effect(() => {
    const [, m, d] = dateValue.split("-");
    if (m && d) selectedMmdd.set(`${m}-${d}`);
  });

  // API mode: fetch the selected day from the server.
  $effect(() => {
    if ($dataSource === "api") fetchDay($selectedMmdd);
  });

  // Auto-follow the newest tweet as it flies in.
  $effect(() => {
    const n = $player.visible.length;
    if (follow && timelineEl && n > 0) {
      tick().then(() => {
        timelineEl.scrollTo({ top: timelineEl.scrollHeight, behavior: "smooth" });
      });
    }
  });

  function onTimelineScroll() {
    if (!timelineEl) return;
    const nearBottom = timelineEl.scrollHeight - timelineEl.scrollTop - timelineEl.clientHeight < 120;
    follow = nearBottom;
  }

  async function fetchDay(mmdd) {
    let base = "";
    apiBase.subscribe((v) => (base = v))();
    try {
      const r = await fetch(`${base.replace(/\/$/, "")}/api/tweets?date=${mmdd}`);
      if (!r.ok) throw new Error(`server ${r.status}`);
      tweets.set(await r.json());
      apiError = null;
    } catch (e) {
      apiError = `Couldn't reach the archive server (${e.message}).`;
    }
  }

  async function connectApi(url) {
    apiBase.set(url);
    apiError = null;
    try {
      const clean = url.replace(/\/$/, "");
      const h = await fetch(`${clean}/api/health`);
      if (!h.ok) throw new Error(`server ${h.status}`);
      const health = await h.json();
      const [p, y] = await Promise.all([
        fetch(`${clean}/api/profile`).then((r) => r.json()).catch(() => ({})),
        fetch(`${clean}/api/years`).then((r) => r.json()).catch(() => []),
      ]);
      screenName.set(p.screenName || health.screenName || null);
      apiYears = Array.isArray(y) ? y : [];
      dataSource.set("api");
      await fetchDay($selectedMmdd);
    } catch (e) {
      apiError = `Couldn't reach ${url} (${e.message}). Is the server running?`;
    }
  }

  async function handleImportFiles(files) {
    importBusy = true;
    importResult = null;
    try {
      const texts = await Promise.all(files.map((f) => f.text()));
      const { tweets: list, skipped } = importArchiveFiles(texts);
      let name = null;
      for (const t of texts) {
        name = extractScreenName(t);
        if (name) break;
      }
      tweets.set(list);
      screenName.set(name);
      dataSource.set("file");
      apiYears = [];
      importResult = {
        ok: list.length > 0,
        message: list.length > 0
          ? `Imported ${list.length.toLocaleString()} tweets${skipped ? ` (${skipped} skipped)` : ""}.`
          : "No tweets found in those files — pick your archive's tweets.js files.",
      };
    } catch (e) {
      importResult = { ok: false, message: `Couldn't parse those files (${e.message}).` };
    }
    importBusy = false;
  }

  function loadDemo() {
    tweets.set(buildDemoData());
    screenName.set(DEMO_SCREEN_NAME);
    dataSource.set("demo");
    apiYears = [];
  }

  function setToday() {
    dateValue = new Date().toISOString().slice(0, 10);
  }

  onMount(() => {
    loadDemo();
    // If the SPA is served by the Express server, offer one-tap connect.
    fetch("/api/health")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(() => serverDetected.set(true))
      .catch(() => {});
    return () => player.destroy();
  });
</script>

<svelte:head>
  <title>Firehose — Twitter Archive Time Machine</title>
  <meta name="description" content="Replay any day of your Twitter/X archive across every year, in real time. Your tweets fly in at the exact second they were posted." />
</svelte:head>

<main class="h-dvh max-h-dvh w-full flex flex-col bg-[#050508] text-white overflow-hidden">
  <!-- HEADER -->
  <header class="z-10 border-b border-white/5 px-3 sm:px-5 py-2.5 flex items-center gap-2 sm:gap-3">
    <div class="flex items-center gap-2">
      <span class="text-xl" aria-hidden="true">🔥</span>
      <h1 class="text-base sm:text-lg font-black tracking-tight">FIREHOSE</h1>
    </div>
    <input
      type="date"
      bind:value={dateValue}
      class="ml-1 min-h-[40px] rounded-lg border border-white/15 bg-white/[0.03] px-2 text-sm text-white/85"
      aria-label="Replay date (year is ignored — every year replays)"
    />
    <button
      class="hidden sm:block min-h-[40px] rounded-lg border border-white/15 px-3 text-sm text-white/60 hover:bg-white/5"
      onclick={setToday}
    >Today</button>
    <div class="ml-auto flex items-center gap-2">
      {#if $serverDetected && $dataSource !== "api"}
        <button
          class="min-h-[40px] rounded-lg border border-emerald-500/40 px-3 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/10"
          onclick={() => connectApi(window.location.origin)}
        >Connect server</button>
      {/if}
      <button
        class="min-h-[40px] rounded-lg bg-[#ff3344] px-3 sm:px-4 text-sm font-bold hover:bg-[#e62e3d]"
        onclick={() => { showImport = true; importResult = null; }}
      >Import</button>
      <button
        class="min-w-[40px] min-h-[40px] rounded-lg border border-white/15 text-white/70 hover:bg-white/5"
        onclick={() => (showSettings = true)}
        aria-label="Open settings"
      >⚙</button>
    </div>
  </header>

  {#if $dataSource === "demo"}
    <p class="z-10 border-b border-amber-500/20 bg-amber-500/10 px-3 sm:px-5 py-1.5 text-[11px] sm:text-xs text-amber-200/90">
      {DEMO_NOTICE}
    </p>
  {/if}

  <!-- PLAYBACK BAR -->
  <div class="z-10 border-b border-white/5 px-3 sm:px-5 py-2 flex items-center gap-2 sm:gap-3 flex-wrap">
    <button
      class="min-w-[44px] min-h-[44px] rounded-full bg-white text-black text-lg font-bold hover:bg-white/85 disabled:opacity-40"
      onclick={() => player.toggle()}
      disabled={$player.queue.length === 0}
      aria-label={$player.playing ? "Pause replay" : "Play replay"}
    >{$player.playing ? "⏸" : "▶"}</button>
    <button
      class="min-w-[44px] min-h-[44px] rounded-full border border-white/15 text-white/70 hover:bg-white/5 disabled:opacity-40"
      onclick={() => player.restart()}
      disabled={$player.queue.length === 0}
      aria-label="Restart replay"
    >↺</button>
    <button
      class="min-h-[44px] rounded-full border border-white/15 px-3 text-xs sm:text-sm text-white/70 hover:bg-white/5 disabled:opacity-40"
      onclick={() => player.jumpToNext()}
      disabled={$player.queue.length === 0 || $player.done}
    >Next ↓</button>
    <span class="font-mono text-sm sm:text-base text-white/90 tabular-nums">{prettyClock($player.clock)}</span>
    <input
      type="range"
      min="0"
      max="86399"
      value={$player.clock}
      oninput={(e) => player.seek(Number(e.target.value))}
      class="flex-1 min-w-[80px] accent-[#ff3344]"
      aria-label="Scrub replay clock"
    />
    <select
      class="min-h-[40px] rounded-lg border border-white/15 bg-[#0b0b10] px-2 text-xs sm:text-sm text-white/80"
      value={$settings.speed}
      onchange={(e) => settings.update((s) => ({ ...s, speed: Number(e.target.value) }))}
      aria-label="Replay speed"
    >
      {#each SPEED_OPTIONS as o}
        <option value={o.value}>{o.label}</option>
      {/each}
    </select>
    <span class="text-xs sm:text-sm text-white/50 tabular-nums">
      {$player.visible.length}/{$player.queue.length}
    </span>
  </div>

  <!-- YEAR CHIPS -->
  {#if years.length > 0}
    <div class="z-10 border-b border-white/5 px-3 sm:px-5 py-2 flex items-center gap-2 overflow-x-auto">
      <span class="text-[11px] font-bold uppercase tracking-widest text-white/35 shrink-0">Years</span>
      {#each years as y}
        {@const active = $settings.years.length === 0 || $settings.years.includes(y)}
        {@const count = $dayYearCounts[y] ?? 0}
        <button
          class="shrink-0 min-h-[36px] rounded-full border px-3 text-xs font-bold {active ? 'border-[#ff3344] bg-[#ff3344]/15 text-white' : 'border-white/10 text-white/30'}"
          onclick={() => settings.update((s) => {
            const ys = s.years.includes(y) ? s.years.filter((x) => x !== y) : [...s.years, y];
            return { ...s, years: ys };
          })}
          aria-pressed={active}
          title={`${count} tweets on ${prettyMmdd($selectedMmdd)} ${y}`}
        >{y} <span class="opacity-60">· {count}</span></button>
      {/each}
    </div>
  {/if}

  <!-- TIMELINE -->
  <div
    bind:this={timelineEl}
    onscroll={onTimelineScroll}
    class="flex-1 overflow-y-auto px-3 sm:px-5 py-4"
  >
    <div class="mx-auto max-w-2xl">
      <h2 class="text-sm font-bold text-white/60 mb-3">
        {prettyMmdd($selectedMmdd)} — every year, in real time
      </h2>

      {#if $player.queue.length === 0}
        <div class="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
          {#if $tweets.length === 0}
            <p class="text-lg font-bold">No data loaded</p>
            <p class="mt-2 text-sm text-white/50">Import your Twitter/X archive to start the replay.</p>
            <button
              class="mt-4 min-h-[44px] rounded-xl bg-[#ff3344] px-6 text-sm font-bold"
              onclick={() => { showImport = true; }}
            >Import archive</button>
          {:else}
            <p class="text-lg font-bold">A quiet day.</p>
            <p class="mt-2 text-sm text-white/50">
              Nothing on {prettyMmdd($selectedMmdd)} in the selected years/types.
              Try another date, or loosen the filters in ⚙ settings.
            </p>
          {/if}
        </div>
      {:else}
        <div class="space-y-3">
          {#each $player.visible as t (t.id)}
            <TweetCard tweet={t} screenName={$screenName} />
          {/each}
          {#if !$player.done && $player.visible.length === 0}
            <p class="text-center text-sm text-white/40 py-8">
              Press ▶ — the first tweet flies in at its original time.
            </p>
          {/if}
          {#if $player.done}
            <p class="text-center text-xs text-white/30 py-6">
              — end of {prettyMmdd($selectedMmdd)} · {$player.visible.length} tweets replayed —
            </p>
          {/if}
        </div>
      {/if}
    </div>
  </div>

  <!-- FOOTER -->
  <footer class="z-10 border-t border-white/5 px-3 sm:px-5 py-2 flex items-center justify-between text-[11px] text-white/30">
    <span>
      {#if $screenName}@{$screenName} · {/if}{$tweets.length.toLocaleString()} tweets loaded
    </span>
    <a href="https://wearedogs.net" target="_blank" rel="noopener" class="hover:opacity-80 shrink-0">
      <img src={badge} alt="Made by DOGS" class="h-6 w-auto" />
    </a>
  </footer>
</main>

<ImportModal
  open={showImport}
  busy={importBusy}
  result={importResult}
  onClose={() => (showImport = false)}
  onFiles={handleImportFiles}
/>
<SettingsDrawer
  open={showSettings}
  years={years}
  apiError={apiError}
  onClose={() => (showSettings = false)}
  onConnectApi={connectApi}
/>
