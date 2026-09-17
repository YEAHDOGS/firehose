<!-- SettingsDrawer.svelte — type/year toggles, API server, data management. -->
<script>
  import { settings, apiBase, dataSource, tweets, screenName } from "../lib/store.js";
  import { exportJson } from "../lib/archive.js";
  import { buildDemoData, DEMO_SCREEN_NAME } from "../lib/demo-data.js";

  let { open, onClose, onConnectApi, apiError, years } = $props();

  let apiUrl = $state("");
  let apiBusy = $state(false);

  $effect(() => {
    if (open) apiBase.subscribe((v) => { apiUrl = v; })();
  });

  function toggleYear(y) {
    settings.update((s) => {
      const ys = s.years.includes(y) ? s.years.filter((x) => x !== y) : [...s.years, y];
      return { ...s, years: ys };
    });
  }

  function clearData() {
    tweets.set([]);
    screenName.set(null);
    dataSource.set(null);
    onClose();
  }

  function loadDemo() {
    tweets.set(buildDemoData());
    screenName.set(DEMO_SCREEN_NAME);
    dataSource.set("demo");
    onClose();
  }

  function downloadJson() {
    let list = [];
    tweets.subscribe((v) => (list = v))();
    const blob = new Blob([exportJson(list)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "firehose-export.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function connect() {
    apiBusy = true;
    await onConnectApi(apiUrl.trim());
    apiBusy = false;
  }
</script>

{#if open}
  <div class="fixed inset-0 z-50">
    <button
      class="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-default"
      onclick={onClose}
      aria-label="Close settings"
    ></button>
    <aside class="absolute right-0 top-0 h-full w-full max-w-sm overflow-y-auto border-l border-white/10 bg-[#0b0b10] p-5">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-bold">Settings</h2>
        <button
          class="min-w-[44px] min-h-[44px] rounded-lg border border-white/15 text-white/70"
          onclick={onClose}
          aria-label="Close settings"
        >✕</button>
      </div>

      <section class="mt-6">
        <h3 class="text-xs font-bold uppercase tracking-widest text-white/40">Show on timeline</h3>
        <div class="mt-3 space-y-2">
          {#each [["showPosts", "Posts"], ["showReplies", "Replies"], ["showRetweets", "Retweets"]] as [key, label]}
            <label class="flex min-h-[44px] cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4">
              <span class="text-sm font-medium">{label}</span>
              <input
                type="checkbox"
                class="h-5 w-5 accent-[#ff3344]"
                checked={$settings[key]}
                onchange={(e) => settings.update((s) => ({ ...s, [key]: e.target.checked }))}
              />
            </label>
          {/each}
        </div>
      </section>

      <section class="mt-6">
        <h3 class="text-xs font-bold uppercase tracking-widest text-white/40">Years</h3>
        <p class="mt-1 text-xs text-white/40">Empty = all years.</p>
        <div class="mt-3 flex flex-wrap gap-2">
          {#each years as y}
            <button
              class="min-h-[44px] rounded-full border px-4 text-sm font-bold {$settings.years.includes(y) ? 'border-[#ff3344] bg-[#ff3344]/15 text-white' : 'border-white/15 text-white/50'}"
              onclick={() => toggleYear(y)}
              aria-pressed={$settings.years.includes(y)}
            >{y}</button>
          {/each}
          {#if years.length === 0}<p class="text-sm text-white/40">No data loaded.</p>{/if}
        </div>
      </section>

      <section class="mt-6">
        <h3 class="text-xs font-bold uppercase tracking-widest text-white/40">Archive server</h3>
        <p class="mt-1 text-xs text-white/40">
          Point at your Firehose Express server to stream the archive over the API instead of importing files.
        </p>
        <div class="mt-3 flex gap-2">
          <input
            class="min-h-[44px] flex-1 rounded-xl border border-white/15 bg-white/[0.03] px-3 text-sm"
            placeholder="http://localhost:3000"
            bind:value={apiUrl}
          />
          <button
            class="min-h-[44px] rounded-xl bg-[#ff3344] px-4 text-sm font-bold disabled:opacity-50"
            disabled={apiBusy}
            onclick={connect}
          >{apiBusy ? "…" : "Connect"}</button>
        </div>
        {#if apiError}<p class="mt-2 text-sm text-red-300">{apiError}</p>{/if}
        {#if $dataSource === "api"}<p class="mt-2 text-sm text-emerald-300">Connected — streaming from server.</p>{/if}
      </section>

      <section class="mt-6">
        <h3 class="text-xs font-bold uppercase tracking-widest text-white/40">Data</h3>
        <div class="mt-3 space-y-2">
          <button
            class="w-full min-h-[44px] rounded-xl border border-white/15 text-sm font-semibold text-white/80 hover:bg-white/5"
            onclick={downloadJson}
          >Export loaded tweets (JSON)</button>
          <button
            class="w-full min-h-[44px] rounded-xl border border-white/15 text-sm font-semibold text-white/80 hover:bg-white/5"
            onclick={loadDemo}
          >Reload fictional demo data</button>
          <button
            class="w-full min-h-[44px] rounded-xl border border-red-500/40 text-sm font-semibold text-red-300 hover:bg-red-500/10"
            onclick={clearData}
          >Clear all data</button>
        </div>
      </section>

      <p class="mt-6 text-[11px] leading-relaxed text-white/30">
        Firehose parses archives locally. File imports never leave your browser;
        API mode only talks to the server address you enter above.
      </p>
    </aside>
  </div>
{/if}
