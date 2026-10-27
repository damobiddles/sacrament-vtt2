// Shared by the page builder (scripts/build-landing.mjs): a small Markdown reader and the front-matter parser.
import { readFileSync } from 'node:fs';

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const safeUrl = (u) => (/^(https?:|mailto:|\/|#|\.\.?\/)/.test(u) ? u : '#');

export function inline(t) {
  t = esc(t);
  t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, a, u) => '<img src="' + safeUrl(u) + '" alt="' + a + '" loading="lazy">');
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, a, u) => '<a href="' + safeUrl(u) + '">' + a + '</a>');
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>');
  return t;
}

export function markdown(src) {
  const out = [], lines = src.replace(/\r/g, '').split('\n');
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    let m;
    if ((m = /^(#{1,3})\s+(.*)$/.exec(l))) { const n = m[1].length + 1; out.push('<h' + n + '>' + inline(m[2]) + '</h' + n + '>'); i++; }
    else if (/^---+\s*$/.test(l)) { out.push('<hr>'); i++; }
    else if (/^>\s?/.test(l)) { const q = []; while (i < lines.length && /^>\s?/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, '')); out.push('<blockquote>' + inline(q.join(' ')) + '</blockquote>'); }
    else if (/^[-*]\s+/.test(l)) { const li = []; while (i < lines.length && /^[-*]\s+/.test(lines[i])) li.push('<li>' + inline(lines[i++].replace(/^[-*]\s+/, '')) + '</li>'); out.push('<ul>' + li.join('') + '</ul>'); }
    else if (/^\d+\.\s+/.test(l)) { const li = []; while (i < lines.length && /^\d+\.\s+/.test(lines[i])) li.push('<li>' + inline(lines[i++].replace(/^\d+\.\s+/, '')) + '</li>'); out.push('<ol>' + li.join('') + '</ol>'); }
    else if (/^!\[[^\]]*\]\([^)]+\)\s*$/.test(l)) { out.push('<figure>' + inline(l.trim()) + '</figure>'); i++; }
    else { const p = []; while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|[-*]\s|\d+\.\s|>|---)/.test(lines[i])) p.push(lines[i++]); out.push('<p>' + inline(p.join(' ')) + '</p>'); }
  }
  return out.join('\n');
}

export function parse(file, dir, { needDate = true } = {}) {
  const raw = readFileSync(new URL(file, dir), 'utf8');
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(raw.replace(/\r/g, ''));
  if (!m) throw new Error(file + ': missing front matter');
  const meta = {};
  m[1].split('\n').forEach((ln) => { const k = /^(\w+):\s*(.*)$/.exec(ln); if (k) meta[k[1]] = k[2].trim().replace(/^["']|["']$/g, ''); });
  if (!meta.title || (needDate && !/^\d{4}-\d{2}-\d{2}$/.test(meta.date || ''))) throw new Error(file + ': needs ' + (needDate ? 'title and date (YYYY-MM-DD)' : 'a title'));
  const slug = file.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '');
  return { ...meta, slug, body: m[2], html: markdown(m[2]) };
}

export const fmt = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

