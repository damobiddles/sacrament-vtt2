// Colour-contrast checking for buttons and text, shared by the contrast test (e2e/contrast.spec.mjs) and the one-off audit script.
// Two checks are made on a screen:
//   1. axe-core's "color-contrast" rule on all text (the standard automated check).
//   2. A button check of our own, because axe cannot judge a button's hover or pressed look, a button over a picture, or a button's edge:
//      every button-like thing (buttons, chips, links styled as buttons, form fields, folds) in every state (normal, hover, pressed, keyboard focus,
//      selected, disabled) must have label text at 4.5:1 or better against what is really behind it, and a control whose outline is its only
//      sign (no label inside, or no fill) must have that outline at 3:1 or better against its surroundings.
// What is behind a button is worked out from the page's own colours when they are plain; when a picture or gradient is behind it, the page is
// photographed with the label hidden and the real pixels are measured instead.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const AXE_SOURCE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

/** Run one step with a time limit: if it takes longer, fail at once and say which step was stuck (instead of waiting for the whole test to time out). */
export function bounded(promise, ms, what) {
  let timer;
  const limit = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`STUCK for ${ms / 1000}s: ${what}`)), ms); });
  return Promise.race([promise, limit]).finally(() => clearTimeout(timer));
}
export const STEP_MS = 15000;   // no single measuring step may take longer than this

export const TEXT_MIN = 4.5;   // WCAG AA, text
export const EDGE_MIN = 3;     // WCAG AA, non-text (outlines, icons)
export const DISABLED_MIN = 3; // disabled controls are exempt from WCAG, but should still be legible: a softer limit

const CANDIDATES = [
  'button', '[role=button]', '[role=tab]', 'a.btn', '.btn', '.chip', 'summary', 'select', 'textarea', '.stat',
  'input:not([type=hidden]):not([type=file])', '.sac-links a', '.sac-th', '.nav-btn',
].join(',');

/** Stop animation so colours are not caught mid-fade. (The site has one theme, the dark one, so there is no theme to switch.) */
export async function setTheme(page) { await applyTheme(page); }
export async function applyTheme(page) {
  await page.evaluate(() => {
    if (!document.getElementById('ct-still')) {
      const s = document.createElement('style'); s.id = 'ct-still';
      s.textContent = '*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important}' +
        '[data-ct-hide],[data-ct-hide] *{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important}';
      document.head.appendChild(s);
    }
  });
}

/** axe-core's colour-contrast rule on the whole screen. Returns [{ where, text, ratio, needed, colours }]. */
export async function axeContrast(page) {
  await bounded(page.evaluate(AXE_SOURCE), STEP_MS, 'loading the axe checker');
  const res = await bounded(page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    const r = await axe.run(document, { runOnly: { type: 'rule', values: ['color-contrast'] }, resultTypes: ['violations'] });
    return r.violations.flatMap((v) => v.nodes.map((n) => {
      const d = (n.any[0] && n.any[0].data) || {};
      return { where: n.target.join(' '), text: (n.html || '').replace(/\s+/g, ' ').slice(0, 90), ratio: d.contrastRatio, needed: d.expectedContrastRatio, fg: d.fgColor, bg: d.bgColor };
    }));
  }), 30000, 'axe colour-contrast scan of the whole page');
  return res;
}

