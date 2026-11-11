/**
 * 给常改的本地资产加内容哈希查询串。
 *
 * GitHub Pages 前面的边缘缓存对 /js/、/css/ 按 4 小时缓存（实测部署后 6 分钟仍在发旧
 * search-panel.js，Cache-Control: max-age=14400），改完资产线上要等几小时才生效。
 * 内容哈希进 URL 后，文件一变 URL 就变，缓存键跟着换，不需要等 TTL。
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ASSETS = {
  '/js/search-panel.js': 'source/js/search-panel.js',
  '/css/search-panel.css': 'source/css/search-panel.css',
};

const hashCache = {};

function versionOf(file) {
  const st = fs.statSync(file);
  const key = file + ':' + st.mtimeMs + ':' + st.size;
  if (!hashCache[key]) {
    hashCache[key] = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 12);
  }
  return hashCache[key];
}

hexo.extend.filter.register('after_render:html', function (str) {
  let out = str;
  Object.keys(ASSETS).forEach(function (url) {
    const file = path.join(hexo.theme_dir, ASSETS[url]);
    if (!fs.existsSync(file)) return;
    const re = new RegExp('(["\'])' + url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\1', 'g');
    out = out.replace(re, '$1' + url + '?v=' + versionOf(file) + '$1');
  });
  return out;
});
