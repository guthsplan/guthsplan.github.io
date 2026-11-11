# guthsplan.github.io

Personal site of Hyungu Kim — https://guthsplan.github.io

Hand-written HTML/CSS/JS with a tiny Node build step. GitHub Pages serves the
built files at the repo root as-is (`.nojekyll`).

## Editing

| What | Where |
| --- | --- |
| Intro paragraph | `content/intro.md` |
| Links (GitHub, LinkedIn, X, CV) | `content/site.json` |
| Blog posts | `content/posts/YYYY-MM-DD-slug.md` (front matter: `title`, `date`, `summary`, `tags`) |
| Publications | `content/publications.json` |
| News | `content/news.json` |
| Misc page | `content/misc.md` |
| Styles / colours | `assets/css/style.css` (palette at the top) |

```bash
npm install
npm run dev     # build + serve on http://localhost:4000
npm run build   # regenerate the HTML before committing
```

Always run `npm run build` and commit the generated files (`index.html`,
`blog/`, `publications/`, `misc/`, `feed.xml`).

## The header mark

A cluster of Klein-blue drops that, on hover / focus / tap, gathers and flows
into a line drawing of a human hand and a robot hand almost touching.

- `content/art/hands-reference.png` — the reference drawing
- `tools/trace-hands.mjs` (`npm run trace`) — traces it into variable-width
  outlines + pen-order reveal masks → `content/hands.json`
- `lib/mark.mjs` — builds the SVG (drawing data only)
- `assets/js/main.js` — the animation (one progress value, eased in/out)

Icons: Font Awesome Free 6.5.2 (CC BY 4.0).