/* ---------- the in-page measuring code (kept as one string so it can be sent to the page once) ---------- */
const MEASURE = `(() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1; const cx = cv.getContext('2d', { willReadFrequently: true });
  const rgba = (css) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = css; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const over = (top, under) => { const a = top[3]; return [top[0] * a + under[0] * (1 - a), top[1] * a + under[1] * (1 - a), top[2] * a + under[2] * (1 - a), 1]; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const within = (root, n) => root === n || root.contains(n);
  const hasPicture = (n) => { const cs = getComputedStyle(n); return /^(IMG|VIDEO|CANVAS|SVG|PICTURE)$/i.test(n.tagName) || (cs.backgroundImage && cs.backgroundImage !== 'none'); };
  const points = (r) => [[0.5, 0.5], [0.2, 0.5], [0.8, 0.5], [0.5, 0.2], [0.5, 0.8]].map((p) => [r.left + r.width * p[0], r.top + r.height * p[1]]);

  /* what is behind the element (not counting the element itself): { rgb } when plain colours, { picture: true } when an image or gradient is behind it */
  function behind(el, skipOwn) {
    const r = el.getBoundingClientRect(); let worst = null; let picture = false; const results = [];
    for (const [x, y] of points(r)) {
      if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
      const stack = document.elementsFromPoint(x, y); let i = stack.findIndex((n) => within(el, n)); if (i < 0) i = -1;
      const layers = [];
      for (let k = i + 1; k < stack.length; k++) {
        const n = stack[k], cs = getComputedStyle(n);
        if (hasPicture(n)) { picture = true; break; }
        const bg = rgba(cs.backgroundColor); if (bg[3] > 0) { layers.push([bg, parseFloat(cs.opacity)]); if (bg[3] > 0.99) break; }
      }
      let c = [255, 255, 255, 1];
      for (let k = layers.length - 1; k >= 0; k--) { const l = layers[k]; c = over([l[0][0], l[0][1], l[0][2], l[0][3] * l[1]], c); }
      results.push(c);
    }
    return { rgb: results[0] || [255, 255, 255, 1], all: results, picture };
  }
  function ownFill(el) { const cs = getComputedStyle(el); const bg = rgba(cs.backgroundColor); const img = cs.backgroundImage && cs.backgroundImage !== 'none'; return { bg, img }; }
  function opacityOf(el) { let o = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity); return o; }

  window.__ct = {
    rgba, over, ratio, lum,
    /* the visible button-like things; with a limit, a few of each look are kept (a screen can hold hundreds of identical buttons) */
    candidates: (sel, perLook) => {
      const seen = new Map();
      return [...document.querySelectorAll(sel)].filter((e) => {
        const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false;
        const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none') return false;
        const ov = document.querySelector('.sheet-overlay:not([hidden])'); if (ov && !ov.contains(e)) return false;   /* what a full-screen window covers cannot be seen, and its pixels would be measured as the window's */
        if (!perLook) return true;
        const key = [e.tagName, e.getAttribute('class'), e.type, !!e.disabled, e.getAttribute('aria-pressed'), e.getAttribute('aria-selected'), e.getAttribute('aria-expanded'), e.getAttribute('aria-current'), cs.color, cs.backgroundColor, cs.borderTopColor, cs.opacity].join('|');
        const n = seen.get(key) || 0; seen.set(key, n + 1); return n < perLook;
      });
    },
    /* everything the page itself can tell about one element in its current state */
    measure(el) {
      const cs = getComputedStyle(el), r = el.getBoundingClientRect();
      const own = ownFill(el), back = behind(el);
      const op = opacityOf(el);
      const text = rgba(cs.color); text[3] *= op;
      const label = (el.value && /^(INPUT)$/.test(el.tagName) && /button|submit/.test(el.type)) ? el.value : (el.innerText || el.textContent || '').trim();
      const bw = parseFloat(cs.borderTopWidth) || 0, border = bw > 0 && cs.borderTopStyle !== 'none' ? rgba(cs.borderTopColor) : null;
      const isField = /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) && !/button|submit|checkbox|radio/.test(el.type || '');
      const disabled = el.disabled || el.getAttribute('aria-disabled') === 'true';
      return {
        label: label.slice(0, 40), tag: el.tagName.toLowerCase(), cls: (el.getAttribute('class') || '').slice(0, 40), id: el.id || '',
        rect: { x: r.left, y: r.top, w: r.width, h: r.height },
        text, fill: own.bg, fillImage: own.img, behind: back.rgb, behindAll: back.all, picture: back.picture || own.img,
        border, hasBorder: !!border && border[3] > 0, isField, disabled, hasLabel: label.length > 0 || isField,
        selected: el.getAttribute('aria-pressed') === 'true' || el.getAttribute('aria-selected') === 'true' || el.getAttribute('aria-current') === 'page' || /(^| )(on|sel|active|selected)( |$)/.test(el.getAttribute('class') || ''),
      };
    },
  };
  return true;
})()`;

