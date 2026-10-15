import { defineConfig } from 'vite';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const partial = (name) => readFileSync(resolve(root, 'partials', name), 'utf8');
const SKIP = ['node_modules', 'dist', 'public', 'partials', 'src', 'scripts', 'design', '.git'];

// Все страницы сайта: index.html в корне и в подпапках
function pages(dir = root, out = {}) {
  for (const name of readdirSync(dir)) {
    if (SKIP.includes(name)) continue;
    const full = resolve(dir, name);
    if (statSync(full).isDirectory()) pages(full, out);
    else if (name === 'index.html') out[relative(root, dir).replace(/\\/g, '/') || 'home'] = full;
  }
  return out;
}

// Общие блоки: <!-- @head -->, <!-- @header -->, <!-- @footer -->, <!-- @voyage -->. Активный пункт меню — по data-nav у <body>.
function partials() {
  return {
    name: 'omtnp-partials',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const nav = (html.match(/<body[^>]*data-nav="([^"]*)"/) || [])[1] || '';
        // Любой <!-- @имя --> заменяется на partials/имя.html
        return html.replace(/<!-- @([\w-]+) -->/g, (_, name) => {
          const part = partial(`${name}.html`);
          return name === 'header' ? part.replaceAll(`data-nav-id="${nav}"`, `data-nav-id="${nav}" aria-current="page"`) : part;
        });
      },
    },
    handleHotUpdate({ file, server }) {
      if (file.replace(/\\/g, '/').includes('/partials/')) server.ws.send({ type: 'full-reload' });
    },
  };
}

export default defineConfig({
  appType: 'mpa',
  server: { host: '127.0.0.1' },
  plugins: [partials()],
  build: { rollupOptions: { input: pages() } },
});
