import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://survey.oze.net.au',
  output: 'static',
  trailingSlash: 'never',
  integrations: [
    react(),
    sitemap({
      filter: (page) => !page.includes('404') && !page.includes('/admin'),
      serialize(item) {
        if (item.url.endsWith('/s/monthly-poll')) {
          return { ...item, changefreq: 'daily', priority: 1 };
        }
        if (item.url.includes('/s/')) {
          return { ...item, changefreq: 'monthly', priority: 0.8 };
        }
        return { ...item, changefreq: 'weekly', priority: 0.9 };
      },
    }),
  ],
});
