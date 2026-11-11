// Static site builder: content/ -> HTML at the repo root (served by GitHub Pages, .nojekyll).
//   npm run build   – regenerate pages
//   npm run dev     – build once + serve on http://localhost:4000
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import { markSVG } from './lib/mark.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const json = (p) => JSON.parse(read(p));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const site = json('content/site.json');

/* ---------------- posts ---------------- */
function parsePost(file) {
  const raw = read(`content/posts/${file}`);
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) throw new Error(`missing front matter: ${file}`);
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    if (k === 'tags') v = v.replace(/^\[|\]$/g, '').split(',').map((t) => t.trim()).filter(Boolean);
    meta[k] = v;
  }
  const body = m[2];
  const words = body.replace(/```[\s\S]*?```/g, '').split(/\s+/).filter(Boolean).length;
  const slug = meta.slug || file.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
  return { ...meta, slug, html: marked.parse(body), minutes: Math.max(1, Math.round(words / 230)), url: `/blog/${slug}/` };
}
const posts = fs.readdirSync(path.join(ROOT, 'content/posts'))
  .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
  .map(parsePost)
  .filter((p) => p.draft !== 'true')
  .sort((a, b) => (a.date < b.date ? 1 : -1));

const fmtLong = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
const fmtShort = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });

/* ---------------- pieces ---------------- */
const ICON_MOON = '<svg class="moon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9.4 2.6a9.6 9.6 0 1 0 12 12.1.7.7 0 0 0-.9-.9A7.8 7.8 0 0 1 10.3 3.5a.7.7 0 0 0-.9-.9Z"/></svg>';
const ICON_SUN = '<svg class="sun" viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></g></svg>';

// Header mark: liquid drop cluster -> pool -> traced human/robot hands (see lib/mark.mjs)
function mark() {
  return `<div class="mark">
  <div class="mark-hit" role="button" tabindex="0" aria-pressed="false" aria-label="Show drawing: a human hand and a robot hand almost touching"></div>
  ${markSVG(ROOT)}
  <span class="hint">[ touch ]</span>
</div>`;
}

// brand icons (Font Awesome Free 6.5.2, CC BY 4.0), inlined so they inherit currentColor
const icon = (name) => read(`assets/icons/${name}.svg`)
  .replace(/<!--[sS]*?-->/, '')
  .replace('<svg ', '<svg aria-hidden="true" focusable="false" fill="currentColor" ');

function nav(active) {
  const items = [['about', '/'], ['blog', '/blog/'], ['publications', '/publications/'], ['misc', '/misc/']];
  return `<nav class="site-nav">${items.map(([n, h]) =>
    `<a href="${h}"${n === active ? ' aria-current="page"' : ''}>${n}</a>`).join('')}</nav>`;
}

function layout({ title, description, active, body, home = false }) {
  const pageTitle = title ? `${title} · ${site.name}` : site.name;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(pageTitle)}</title>
<meta name="description" content="${esc(description || site.description)}">
<meta property="og:title" content="${esc(pageTitle)}">
<meta property="og:description" content="${esc(description || site.description)}">
<meta property="og:image" content="${site.url}/assets/img/hyungu.webp">
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<script>try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t}catch(e){}</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@300..600&family=Geist+Mono:wght@400;500&family=Instrument+Serif:ital@1&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/style.css">
<link rel="alternate" type="application/rss+xml" title="${esc(site.name)}" href="/feed.xml">
</head>
<body>
<main class="shell">
  <button class="theme-toggle" type="button" aria-label="Toggle theme">${ICON_MOON}${ICON_SUN}</button>
  <header class="masthead">
    <div>
      <h1><a href="/">${esc(site.name)}</a></h1>
      ${nav(active)}
    </div>
    ${home ? mark() : ''}
  </header>
${body}
  <p class="epigraph"><q class="sweep">Blue has no dimensions. It is beyond dimensions.</q><span>— Yves Klein</span></p>
  <footer class="site-foot"><span>© ${new Date().getFullYear()} ${esc(site.name)}</span><span>Seoul</span></footer>
</main>
<script src="/assets/js/main.js" defer></script>
</body>
</html>
`;
}

const postList = (list) => `<ul class="entries">${list.map((p) =>
  `<li class="entry"><span class="date">${fmtShort(p.date)}</span><div><a class="title" href="${p.url}">${esc(p.title)}</a></div></li>`).join('')}</ul>`;

function pubBlock(p) {
  const authors = p.authors.map((a) => (a.replace('*', '') === site.name ? `<b>${esc(a)}</b>` : esc(a))).join(', ');
  return `<article class="pub">
  ${p.image ? `<a class="preview" href="${p.links[0].href}"><img src="${p.image}" alt="${esc(p.imageAlt || p.title)}" loading="lazy"></a>` : ''}
  <div>
    <div class="head meta"><span>${esc(p.year)} · ${esc(p.org)}</span><span>#${esc(p.kind)}</span></div>
    <h3>${esc(p.title)}</h3>
    <p class="authors">${authors}</p>
    <p class="venue">${esc(p.venue)}</p>
    ${p.tldr ? `<p class="tldr">${esc(p.tldr)}</p>` : ''}
    <div class="plinks">${p.links.map((l) => `<a class="special" href="${l.href}">${esc(l.label)}</a>`).join('')}</div>
  </div>
