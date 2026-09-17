<!-- ImportModal.svelte — archive file picker with instructions. -->
<script>
  let { open, busy, result, onClose, onFiles } = $props();

  let fileInput;

  function handleChange(e) {
    const files = [...(e.target.files ?? [])];
    if (files.length > 0) onFiles(files);
  }
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <button
      class="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-default"
      onclick={onClose}
      aria-label="Close import dialog"
    ></button>
    <div class="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0b0b10] p-5 sm:p-6">
      <h2 class="text-lg font-bold">Import your archive</h2>
      <ol class="mt-3 space-y-2 text-sm text-white/60 list-decimal list-inside">
        <li>Request your archive: X → Settings → Your account → Download an archive.</li>
        <li>Unzip it and open the <code class="text-white/85">data</code> folder.</li>
        <li>Select <code class="text-white/85">tweets.js</code> (plus <code class="text-white/85">tweets-part*.js</code> if present).</li>
      </ol>
      <p class="mt-3 text-xs text-white/40">
        Everything is parsed in your browser. Your archive never leaves this device.
      </p>

      <input
        bind:this={fileInput}
        type="file"
        accept=".js,.json"
        multiple
        class="hidden"
        onchange={handleChange}
      />
      <button
        class="mt-4 w-full min-h-[44px] rounded-xl bg-[#ff3344] font-bold text-white hover:bg-[#e62e3d] disabled:opacity-50"
        disabled={busy}
        onclick={() => fileInput.click()}
      >
        {busy ? "Parsing…" : "Choose archive files"}
      </button>

      {#if result}
        <p class="mt-3 text-sm {result.ok ? 'text-emerald-300' : 'text-red-300'}">
          {result.message}
        </p>
      {/if}

      <button
        class="mt-2 w-full min-h-[44px] rounded-xl border border-white/15 text-white/70 hover:bg-white/5"
        onclick={onClose}
      >
        Close
      </button>
    </div>
  </div>
{/if}
