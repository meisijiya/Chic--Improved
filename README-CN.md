<h1 align="center">Chic（老江湖的定制版）</h1>

<p align="center">
派生自 <a href="https://github.com/Siricee/hexo-theme-Chic">Siricee/hexo-theme-Chic</a>，本仓长期维护「欢迎来到老江湖的博客」实际在用的主题版本。
</p>

> 与上游的差别不是一次性的改造，而是持续维护的现状：站内搜索换成命令面板 + 构建期分段索引，目录布局、无障碍与构建可复现性都按自己的站点需求调整过。

- 上游主题：<https://github.com/Siricee/hexo-theme-Chic>
- 本仓：<https://github.com/meisijiya/Chic--Improved>
- 使用方式：作为博客仓的 git submodule 挂在 `themes/Chic`
- 上游 README 里的完整配置项（导航、侧栏 links、版权、MathJax、日期格式等）仍然适用；本文件只记**本仓相对上游的现状**。

## 定制清单（相对上游）

| 功能 | 相关文件 | 说明 |
|---|---|---|
| 站内搜索面板 | `source/js/search-panel.js`、`source/css/search-panel.css`、`layout/_partial/header.ejs` | 导航栏放大镜打开浮层，三档形态（手机底部抽屉 / 大屏居中卡片 / PC 顶部对齐）；结果分段（标题 / 标签 / 分类目录 / 小节目录 / 正文），段头可折叠，候选可分页加载 |
| 构建期索引 | `scripts/search-index.js`、`search-index.baseline.json` | 构建时产出 `public/search/`：`manifest` + `meta` + `ascii`/`cn` 倒排 + 按小节切的正文分片，文件名带内容哈希且纯 ASCII |
| 页内高亮 | `source/js/search.js`、`layout/_page/post.ejs` | 检索结果带 `?sq=<关键词>#<小节锚点>`，落地高亮全篇并浮出「第 N/M 处」↑ ↓ 与关闭按钮 |
| 导航返回 | `layout/_partial/header.ejs` | 顶部 `← 返回`，优先回 `document.referrer` 的同源上一页 |
| 目录布局 | `layout/_partial/toc.ejs`、`toc-mobile.ejs`、`source/css/_page/_post/*.styl` | 平板/小桌面改流式两栏（固定侧栏不再压正文）；移动抽屉点目录项自动收起；`tocbot` 全站单实例 |
| 代码复制 | `source/js/code-copy.js` | 代码块悬停出现复制按钮，复制成功给反馈 |
| 图片 | `scripts/imageTag.js`、`scripts/lazy-image.js`、`source/js/lazy-img.js` | 图片标题转 `image-box`、图片懒加载 |
| 构建可复现 | 模板与生成器内部 | 标签、子分类、分类页文章列表、搜索索引一律内部排序，同一份源码两次构建产物字节一致 |
| 无障碍 | `layout/` 与 `source/css/search.css` | 移动目录按钮、高亮跳转按钮改原生 `<button>`；补 `aria-label` / `aria-expanded`；高亮计数用 `aria-live` 播报 |
| 第三方资源治理 | 与站点仓配合 | 主题 head 里用不到的 CDN 引用由站点侧 `after_render:html` 钩子移除，本仓不删上游标记 |

## 目录结构

```
layout/                     # EJS 模板：_partial（header/toc/comments）、_page（post/page/archive/category/tag）
scripts/                    # hexo 插件：imageTag、lazy-image、search-index（构建期索引生成器）
source/js/                  # script.js、search.js（页内高亮）、search-panel.js（面板）、code-copy.js、lazy-img.js、tocbot.min.js
source/css/                 # styl 源码 + 独立样式表 style.css 之外：search.css（高亮浮条与目录按钮重置）、search-panel.css
source/css/_page/_post/      # 文章页与目录抽屉的样式
languages/                  # 界面文案（default.yml 不含中文字面量）
search-index.baseline.json  # 首次实现的索引体积基线，供站点冒烟断言按「基线 +20% × 文章数同比」判定
```

## 站内搜索怎么工作

**构建期**：`scripts/search-index.js` 按文章 url 排序生成

```
public/search/manifest.json      清单：三份索引的带哈希文件名 + 文章数
public/search/meta.<hash>.json   每篇一条：url、标题、分类、标签、全部小节标题、摘要、分片名
public/search/ascii.<hash>.json  ASCII 词倒排（token 长度 ≥2）
public/search/cn.<hash>.json     中文二元组倒排（篇级 df ≥ 3）
public/search/shard/<stable>.<hash>.json  按小节切的正文纯文本 + 渲染后 HTML 的真实锚点 id
```

排序在生成器内部固定（terms 字典序、meta 按 url、分片按正文顺序），生成顺序单向 `分片 → meta → 倒排 → manifest`，所以同样的源码两次构建产物字节一致。

**运行期**：打开面板只取 `manifest` 与 `meta`；首次输入才拉 `ascii`，到位后后台补 `cn`；有正文候选时按批取分片（20 篇/批，已确认命中不足 10 且候选未尽继续拉）。候选过滤是 **AND**（查询切出的每个 token / 二元组都必须在该篇出现），命中次数在分片纯文本上数字面出现次数。缓存用 Cache Storage（不可用退内存），清单每次网络重取，文件名变了才重下。

索引产物与客户端分词规则必须一起改：改 `search-index.js` 的 token 口径时，`search-panel.js` 的 `analyzeQuery` 要同步。

## 安装

```bash
# 作为子模块挂到博客仓
git submodule add https://github.com/meisijiya/Chic--Improved.git themes/Chic
# 或换机后初始化
git submodule update --init

# 站点 _config.yml 指定主题
# theme: Chic
```

主题 `_config.yml` 里与搜索相关的样式表必须包含：

```yaml
stylesheets:
  - /css/style.css
  - /css/search.css
  - /css/search-panel.css
```

其余配置项（`nav`、`links`、`post_copyright_*`、`post_toc_enable`、`stylesheets`/`scripts` 列表等）与上游一致，见上游 README。

## 注意事项

- **`scripts/` 只放 `.js`**：hexo 会把主题 `scripts/` 下所有文件当插件加载，放一个 `.json` 就报 `Script load failed`（体积基线因此放在主题根目录）。
- **摘除 `<mark>` 必须就地解包**：遍历 `mark` 用文本节点替换，不能重写 `.post-content` 的 `innerHTML`，否则 `code-copy.js` 绑在 `.copy-btn` 上的监听会静默失效。
- **1023px 断点在 CSS 与 JS 里必须一致**：目录抽屉的 `display:none` 断点与搬移 `.tocbot-list` 的 `matchMedia` 差 1px，该宽度区间的目录会整个消失。
- **`source/js/search.js` 文件名保留**：检索入口已退役，但页内高亮三件套与移动端汉堡菜单的 `mobileBtn()` 还在这份文件里，模板内联 `onclick` 依赖 `window` 上的这些名字。

## LICENSE 开源许可

沿用上游许可：<a rel="license" href="http://creativecommons.org/licenses/by-nc-sa/4.0/">Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License</a>。

上游作者与设计归 Siricee；本仓的定制改动同样以同一许可发布。