</article>`;
}

/* ---------------- pages ---------------- */
const pubs = json('content/publications.json');
const news = json('content/news.json');
const intro = marked.parse(read('content/intro.md'));

const home = layout({
  active: 'about', home: true,
  body: `
  <section class="intro">${intro}</section>
  <section class="profile">
    <div class="photo"><img src="/assets/img/hyungu.webp" alt="Hyungu Kim, sitting by a window with a laptop" width="196" height="236"></div>
    <ul class="links">
      ${site.links.map((l) => `<li><a href="${l.href}" aria-label="${esc(l.label)}" title="${esc(l.label)}"${l.href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}><span class="br">[</span>${icon(l.icon)}<span class="br">]</span></a></li>`).join('\n      ')}
    </ul>
  </section>
  <hr class="rule">
  <section class="block">
    <h2 class="section">Latest posts</h2>
    ${postList(posts.slice(0, 5))}
    <a class="more" href="/blog/">all posts →</a>
  </section>
  <section class="block">
    <h2 class="section">Selected publications</h2>
    ${pubs.filter((p) => p.selected).map(pubBlock).join('\n')}
  </section>
  <section class="block news">
    <h2 class="section">News</h2>
    <ul class="entries">${news.map((n) => `<li class="entry"><span class="date">${esc(n.date)}</span><div>${marked.parseInline(n.text)}</div></li>`).join('')}</ul>
  </section>`,
});

const blog = layout({
  title: 'blog', active: 'blog',
  body: `
  <section class="block">
    <p class="meta">working notes — on agents, robots, and the space between thinking and acting.</p>
    <div>${posts.map((p) => `<article class="post-row">
      <div class="meta">${fmtLong(p.date)} · ${p.minutes} min read</div>
      <h3><a href="${p.url}">${esc(p.title)}</a></h3>
      <p>${esc(p.summary || '')}</p>
      <div class="tags">${(p.tags || []).join(', ')}</div>
    </article>`).join('')}</div>
  </section>`,
});

const publications = layout({
  title: 'publications', active: 'publications',
  body: `
  <section class="block">
    <p class="meta">* equal contribution</p>
    ${pubs.map(pubBlock).join('\n')}
  </section>`,
});

const misc = layout({
  title: 'misc', active: 'misc',
  body: `<section class="block prose">${marked.parse(read('content/misc.md'))}</section>`,
});

const postPage = (p) => layout({
  title: p.title, description: p.summary, active: 'blog',
  body: `
  <article>
    <header class="post-head">
      <div class="meta">${fmtLong(p.date)} · ${p.minutes} min read</div>
      <h1>${esc(p.title)}</h1>
      <div class="tags">${(p.tags || []).join(', ')}</div>
    </header>
    <div class="prose">${p.html}</div>
  </article>`,
});

const notFound = layout({ title: 'not found', body: `<section class="block"><p class="meta">404 — nothing here. <a class="special" href="/">go home</a></p></section>` });

const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>${esc(site.name)}</title><link>${site.url}</link><description>${esc(site.description)}</description>
${posts.map((p) => `<item><title>${esc(p.title)}</title><link>${site.url}${p.url}</link><guid>${site.url}${p.url}</guid><pubDate>${new Date(p.date + 'T00:00:00Z').toUTCString()}</pubDate><description>${esc(p.summary || '')}</description></item>`).join('\n')}
</channel></rss>`;

/* ---------------- write ---------------- */
function write(rel, html) {
  const f = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, html);
}
function build() {
  fs.rmSync(path.join(ROOT, 'blog'), { recursive: true, force: true });
  write('index.html', home);
  write('blog/index.html', blog);
  for (const p of posts) write(`blog/${p.slug}/index.html`, postPage(p));
  write('publications/index.html', publications);
  write('misc/index.html', misc);
  write('404.html', notFound);
  write('feed.xml', feed);
  write('.nojekyll', '');
  console.log(`built ${posts.length} post(s)`);
}
build();

if (process.argv.includes('--serve')) {
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.pdf': 'application/pdf', '.xml': 'application/xml', '.json': 'application/json' };
  http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.resolve(ROOT, '.' + p);
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404, { 'content-type': 'text/html' }); return res.end(fs.readFileSync(path.join(ROOT, '404.html'))); }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(f).pipe(res);
  }).listen(4000, () => console.log('http://localhost:4000'));
}
