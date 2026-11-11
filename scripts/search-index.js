/**
 * 站内搜索索引生成器（构建期）。
 *
 * 产物（public/search/）：
 *   manifest.json            清单，把三份索引绑成同一版
 *   meta.<hash>.json         每篇一条元数据，按 url 字典序
 *   ascii.<hash>.json        ASCII 词倒排
 *   cn.<hash>.json           中文二元组倒排（篇级 df >= 3）
 *   shard/<stable>.<hash>.json  按小节切分的正文纯文本
 *
 * <hash> = 文件字节 sha256 前 12 位；<stable> = 文章 url 的 sha1 前 12 位（文件名必须纯 ASCII：
 * 文章路径大量含中文，而本仓 fs 递归操作遇中文目录名会崩）。
 *
 * 生成顺序单向：分片 → meta → 倒排（docIdx = meta 下标）→ manifest。
 * 三处排序在生成器内部做死：terms 字典序、meta 按 url、分片 s[] 按正文顺序；
 * hexo 7 并行处理源文件、locals.posts 无固定顺序，不能依赖它。
 */

const crypto = require('crypto');

const hash6 = (algo, text) => crypto.createHash(algo).update(text, 'utf8').digest('hex').slice(0, 12);

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (whole, code) => {
    if (code[0] === '#') {
      const cp = code[1] === 'x' || code[1] === 'X'
        ? parseInt(code.slice(2), 16)
        : parseInt(code.slice(1), 10);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : whole;
    }
    const named = ENTITIES[code.toLowerCase()];
    return named === undefined ? whole : named;
  });
}

