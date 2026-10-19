/**
 * 为文章正文中的 <img> 补充 loading="lazy" / decoding="async"。
 *
 * 用途：修复 P4 —— 站点内所有正文图片都没有声明 loading，浏览器首屏就并发
 *       拉取全文图片，拖慢 LCP 并浪费首屏带宽。
 *
 * 生效链路：hexo 渲染文章 → marked 产出 data.content（完整 HTML 字符串）
 *       → 本过滤器拦截 after_post_render，就地改写 data.content
 *       → 布局模板输出最终 HTML。属性在生成期就写进产物，
 *       页面无需任何 JS 即可获得懒加载。
 *
 * 处理要点：
 * 1. 幂等：已带 loading= / decoding= 的 <img> 原样保留，重复执行不叠加属性。
 * 2. 保护代码块：正文里 <pre><code> 中的 <img> 是「示例代码字面量」，
 *    改写它们会把示例代码弄坏。方案是「分段替换」——先用正则把
 *    <pre>/<code> … </pre>/</code> 整段挖出并原样保留，只对剩下的
 *    「文本段」做 img 替换，最后按原顺序拼回。不使用占位符字符串，
 *    因此不存在占位符与正文冲突的风险。
 * 3. 只匹配 <img …> 标签本身，不触碰其它标签，也不改动已有的
 *    alt / src / class / width / height 等属性。
 *
 * 客户端兜底见 source/js/lazy-img.js（覆盖非文章页与未走本过滤器的历史产物）。
 */

// 保护区段：<pre …>…</pre> 与 <code …>…</code>，非贪婪匹配；反斜杠引用要求成对闭合
const PROTECTED_RE = /<(pre|code)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
// 单个 <img> 标签。
// 边界用前瞻而非 \b：\b 会把 <img-picture> 里的 '-' 当成分词边界而误匹配。
const IMG_TAG_RE = /<img(?=[\s/>])[^>]*>/gi;
// 属性边界：只认独立的 loading= / decoding=，避免误判 data-loading=
const HAS_LOADING_RE = /\sloading\s*=/i;
const HAS_DECODING_RE = /\sdecoding\s*=/i;

/** 在 <img> 标签的闭合处补一个属性，兼容 `<img />` 这种 XHTML 写法 */
function addAttr(tag, name, value) {
  const selfClosing = /\/\s*>$/.test(tag);
  // 自闭合写法切到 '/' 前时可能带上尾随空白，先裁掉，避免拼出双空格
  const body = (selfClosing ? tag.slice(0, tag.lastIndexOf('/')) : tag.slice(0, -1)).replace(/\s+$/, '');
  return `${body} ${name}="${value}"${selfClosing ? ' />' : '>'}`;
}

/** 只改写单个文本段里的 <img>，protected 区段不会走到这里 */
function processSegment(html) {
  return html.replace(IMG_TAG_RE, tag => {
    let next = tag;
    if (!HAS_LOADING_RE.test(next)) next = addAttr(next, 'loading', 'lazy');
    if (!HAS_DECODING_RE.test(next)) next = addAttr(next, 'decoding', 'async');
    return next;
  });
}

function addLazyLoading(html) {
  if (typeof html !== 'string' || !html) return html;

  // 用 exec 逐个取出保护区段的 [start, end)，先原样输出该段，
  // 再处理两段之间的普通文本。注意不能用 String.split —— 它会把
  // 捕获组（标签名）留在结果里，而被匹配的 pre/code 内容会被丢弃。
  const scanner = new RegExp(PROTECTED_RE.source, 'gi');
  const parts = [];
  let cursor = 0;
  let match;
  while ((match = scanner.exec(html)) !== null) {
    if (match[0].length === 0) {
      scanner.lastIndex += 1; // 防御：零宽匹配不推进会死循环
      continue;
    }
    parts.push(processSegment(html.slice(cursor, match.index)));
    parts.push(match[0]); // 保护区段逐字保留
    cursor = match.index + match[0].length;
  }
  parts.push(processSegment(html.slice(cursor)));
  return parts.join('');
}

/**
 * hexo 过滤器：文章渲染完成后统一改写正文 HTML。
 * @param {object} data 文章数据，data.content 为待输出的 HTML
 * @returns {object} 原对象
 */
function afterPostRender(data) {
  if (!data || typeof data.content !== 'string') return data;
  data.content = addLazyLoading(data.content);
  return data;
}

// 必须在执行时主动注册，不能靠 module.exports 的键名。
// hexo 的 hexo/load_plugins.js 里 loadScripts() 对每个脚本调 ctx.loadPlugin(path)
// 后只 .then() 打日志，返回值被丢弃；而 hexo/index.js 的 loadPlugin 只是把脚本包成
// `(async function(exports, require, module, __filename, __dirname, hexo){ ... })`
// 执行一次。也就是说 module.exports 上挂什么都读不到，脚本必须自我注册。
// wrapper 注入的第 6 个形参 hexo 就是真实实例，写法同目录的 imageTag.js。
hexo.extend.filter.register('after_post_render', afterPostRender);