/** a short, human-readable name for an element, for the report */
function nameOf(m) {
  return (m.tag + (m.id ? '#' + m.id : '') + (m.cls ? '.' + m.cls.trim().split(/\s+/).join('.') : '') + (m.label ? ' "' + m.label.replace(/\s+/g, ' ') + '"' : '')).slice(0, 90);
}

/** every button-like thing on the screen, in every state. Returns a list of problems: [{ el, page, kind, state, ratio, needed, rect }] */
export async function buttonContrast(page, { states = ['normal', 'hover', 'active', 'focus'], maxElements = 400, perLook = 0 } = {}) {
  let doing = 'starting';                                   // what the loop is up to, for the "stuck" message
  const B = (p) => bounded(p, STEP_MS, doing);
  await B(page.evaluate(MEASURE));
  const client = await B(page.context().newCDPSession(page));
  doing = 'switching on the browser inspector'; await B(client.send('DOM.enable')); await B(client.send('CSS.enable')); await B(client.send('DOM.getDocument', { depth: 0 }));
  doing = 'listing the buttons on the screen';
  const count = await B(page.evaluate(({ sel, perLook }) => { const els = window.__ct.candidates(sel, perLook); els.forEach((e, i) => e.setAttribute('data-ct', String(i))); return els.length; }, { sel: CANDIDATES, perLook }));
  const problems = [];
  const n = Math.min(count, maxElements);
  for (let i = 0; i < n; i++) {
    const sel = `[data-ct="${i}"]`;
    doing = `button ${i} of ${n}: looking it up`;
    const exists = await B(page.evaluate((s) => !!document.querySelector(s), sel));
    if (!exists) continue;
    doing = `button ${i} of ${n}: scrolling to it`;
    await B(page.evaluate((s) => document.querySelector(s).scrollIntoView({ block: 'center', inline: 'center' }), sel)).catch((e) => { if (/STUCK/.test(e.message)) throw e; });
    const { result } = await B(client.send('Runtime.evaluate', { expression: `document.querySelector('${sel}')` }));
    if (!result.objectId) continue;
    let nodeId;
    doing = `button ${i} of ${n}: finding it in the inspector`;
    try { ({ nodeId } = await B(client.send('DOM.requestNode', { objectId: result.objectId }))); } catch (e) { if (/STUCK/.test(e.message)) throw e; nodeId = 0; }
    if (!nodeId) continue;
    for (const state of states) {
      const forced = state === 'hover' ? ['hover'] : state === 'active' ? ['hover', 'active'] : state === 'focus' ? ['focus', 'focus-visible'] : [];
      const force = (list) => B(client.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: list })).catch((e) => { if (/STUCK/.test(e.message)) throw e; });   // the table redraws itself, so the element may be gone
      doing = `button ${i} of ${n}, state ${state}: forcing the state`;
      if (forced.length) await force(forced);
      doing = `button ${i} of ${n}, state ${state}: measuring`;
      const m = await B(page.evaluate((s) => {
        const el = document.querySelector(s); if (!el) return null;
        const m = window.__ct.measure(el);
        return m;
      }, sel));
      if (forced.length) await force([]);
      if (!m) continue;
      let pixels = null;
      if (m.picture) { doing = `button ${i} of ${n}, state ${state}: photographing what is behind it`; pixels = await B(samplePixels(page, sel, m)); }
      doing = `button ${i} of ${n}, state ${state}: judging`;
      const rec = await B(page.evaluate(({ m, pixels, TEXT_MIN, EDGE_MIN, DISABLED_MIN, state }) => {
        const C = window.__ct, res = [];
        const behindList = pixels && pixels.length ? pixels : m.behindAll && m.behindAll.length ? m.behindAll : [m.behind];
        const fillOver = (under) => (m.fill[3] > 0 ? C.over(m.fill, under) : under);
        // the colour the label sits on is this control's own fill laid over whatever is behind it
        const grounds = behindList.map((b) => fillOver(b));
        const textOver = (g) => C.over(m.text, g);
        if (m.label) {
          let worst = Infinity; grounds.forEach((g) => { worst = Math.min(worst, C.ratio(textOver(g), g)); });
          const need = m.disabled ? DISABLED_MIN : TEXT_MIN;
          if (worst < need) res.push({ kind: 'text', state, ratio: +worst.toFixed(2), needed: need });
        }
        // outline: a bordered control, or a field, must show its edge at 3:1 against what surrounds it (a solid, labelled button is identified by its label)
        const solidLabelled = m.fill[3] > 0.9 && !m.isField && !!m.label;
        if ((m.hasBorder || m.isField) && !solidLabelled && !m.disabled) {
          let worstEdge = Infinity;
          behindList.forEach((b) => {
            const g = fillOver(b);
            const edgeColour = m.hasBorder ? C.over(m.border, g) : (m.fill[3] > 0 ? g : null);
            if (edgeColour) worstEdge = Math.min(worstEdge, C.ratio(edgeColour, b));
          });
          if (worstEdge < EDGE_MIN) res.push({ kind: 'edge', state, ratio: +worstEdge.toFixed(2), needed: EDGE_MIN });
        }
        return res;
      }, { m, pixels, TEXT_MIN, EDGE_MIN, DISABLED_MIN, state }));
      for (const p of rec) problems.push({ el: nameOf(m), disabled: m.disabled, selected: m.selected, rect: m.rect, sel, ...p });
    }
  }
  await client.detach().catch(() => {});
  doing = 'cleaning up'; await B(page.evaluate(() => document.querySelectorAll('[data-ct]').forEach((e) => e.removeAttribute('data-ct'))));
  return problems;
}

