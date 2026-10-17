// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://emberfox.online',
  // 'file' keeps the existing URLs: /support.html, /index.html
  build: { format: 'file' },
  vite: { plugins: [tailwindcss()] },
});
