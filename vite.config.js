import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { svelteTesting } from '@testing-library/svelte/vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/firehose/',
  plugins: [
    tailwindcss(),
    svelte(),
    // Test-only: resolves the Svelte client build under Vitest so
    // mount()/render() work in jsdom. No effect on vite build output.
    svelteTesting()
  ],
  test: {
    environment: 'jsdom',
  },
})
