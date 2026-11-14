import { h } from '../ui.js';
import { state, person, recordsOf, verdictFor } from '../state.js';
import { RULES } from '../data/rules.js';
import { baselineOf, measure } from '../engine/evaluate.js';
import { forecast } from '../engine/forecast.js';

const SIGNALS = [
  { id: 'bp', label: 'Blood pressure', keys: ['sbp', 'dbp'], unit: 'mmHg' },
  { id: 'hr', label: 'Pulse', keys: ['hr'], unit: 'bpm' },
  { id: 'spo2', label: 'SpO2', keys: ['spo2'], unit: '%' },
  { id: 'sleepH', label: 'Sleep', keys: ['sleepH'], unit: 'h' },
  { id: 'mood', label: 'Mood', keys: ['mood'], unit: '/5' },
  { id: 'exerciseMin', label: 'Exercise', keys: ['exerciseMin'], unit: 'min' },
  { id: 'glucose', label: 'Glucose', keys: ['glucose'], unit: 'mg/dL' },
  { id: 'mass', label: 'Mass', keys: ['mass'], unit: 'kg' },
];
const NAMES = { sbp: 'Systolic', dbp: 'Diastolic', hr: 'Pulse', spo2: 'SpO2', sleepH: 'Sleep', mood: 'Mood', exerciseMin: 'Exercise', glucose: 'Glucose', mass: 'Mass' };
const KEY_COLOR = { sbp: 'blue', dbp: 'violet' };
const RISING = new Set(['gte', 'gt']);

let chosen = 'bp';
let chart = null;
let loader = null;

function loadChart() {
  if (window.Chart) return Promise.resolve(window.Chart);
  loader ||= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = new URL('vendor/chart.umd.js', document.baseURI).href;
    s.onload = () => resolve(window.Chart);
    s.onerror = () => { loader = null; reject(new Error('Chart.js failed to load')); };
    document.head.append(s);
  });
  return loader;
}

const css = (name, fallback) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
function alpha(hex, a) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
const fmt = (v) => String(Number(v.toFixed(1)));
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function absThreshold(rule, base) {
  const b = base[rule.signal];
  if (rule.kind === 'abs') return rule.value;
  if (b == null) return null;
  return rule.kind === 'delta' ? b + rule.value : b * (1 + rule.value / 100);
}

function coneRule(key) {
  const ys = RULES.filter((r) => r.signal === key && r.level === 'yellow' && r.kind === 'abs');
  return ys.length ? ys : [{ signal: key, level: 'yellow', kind: 'abs', window: 1, op: 'gte', value: Infinity }];
}

function analyse(records, day, sig, base) {
  const out = { forecasts: {}, headline: null };
  let firing = null;
  let soon = null;
  for (const key of sig.keys) {
    let best = null;
    for (const r of coneRule(key)) {
      const f = forecast(records, day, r);
      if (!f) continue;
      if (f.crossDay !== null && (!best || f.crossDay < best.f.crossDay)) best = { f, r };
      else if (!best) best = { f, r, quiet: true };
      if (f.crossDay !== null && (!soon || f.daysToCross < soon.days)) soon = { key, rule: r, days: f.daysToCross };
    }
    if (best) out.forecasts[key] = best.f;
    for (const r of RULES.filter((x) => x.signal === key && (x.level === 'yellow' || x.level === 'red'))) {
      const v = measure(r, records, day, base);
      if (v === null) continue;
      const hit = { gte: v >= r.value, gt: v > r.value, lte: v <= r.value, lt: v < r.value }[r.op];
      if (hit && (!firing || r.level === 'red')) firing = r;
    }
  }
  if (firing) out.headline = { cls: firing.level, text: RISING.has(firing.op) ? 'Above threshold now' : 'Below threshold now' };
  else if (soon) {
    const verb = RISING.has(soon.rule.op) ? 'reaches' : 'falls to';
    out.headline = { cls: 'yellow', text: `${NAMES[soon.key]} ${verb} ${fmt(soon.rule.value)} in ~${soon.days} ${soon.days === 1 ? 'day' : 'days'}` };
  } else out.headline = { cls: 'green', text: 'Within personal norm' };
  return out;
}

function sparkline(records, day, key, color) {
  const NS = 'http://www.w3.org/2000/svg';
  const pts = records.filter((r) => r.day <= day && r.day > day - 30);
  const vals = pts.map((r) => num(r[key])).filter((v) => v !== null);
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 28');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('class', 'tr-spark-svg');
  if (vals.length < 2) return svg;
  const lo = Math.min(...vals), hi = Math.max(...vals), span = hi - lo || 1;
  let d = '';
  let pen = false;
  pts.forEach((r, i) => {
    const v = num(r[key]);
    if (v === null) { pen = false; return; }
    d += `${pen ? 'L' : 'M'}${((i / 29) * 100).toFixed(1)} ${(26 - ((v - lo) / span) * 24).toFixed(1)}`;
    pen = true;
  });
  const p = document.createElementNS(NS, 'path');
  p.setAttribute('d', d);
  p.setAttribute('fill', 'none');
  p.setAttribute('stroke', color);
  p.setAttribute('stroke-width', '1.5');
  p.setAttribute('vector-effect', 'non-scaling-stroke');
  svg.append(p);
  return svg;
}

