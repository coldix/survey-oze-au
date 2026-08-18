import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://survey.oze.net.au',
  output: 'static',
  trailingSlash: 'never',
  integrations: [react(), sitemap()],
});
