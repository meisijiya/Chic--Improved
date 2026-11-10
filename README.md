<h1 align="center">Chic (personal fork)</h1>

<p align="center">
Forked from <a href="https://github.com/Siricee/hexo-theme-Chic">Siricee/hexo-theme-Chic</a>. This repository is the theme version actually running on <a href="https://meisijiya.site">meisijiya.site</a>.
</p>

> The differences from upstream are not a one-off migration but the maintained state: search became a command-panel UI backed by a build-time segmented index, and the TOC layout, accessibility and build reproducibility were adjusted for this site.

- Upstream theme: <https://github.com/Siricee/hexo-theme-Chic>
- This fork: <https://github.com/meisijiya/Chic--Improved>
- Usage: a git submodule mounted at `themes/Chic` in the blog repository
- The full option set documented by upstream (nav, sidebar links, copyright, MathJax, date formats…) still applies. This file only records **what this fork does differently**.

## What this fork adds

| Feature | Files | Notes |
|---|---|---|
| Search panel | `source/js/search-panel.js`, `source/css/search-panel.css`, `layout/_partial/header.ejs` | Navbar magnifier opens a floating panel with three responsive shapes (phone bottom drawer / tablet centered card / desktop top-aligned). Results are grouped (title / tags / category paths / in-article headings / body) with collapsible groups and paged “more candidates” |
| Build-time index | `scripts/search-index.js`, `search-index.baseline.json` | Emits `public/search/`: `manifest` + `meta` + `ascii`/`cn` inverted indexes + per-article body shards. File names are content-hashed and ASCII-only |
| In-page highlight | `source/js/search.js`, `layout/_page/post.ejs` | Results link to `?sq=<keyword>#<section-anchor>`; the landing page highlights the whole article and shows “N/M” with ↑ ↓ and a close button |
| Back link | `layout/_partial/header.ejs` | `← 返回` returns to the same-origin `document.referrer` |
| TOC layout | `layout/_partial/toc*.ejs`, `source/css/_page/_post/*.styl` | Tablet widths use a flowing two-column layout (the fixed sidebar no longer overlaps text); the mobile drawer closes after picking an entry; `tocbot` runs as a single instance |
| Code copy | `source/js/code-copy.js` | Hover copy button on code blocks with success feedback |
| Images | `scripts/imageTag.js`, `source/js/lazy-image.js`, `source/js/lazy-img.js` | Image captions via `image-box`, lazy loading |
| Reproducible builds | templates and generators | Tags, sub-categories, category post lists and the search index are all sorted internally, so two builds of the same source are byte-identical |
| Accessibility | `layout/`, `source/css/search.css` | Mobile TOC button and highlight jump buttons are native `<button>` with `aria-label` / `aria-expanded`; the highlight counter is announced through `aria-live` |
| Third-party asset cleanup | site repository hook | Unused CDN references in the theme head are removed by an `after_render:html` hook in the site repo; upstream markup is left untouched here |

## Layout

```
layout/                     # EJS templates: _partial (header/toc/comments), _page (post/page/archive/category/tag)
scripts/                    # hexo plugins: imageTag, lazy-image, search-index (build-time index generator)
source/js/                  # script.js, search.js (in-page highlight), search-panel.js (panel), code-copy.js, lazy-img.js, tocbot.min.js
source/css/                 # styl sources plus search.css (highlight bar, TOC button reset) and search-panel.css
source/css/_page/_post/     # article and TOC drawer styles
languages/                  # UI strings (default.yml contains no Chinese literals)
search-index.baseline.json  # initial index-size baseline for the site smoke gate (+20% × article growth)
```

## How search works

**Build time** — `scripts/search-index.js` sorts articles by URL and emits:

```
public/search/manifest.json      list: hashed file names + article count
public/search/meta.<hash>.json   one entry per article: url, title, categories, tags, all headings, excerpt, shard name
public/search/ascii.<hash>.json  ASCII token inverted index (tokens length >= 2)
public/search/cn.<hash>.json     Chinese bigram inverted index (document df >= 3)
public/search/shard/<stable>.<hash>.json  per-section plain text plus the real anchor ids from rendered HTML
```

Ordering is fixed inside the generator (terms lexicographically, meta by URL, shards in document order) and generation is one-way (`shards → meta → inverted → manifest`), so repeated builds are byte-identical.

**Runtime** — opening the panel fetches only `manifest` and `meta`; the first keystroke fetches `ascii`, then `cn` in the background; shards are fetched in batches of 20 only when there are body candidates (continues while confirmed hits < 10). Candidate filtering is a strict **AND** over every token/bigram of the query, and hit counts are literal occurrences computed on shard text. Caching uses Cache Storage (memory fallback); the manifest is always revalidated, and only changed files are downloaded.

Token rules live in both the generator and the client — changing `analyzeQuery` in `search-panel.js` requires the same change in `search-index.js`.

## Installation

```bash
git submodule add https://github.com/meisijiya/Chic--Improved.git themes/Chic
# or, after cloning the blog repo
git submodule update --init

# site _config.yml
# theme: Chic
```

The theme's `_config.yml` stylesheet list must include:

```yaml
stylesheets:
  - /css/style.css
  - /css/search.css
  - /css/search-panel.css
```

All other options (`nav`, `links`, `post_copyright_*`, `post_toc_enable`, `stylesheets` / `scripts`) match upstream — see the upstream README.

## Gotchas

- **Only `.js` files in `scripts/`**: hexo loads every file in a theme's `scripts/` directory as a plugin; a stray `.json` fails with `Script load failed`. That is why the size baseline lives in the theme root.
- **Unwrapping `<mark>` must be in place**: walk the `mark` nodes and replace them with text nodes; rewriting `.post-content`'s `innerHTML` silently drops the listeners `code-copy.js` attached to `.copy-btn`.
- **The 1023px breakpoint must match between CSS and JS**: a 1px mismatch between the TOC drawer's `display:none` rule and the `matchMedia` that moves `.tocbot-list` makes the TOC disappear in that width range.
- **Keep the file name `source/js/search.js`**: the search entry code is gone, but the in-page highlight helpers and the mobile menu `mobileBtn()` still live there, and template inline `onclick` handlers depend on those `window` names.

## License

Inherited from upstream: <a rel="license" href="http://creativecommons.org/licenses/by-nc-sa/4.0/">Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License</a>.

Design and upstream work belong to Siricee; this fork's changes are released under the same license.