function draw(canvas, records, day, sig, base, info, colors) {
  const Chart = window.Chart;
  const d0 = Math.max(1, day - 60);
  const d1 = Math.min(180, day + 30);
  const shown = records.filter((r) => r.day >= d0 && r.day <= day);
  const palette = { blue: colors.blue, violet: colors.violet };
  const series = sig.keys.map((key, i) => {
    const color = palette[KEY_COLOR[key]] || colors.blue;
    const early = records.filter((r) => r.day <= 14).map((r) => num(r[key])).filter((v) => v !== null);
    const mean = early.length ? early.reduce((s, v) => s + v, 0) / early.length : null;
    const sd = early.length > 1 ? Math.sqrt(early.reduce((s, v) => s + (v - mean) ** 2, 0) / (early.length - 1)) : 0;
    return { key, color, band: mean === null ? null : [mean - sd, mean + sd], cone: info.forecasts[key]?.cone.filter((c) => c.day <= d1) || [], i };
  });
  const hasAbs = (key) => RULES.some((r) => r.signal === key && r.kind === 'abs');
  const rules = RULES.filter((r) => sig.keys.includes(r.signal) && (r.level === 'yellow' || r.level === 'red')
    && (r.kind === 'abs' || !hasAbs(r.signal)) && (r.signal === sig.keys[0] || (r.level === 'yellow' && r.kind === 'abs')))
    .map((r) => ({ r, zone: r.signal === sig.keys[0], y: absThreshold(r, base) })).filter((t) => t.y !== null && Number.isFinite(t.y));

  const data = [];
  for (const s of series) {
    for (const r of shown) { const v = num(r[s.key]); if (v !== null) data.push(v); }
    for (const c of s.cone) data.push(c.lo, c.hi);
    if (s.band) data.push(...s.band);
  }
  let lo = Math.min(...data), hi = Math.max(...data);
  const span0 = hi - lo || 1;
  for (const t of rules) if (t.r.level === 'yellow' || (t.y > lo - span0 * 0.25 && t.y < hi + span0 * 0.25)) {
    if (t.y > lo - span0 * 1.5 && t.y < hi + span0 * 1.5) { lo = Math.min(lo, t.y); hi = Math.max(hi, t.y); }
  }
  const pad = (hi - lo || 1) * 0.08;
  const step = (hi - lo) > 40 ? 10 : (hi - lo) > 8 ? 2 : 0.5;
  const yMin = Math.floor((lo - pad) / step) * step, yMax = Math.ceil((hi + pad) / step) * step;

  const overlay = {
    id: 'trOverlay',
    beforeDatasetsDraw(c) {
      const { ctx, chartArea: a, scales: { x, y } } = c;
      ctx.save();
      ctx.beginPath(); ctx.rect(a.left, a.top, a.width, a.height); ctx.clip();
      const px = (v) => y.getPixelForValue(v);
      for (const s of series) if (s.band) {
        ctx.fillStyle = alpha(s.color, 0.12);
        ctx.fillRect(a.left, px(s.band[1]), a.width, px(s.band[0]) - px(s.band[1]));
      }
      const zones = [...rules].sort((p, q) => (p.r.level === 'yellow' ? -1 : 1) - (q.r.level === 'yellow' ? -1 : 1));
      for (const t of zones) {
        const col = t.r.level === 'red' ? colors.red : colors.yellow;
        const ty = px(t.y);
        ctx.fillStyle = alpha(col, 0.08);
        if (!t.zone) { /* line only */ }
        else if (RISING.has(t.r.op)) ctx.fillRect(a.left, a.top, a.width, ty - a.top);
        else ctx.fillRect(a.left, ty, a.width, a.bottom - ty);
        ctx.strokeStyle = alpha(col, 0.8);
        ctx.setLineDash([6, 4]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(a.left, ty); ctx.lineTo(a.right, ty); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = col; ctx.font = '11px system-ui,sans-serif'; ctx.textAlign = 'right';
        ctx.fillText(fmt(t.y), a.right - 4, RISING.has(t.r.op) ? ty + 12 : ty - 4);
      }
      for (const s of series) if (s.cone.length) {
        ctx.fillStyle = alpha(s.color, 0.18);
        ctx.beginPath();
        s.cone.forEach((p, i) => (i ? ctx.lineTo(x.getPixelForValue(p.day), px(p.hi)) : ctx.moveTo(x.getPixelForValue(p.day), px(p.hi))));
        for (let i = s.cone.length - 1; i >= 0; i--) ctx.lineTo(x.getPixelForValue(s.cone[i].day), px(s.cone[i].lo));
        ctx.closePath(); ctx.fill();
      }
      const dx = x.getPixelForValue(day);
      ctx.strokeStyle = colors.text; ctx.globalAlpha = 0.6; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(dx, a.top); ctx.lineTo(dx, a.bottom); ctx.stroke();
      ctx.restore();
    },
  };

  const datasets = [];
  for (const s of series) {
    datasets.push({
      label: NAMES[s.key], data: shown.map((r) => ({ x: r.day, y: num(r[s.key]) })),
      borderColor: s.color, backgroundColor: s.color, borderWidth: 2, pointRadius: 0, pointHoverRadius: 4, tension: 0.2, spanGaps: false,
    });
    if (s.cone.length) {
      datasets.push({
        label: `${NAMES[s.key]} forecast`, data: [{ x: day, y: num(records.find((r) => r.day === day)?.[s.key]) }, ...s.cone.map((c) => ({ x: c.day, y: c.mid }))],
        borderColor: s.color, borderDash: [6, 4], borderWidth: 2, pointRadius: 0, pointHoverRadius: 0, spanGaps: false,
      });
    }
  }

  chart?.destroy();
  chart = new Chart(canvas, {
    type: 'line',
    data: { datasets },
    plugins: [overlay],
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      interaction: { mode: 'nearest', axis: 'x', intersect: false },
      scales: {
        x: { type: 'linear', min: d0, max: d1, ticks: { color: colors.muted, maxTicksLimit: 8, precision: 0 }, grid: { color: alpha(colors.line, 0.5) }, border: { color: colors.line } },
        y: { min: yMin, max: yMax, ticks: { color: colors.muted, maxTicksLimit: 6, callback: (v) => fmt(v) }, grid: { color: alpha(colors.line, 0.5) }, border: { color: colors.line } },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { title: (items) => `Day ${items[0].parsed.x}`, label: (c) => `${c.dataset.label}: ${fmt(c.parsed.y)} ${sig.unit}` },
          filter: (item) => item.parsed.y !== null,
        },
      },
    },
  });
}

