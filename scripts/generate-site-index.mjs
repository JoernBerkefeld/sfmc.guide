/**
 * Builds a lightweight Lunr-compatible site-index.json from Markdown pages.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(__dirname, '..');

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith('.') || ent.name === '_site' || ent.name === 'node_modules') continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, out);
    else if (ent.name.endsWith('.md')) out.push(full);
  }
  return out;
}

function parseFm(raw) {
  if (!raw.startsWith('---')) return {};
  const end = raw.indexOf('\n---', 3);
  if (end < 0) return {};
  const block = raw.slice(3, end).trim();
  const data = {};
  for (const line of block.split(/\n/)) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    data[m[1]] = v;
  }
  return data;
}

const files = walk(SITE).filter((f) => !f.includes(`${path.sep}scripts${path.sep}`));
const index = [];

for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const fm = parseFm(raw);
  if (!fm.title || fm.sitemap === 'false') continue;
  let url = fm.permalink;
  if (!url) {
    const rel = path.relative(SITE, file).replace(/\\/g, '/');
    url = '/' + rel.replace(/index\.md$/, '').replace(/\.md$/, '/');
    if (!url.endsWith('/')) url += '/';
  }
  if (!url.endsWith('/') && !url.includes('.')) url += '/';

  const section = fm.parent || url.split('/').filter(Boolean)[0] || 'Home';
  index.push({
    name: fm.title.replace(/^"|"$/g, ''),
    url,
    section: String(section).replace(/^"|"$/g, ''),
    type: 'page',
    description: (fm.description || '').replace(/^"|"$/g, ''),
  });
}

index.sort((a, b) => a.name.localeCompare(b.name));
const out = path.join(SITE, 'site-index.json');
fs.writeFileSync(out, JSON.stringify(index, null, 2) + '\n', 'utf8');
console.log(`wrote site-index.json (${index.length} entries)`);
