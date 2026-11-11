# Design notes

This file records why the site looks and works the way it does, so future edits
keep the same character. For how to edit content and build, see `README.md`.

Reference sites that shaped it:
[alexzhang13](https://alexzhang13.github.io),
[maxtitov](https://maxtitov.com),
[joonghyuk](https://joonghyuk.com),
[heatz123](https://heatz123.github.io),
[surya.website](https://surya.website).

## Principles

- **Quiet page, one strong colour.** White paper, near-black ink, and
  International Klein Blue (`--klein: #1f2fcf`) as the only accent. Blue marks
  what you can act on (links, the active nav item, the progress line) and the
  one decorative element, the mark.
- **One column, always centred.** `--col: 700px` with a 24px gutter, centred at
  every width. An earlier left-aligned layout was dropped.
- **Show less by default, let readers open more.** Long lists fold, author
  lists fold, and section toggles sit beside the heading.
- **Plain, static, fast.** Hand-written HTML/CSS/JS plus a small Node build. No
  framework and no client-side rendering.

## Colour and type

| Token | Value | Use |
| --- | --- | --- |
| `--paper` | `#ffffff` | background (plain white, no grain: `--grain: 0`) |
| `--ink` / `--body` / `--muted` | `#16181c` / `#4a4f57` / `#7b8189` | headings / text / metadata |
| `--klein` | `#1f2fcf` | links, active nav, progress line, mark |
| `--hover` | Klein mixed 50% with Tiffany `#81d8d0` | link hover |
| dark `--current` | `#6f7dff` | Klein lifted for contrast on dark paper |

- **Fonts** (Google Fonts):
  - Geist (sans) for body text, set slightly heavier than default for
    readability.
  - Geist Mono for the name, nav, headings, dates and small labels.
  - Instrument Serif italic only for the epigraph quote.
- **Dark mode** follows the system setting. The sun/moon button overrides it.

## Layout and navigation

- **Sticky top bar with the nav only:** `about · blog · publications · misc`.
  - The name is not in the bar.
  - A thin Klein-blue **scroll-progress line** runs along its bottom edge.
- **Blog posts add a section strip** to the sticky bar.
  - It is a TOC built from the post's `h2`s.
  - The current section is the one crossing a line just below the bar.
- **The home page alone has a masthead.**
  - The name is typed out like a Vim buffer: insert-mode cursor, typing at
    a human rhythm, then a pause.
  - The mark sits beside it.
  - Other pages start straight with their content, with no name and no top
    gap.
- **The epigraph closes the home page:** *"Blue has no dimensions. It is
  beyond dimensions."* (Yves Klein). It was removed from the blog.

## The mark

- **Idle:** a cluster of Klein-blue drops (the drop style follows
  surya.website).
- **On hover, focus or tap:** the drops gather and flow into a line drawing of a
  human hand and a robot hand almost touching.
- **Speed:** the drawing is deliberately slow (`IN = 3400ms`, `OUT = 2000ms`) so
  it reads as drawing rather than a flash.
- **Reduced motion:** it fades instead.

How it's built is described in `README.md`, under *The header mark*.

## Home page

- **Intro** (`content/intro.md`):
  - Opens with "Hi! I'm Hyungu."
  - States the long-term goal, *embodiment-agnostic intelligent
    collaboration*, followed by four bold one-line components.
  - Ends with current work and a reach-out line. There is no tagline.
- **Selected publications:** 1 shown, the rest behind **[more]**.
- **News:** 2 shown, the rest behind **[more]**.
- **[more]/[less] toggles** (joonghyuk-style):
  - They sit right beside the section heading, so the button never moves
    when the list opens.
  - The label flips in place.
  - The counts are `PUBS_SHOWN` and `NEWS_SHOWN` in `build.mjs`.
- **Press coverage** goes into News as its own dated item that links the
  article, for example the SNU CSE article on AgentBeats.

## Publications

- **Card layout:** a method figure, then a meta line, the title, the authors,
  the venue, and then links.
- **Setting tag:** the top-right label is the research setting, not the paper
  type, e.g. `#simulation`, `#object tracking`. Set it with `setting` in
  `publications.json`; it falls back to `kind`.
- **Author folding:** after the first 3 authors the rest fold into
  `+N more`. The list is wrapped in a `<div class="authors">`, because a
  `<details>` inside a `<p>` breaks.
- **Links:** `report · code · Hugging Face`.

## Blog

- **Cards** like alexzhang13's: a Klein-blue sketch thumbnail, the title, the
  date and a summary (`thumb` and `thumb_pos` in the post's front matter). The
  blog has no intro paragraph.
- **Diagrams** are drawn in Excalidraw, exported in Klein blue, and blended
  into the page. The source `.excalidraw` files stay linked so they can be
  edited.

## Misc page

- **Short, bulleted sections:** Honors & Awards, Research Experience,
  Education, Projects. There is no Skills section and no GPA.
- **Research Experience** rows carry each lab's emblem (no border), the lab
  name linked in Klein blue, the role and dates, and the advisor:
  - SNU VGI (Prof. Jaesik Park)
  - Yonsei MMAI (Prof. Jongyoo Kim)
  - SNU PI Lab (Prof. Youngjae Yu)
- **Honors** name the track (Game Agent track) and link both the official page
  and press coverage.

## CV

- **One page.** Concise one-line bullets, no phone number, no leaderboard rank.
- **Research Interests** are split into *Long term* and *Currently*, each
  bullet tied to evidence such as `[P1]` or `[A1]`.
- **Source:** the LaTeX lives on Overleaf, with a plain-text twin. The PDF
  served here is `assets/files/CV_HyunguKim.pdf`.
- **Kept off the CV:** news and press items. Those go on the site only.

## Engineering choices

- **Cache busting:** CSS, JS and `/assets/` links carry `?v=<content hash>`.
  This stops browsers from serving a stale stylesheet or CV after a push.
- **Generated files are committed** (`index.html`, `blog/`, `publications/`,
  `misc/`, `feed.xml`). GitHub Pages serves the repo root as-is (`.nojekyll`).
- **Small scripts only.**
  - Theme toggle, scroll progress, TOC highlight, the mark, Vim typing, and the
    section toggles.
  - Idle work goes through `requestIdleCallback(fn, {timeout})`.
- **Review before push.** Every change is previewed locally (`npm run dev`) and
  pushed only after approval.