export default function render(root, { go } = {}) {
  chart?.destroy();
  chart = null;
  const day = state.day;
  const records = recordsOf(state.personId);
  const sig = SIGNALS.find((s) => s.id === chosen) || SIGNALS[0];
  const base = baselineOf(records);
  const info = analyse(records, day, sig, base);
  const ev = verdictFor(state.personId, day).ev;

  const canvas = h('canvas', { role: 'img', 'aria-label': `${sig.label} trend with forecast` });
  const pick = (id) => { chosen = id; root.replaceChildren(); render(root, { go }); };
  const status = (key) => ev.signals[key]?.status || 'grey';

  const chips = h('div', { class: 'tr-chips', role: 'tablist' }, SIGNALS.map((s) => h('button', {
    class: `tr-chip${s.id === sig.id ? ' on' : ''}`, role: 'tab', 'aria-selected': s.id === sig.id ? 'true' : 'false', text: s.label, onclick: () => pick(s.id),
  })));

  const sparks = h('div', { class: 'tr-sparks' }, SIGNALS.filter((s) => s.id !== sig.id).map((s) => {
    const key = s.keys[0];
    const today = num(records.find((r) => r.day === day)?.[key]);
    const st = s.keys.map(status).reduce((w, x) => (['grey', 'green', 'yellow', 'red'].indexOf(x) > ['grey', 'green', 'yellow', 'red'].indexOf(w) ? x : w), 'grey');
    const col = css(`--${st === 'grey' ? 'muted' : st}`, '#8a97b3');
    return h('button', { class: `tr-spark st-${st}`, onclick: () => pick(s.id), 'aria-label': `Show ${s.label}` }, [
      h('span', { class: 'tr-spark-name', text: s.label }),
      h('span', { class: 'tr-spark-val', text: today === null ? '–' : `${fmt(today)} ${s.unit}` }),
      sparkline(records, day, key, col),
    ]);
  }));

  root.append(h('section', { class: 'tr' }, [
    h('h2', { class: 'tr-title', text: `Trends · ${person().name} · Day ${day}` }),
    chips,
    h('div', { class: `tr-headline tr-${info.headline.cls}`, text: info.headline.text }),
    h('div', { class: 'tr-chart' }, canvas),
    h('div', { class: 'tr-legend' }, [
      h('span', { class: 'tr-key tr-k-norm', text: 'Personal norm' }),
      h('span', { class: 'tr-key tr-k-yellow', text: 'Watch' }),
      h('span', { class: 'tr-key tr-k-red', text: 'Act' }),
      h('span', { class: 'tr-key tr-k-cone', text: 'Forecast' }),
    ]),
    sparks,
  ]));

  const colors = {
    blue: css('--blue', '#60a5fa'), violet: '#c4b5fd', yellow: css('--yellow', '#fbbf24'), red: css('--red', '#f87171'),
    muted: css('--muted', '#8a97b3'), line: css('--line', '#1f2a40'), text: css('--text', '#e8eefc'),
  };
  loadChart().then(() => {
    if (!canvas.isConnected) return;
    draw(canvas, records, day, sig, base, info, colors);
  }).catch(() => {
    if (canvas.isConnected) canvas.replaceWith(h('p', { class: 'soon', text: 'Chart unavailable' }));
  });
}