/** The real colours behind an element's label, found by photographing it with the label hidden (used only where a picture is behind). */
async function samplePixels(page, sel, m) {
  await page.evaluate((s) => document.querySelector(s).setAttribute('data-ct-hide', ''), sel);
  const r = m.rect, pad = 0;
  const clip = { x: Math.max(0, r.x + pad), y: Math.max(0, r.y + pad), width: Math.max(2, Math.min(r.w, 1366)), height: Math.max(2, Math.min(r.h, 800)) };
  let buf = null;
  try { buf = await page.screenshot({ clip, animations: 'disabled' }); } catch { /* off screen */ }
  await page.evaluate((s) => document.querySelector(s).removeAttribute('data-ct-hide'), sel);
  if (!buf) return null;
  // the 10th to 90th percentile of what is behind the label: the busiest parts of a picture count, a single stray pixel does not
  return page.evaluate(async (b64) => {
    const blob = await (await fetch('data:image/png;base64,' + b64)).blob(); const bmp = await createImageBitmap(blob);
    const cv = document.createElement('canvas'); cv.width = bmp.width; cv.height = bmp.height; const cx = cv.getContext('2d'); cx.drawImage(bmp, 0, 0);
    const inset = Math.min(4, Math.floor(Math.min(bmp.width, bmp.height) / 4)); const d = cx.getImageData(inset, inset, Math.max(1, bmp.width - 2 * inset), Math.max(1, bmp.height - 2 * inset)).data;
    const L = (c) => { const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
    const px = []; for (let i = 0; i < d.length; i += 16) px.push([d[i], d[i + 1], d[i + 2], 1]);
    px.sort((a, b) => L(a) - L(b));
    const pick = (q) => px[Math.min(px.length - 1, Math.floor(px.length * q))];
    return [pick(0.1), pick(0.5), pick(0.9)];
  }, buf.toString('base64'));
}

/** run both checks on the current screen; returns { axe: [...], buttons: [...] } */
export async function checkScreen(page, theme, opts) {
  await applyTheme(page, theme);
  await page.waitForTimeout(80);
  const axe = await axeContrast(page);
  const buttons = await buttonContrast(page, opts);
  return { axe, buttons };
}

