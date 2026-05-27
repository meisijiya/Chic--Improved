Changelogs

## 2026.5.27

\[fix bugs\] fix three issues:

1. **Search box not displaying at 731-931px width.** Root cause: `.nav-search-input` auto-display media query breakpoint (768px) didn't align with mobile navbar breakpoint (1023px), leaving a dead zone where the search input was hidden and the toggle icon was unreliable. Fixed by unifying all search-related mobile breakpoints to 1023px.
2. **Highlight navigation bar not hiding when search input is cleared.** Root cause: the overridden `navSearch` function called `highlightPostContent('')` to strip marks but returned early without calling `updateHighlightCount()`, leaving the nav bar visible with stale count. Fixed by adding `updateHighlightCount()` call in the empty-keyword branch.
3. **Long article titles overflowing on mobile archive page.** Root cause: `.archive-item-link` had `overflow:hidden` and `white-space:nowrap` but `text-overflow:ellipsis` was commented out and no `max-width` constraint was set, so text never truncated. Fixed by switching `.archive-item` to flexbox layout, activating `text-overflow:ellipsis`, and adding `min-width:0; flex:1` to enable proper flex truncation.

## 2025.4.12

\[enhancement\]  

1. optimized the style of light/dark switch button.
2. fixed header being selected by mouse clicked twice times.
3. support highlight code styles with light/dark theme.

## 2022.2.9

\[enhancement\] optimize the layout of profile on the mobile terminal.

## 2021.5.25

\[fix bugs\] fixed issue#98. add rules of scrollbar in body.

## 2020.3.28

\[fix bugs\] merged PR#68. fix typo in links icon. 

## 2020.2.2

\[enhancement\] add image-title. 

## 2019.10.18

\[enhancement\] add SEO meta name `author,subtitle`.

## 2019.9.16

\[optimization\] change code style line-height 1.7em.

## 2019.9.11

\[deprecated\] deprecated variable `theme.language`, which can be instead of `config.language`.

## 2019.9.4

\[fix bugs\] fix mistake of media query.(due 9.3 bug still remains.) Changed max-device-width to max-width.

## 2019.9.3

\[fix bugs\] fix mistake of media query. Page width adaptation under 480px.

## 2019.9.1

\[fix bugs\] hide checkbox of switch button in header (in MacOS enviornment)

\[optimization\] change paragraph spacing 0.5em to 1em.Now it's more clear.

## 2019.8.3

\[enhancement\] add pullquote style support.

\[optimization\] add Quote style,especially author field.

\[fix bugs\] fix 'home' button at the bottom of post page linked to wrong path in secondary dictionary.
## 2019.7.26
\[fix bugs\] Merge pull request from EvilCult/bug-timeformat.

fix variable time_format doesn't work in page. 

## 2019.7.9

\[enhancement\] change native hexo-toc function to tocbot component.

github: [tscanlin/tocbot: Build a table of contents from headings in an HTML document.](https://github.com/tscanlin/tocbot)


## 2019.7.6

\[enhancement\] add MathJax support,now you can type math formula in LaTeX.

[MathJax | Beautiful math in all browsers.](https://www.mathjax.org/)


## 2019.7.5

\[optimization\] add component fragment_cache in layout to decline requests in render process.

## 2019.6.11

Release the first version.

feature:
- dark / light theme
- responsive
- abundant highlight schemes

ejs + stylus + native javascript

## Start - 2019.6.2
