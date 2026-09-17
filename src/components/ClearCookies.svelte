<script>
  import { clearSiteData, CONFIRM_TIMEOUT_MS } from '../lib/clear-site-data.js';

  let cleared = false;
  let timer;

  function handleClear() {
    clearSiteData();
    cleared = true;
    clearTimeout(timer);
    timer = setTimeout(() => (cleared = false), CONFIRM_TIMEOUT_MS);
  }
</script>

<button
  type="button"
  on:click={handleClear}
  class="text-[11px] tracking-wide text-neutral-500 hover:text-neutral-200 underline underline-offset-4 decoration-neutral-700 hover:decoration-neutral-400 transition-colors cursor-pointer"
  aria-live="polite"
>
  {cleared ? 'Site data cleared' : 'Clear cookies & site data'}
</button>
