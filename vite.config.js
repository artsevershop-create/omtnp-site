import { defineConfig } from 'vite';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as templates from './src/lib/templates.js';

const root = dirname(fileURLToPath(import.meta.url));
const partial = (name) => readFileSync(resolve(root, 'partials', name), 'utf8');
const BASE = process.env.BASE_PATH || '/';
// Адрес сайта для canonical, превью в соцсетях и sitemap. При переезде на свой домен — задать SITE_URL.
const SITE = (process.env.SITE_URL || 'https://artsevershop-create.github.io/omtnp-site').replace(/\/$/, '');
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

const pageUrl = (key) => `${SITE}/${key === 'home' ? '' : `${key}/`}`;

const ORGANIZATION = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'АО «Омтранснефтепродукт»',
  legalName: 'Акционерное общество «Омтранснефтепродукт»',
  url: `${SITE}/`,
  logo: `${SITE}/brand/OMTNP.svg`,
  foundingDate: '2008',
  email: 'omtnp@omtnp.ru',
  telephone: '+7-3812-31-44-06',
  taxID: '5528202607',
  address: { '@type': 'PostalAddress', streetAddress: 'ул. 10 лет Октября, 33', addressLocality: 'Омск', postalCode: '644024', addressCountry: 'RU' },
  areaServed: ['Обь-Иртышский бассейн', 'Обская губа', 'Тазовская губа', 'Енисейский бассейн'],
};

/** Canonical, Open Graph и разметка организации — из заголовка и описания самой страницы. */
function seoTags(html, path) {
  const attr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  if (path === '/404.html') return '<meta name="robots" content="noindex" />';
  const url = SITE + path.replace(/index\.html$/, '');
  const tags = [
    `<link rel="canonical" href="${url}" />`,
    '<meta property="og:type" content="website" />',
    '<meta property="og:locale" content="ru_RU" />',
    '<meta property="og:site_name" content="АО «Омтранснефтепродукт»" />',
    `<meta property="og:title" content="${attr(title)}" />`,
    `<meta property="og:description" content="${desc}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${SITE}/media/og.jpg" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    '<meta name="twitter:card" content="summary_large_image" />',
  ];
  if (path === '/index.html' || path === '/kontakty/index.html') {
    tags.push(`<script type="application/ld+json">${JSON.stringify(ORGANIZATION)}</script>`);
  }
  return tags.join('\n  ');
}

// Общие блоки: <!-- @имя --> — partials/имя.html, <!-- @@имя --> — блок с данными из templates.js.
// Активный пункт меню — по data-nav у <body>.
function site() {
  return {
    name: 'omtnp-site',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const nav = (html.match(/<body[^>]*data-nav="([^"]*)"/) || [])[1] || '';
        const out = html
          .replace(/<!-- @([\w-]+) -->/g, (_, name) => {
            const part = partial(`${name}.html`);
            return name === 'header' ? part.replaceAll(`data-nav-id="${nav}"`, `data-nav-id="${nav}" aria-current="page"`) : part;
          })
          .replace(/<!-- @@(\w+) -->/g, (_, name) => templates[name]())
          .replace('</head>', `  ${seoTags(html, ctx.path)}\n</head>`);
        // Сайт может жить в подпапке (GitHub Pages): внутренние ссылки получают префикс BASE
        // (картинки и <link> Vite переписывает сам — трогаем только ссылки <a>)
        return BASE === '/' ? out : out.replace(/(<a\b[^>]*?\shref=")\/(?!\/)/g, `$1${BASE}`);
      },
    },
    generateBundle() {
      const urls = Object.keys(pages()).map((key) => `  <url><loc>${pageUrl(key)}</loc></url>`).join('\n');
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n` });
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n` });
    },
    handleHotUpdate({ file, server }) {
      if (file.replace(/\\/g, '/').includes('/partials/')) server.ws.send({ type: 'full-reload' });
    },
  };
}

export default defineConfig({
  appType: 'mpa',
  base: BASE,
  server: { host: '127.0.0.1' },
  plugins: [site()],
  build: { rollupOptions: { input: { ...pages(), notfound: resolve(root, '404.html') } } },
});