/** 渲染后 HTML → 纯文本：去标签、解实体、折空白 */
function toPlainText(html) {
  return decodeEntities(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

const HEADING_RE = /<h([2-6])\b([^>]*)>([\s\S]*?)<\/h\1>/gi;

/** 按 h2–h6 切小节；锚点 id 原样取自渲染后 HTML，不复刻 slugger */
function splitSections(html) {
  const sections = [];
  let cursor = 0;
  let match;
  HEADING_RE.lastIndex = 0;
  while ((match = HEADING_RE.exec(html)) !== null) {
    const idMatch = match[2].match(/\bid="([^"]*)"/i);
    if (!idMatch) continue; // 无 id 的标题不是小节锚点，正文留在上一节
    if (sections.length === 0) {
      sections.push({ i: '', t: '', x: toPlainText(html.slice(0, match.index)) });
    } else {
      sections[sections.length - 1].x = toPlainText(html.slice(cursor, match.index));
    }
    sections.push({ i: decodeEntities(idMatch[1]), t: toPlainText(match[3]), l: Number(match[1]), x: '' });
    cursor = match.index + match[0].length;
  }
  if (sections.length === 0) {
    sections.push({ i: '', t: '', x: toPlainText(html) });
  } else {
    sections[sections.length - 1].x = toPlainText(html.slice(cursor));
  }
  return sections;
}

const ASCII_RE = /[a-z0-9][a-z0-9+#._-]*/g;

function asciiTokens(text) {
  return (text.toLowerCase().match(ASCII_RE) || []).filter((t) => t.length >= 2);
}

function cnBigrams(text) {
  const out = [];
  for (const run of text.match(/[\u4e00-\u9fff]+/g) || []) {
    for (let i = 0; i + 1 < run.length; i += 1) out.push(run.slice(i, i + 2));
  }
  return out;
}

function countTerms(tokens) {
  const tf = new Map();
  for (const token of tokens) tf.set(token, (tf.get(token) || 0) + 1);
  return tf;
}

/** term -> [[docIdx, tf], ...]，terms 字典序、docIdx 升序 */
function buildInvertedIndex(docTokenLists) {
  const terms = new Map();
  docTokenLists.forEach((tokens, docIdx) => {
    for (const [term, tf] of countTerms(tokens)) {
      let docs = terms.get(term);
      if (!docs) terms.set(term, (docs = []));
      docs.push([docIdx, tf]);
    }
  });
  return [...terms.keys()]
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .map((term) => [term, terms.get(term)]);
}

hexo.extend.generator.register('search-index', function (locals) {
  const root = this.config.root || '/';

  // ① 按 url 排序，生成器自己排，不依赖 hexo 的分发顺序
  const posts = locals.posts
    .toArray()
    .map((post) => {
      const path = String(post.path || '');
      return { post, url: (root + path).replace(/\/{2,}/g, '/') };
    })
    .sort((a, b) => (a.url < b.url ? -1 : a.url > b.url ? 1 : 0));

  // ② 逐篇生成分片
  const files = [];
  const meta = [];
  posts.forEach(({ post, url }) => {
    const sections = splitSections(post.content || '');
    // v2：分片小节补标题级别 l（2~6），助手按它算 children；旧消费方忽略新字段
    const shard = { v: 2, u: url, t: post.title || '', s: sections };
    const shardBytes = JSON.stringify(shard);
    const name = `${hash6('sha1', url)}.${hash6('sha256', shardBytes)}.json`;
    files.push({ path: `search/shard/${name}`, data: shard });

    // ③ 元数据：全部小节标题不截断。h 保持字符串数组——站内搜索面板直接对它调
    //    toLowerCase()，改形状会让目录命中抛错；级别只进分片（s[].l）。
    const headings = sections.filter((sec) => sec.i).map((sec) => sec.t);
    const plain = toPlainText(post.content || '');
    meta.push({
      u: url,
      t: post.title || '',
      c: post.categories.toArray().map((cat) => cat.name),
      g: post.tags.toArray().map((tag) => tag.name).sort(),
      h: headings,
      s: plain.slice(0, 120),
      f: `shard/${name}`,
      // 倒排与分片正文只算正文小节，标题前导语也是正文的一部分
      _text: sections.map((sec) => sec.t + ' ' + sec.x).join(' '),
    });
  });
  meta.sort((a, b) => (a.u < b.u ? -1 : a.u > b.u ? 1 : 0));

  // ④ 倒排，docIdx 即 meta 下标
  const texts = meta.map((entry) => entry._text);
  const ascii = { v: 1, terms: buildInvertedIndex(texts.map(asciiTokens)) };

  const cnDocs = texts.map(cnBigrams);
  const docFreq = new Map();
  for (const tokens of cnDocs) {
    for (const term of countTerms(tokens).keys()) docFreq.set(term, (docFreq.get(term) || 0) + 1);
  }
  const cn = {
    v: 1,
    terms: buildInvertedIndex(cnDocs).filter(([term]) => docFreq.get(term) >= 3),
  };

  for (const entry of meta) delete entry._text;

  // ⑤ manifest 最后生成，引用带哈希的文件名
  const emit = (prefix, obj) => {
    const bytes = JSON.stringify(obj);
    const name = `${prefix}.${hash6('sha256', bytes)}.json`;
    files.push({ path: `search/${name}`, data: obj });
    return { name, size: Buffer.byteLength(bytes, 'utf8') };
  };
  const metaOut = emit('meta', meta);
  const asciiOut = emit('ascii', ascii);
  const cnOut = emit('cn', cn);
  files.push({
    path: 'search/manifest.json',
    data: {
      v: 2,
      meta: metaOut.name,
      ascii: asciiOut.name,
      cn: cnOut.name,
      shards: 'shard/',
      count: meta.length,
    },
  });

  // 自检：meta 条目数必须等于清单里的 count
  const shardSizes = files
    .filter((file) => file.path.startsWith('search/shard/'))
    .map((file) => Buffer.byteLength(JSON.stringify(file.data), 'utf8'))
    .sort((a, b) => a - b);
  const pick = (q) => shardSizes[Math.min(shardSizes.length - 1, Math.floor(shardSizes.length * q))];
  this.log.info(
    '[search-index] posts=%d meta=%dB ascii=%dB(%d terms) cn=%dB(%d terms) shard median=%dB p95=%dB max=%dB',
    meta.length,
    metaOut.size,
    asciiOut.size,
    ascii.terms.length,
    cnOut.size,
    cn.terms.length,
    pick(0.5),
    pick(0.95),
    shardSizes.length ? shardSizes[shardSizes.length - 1] : 0
  );

  return files;
});
