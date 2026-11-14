import { h, confBadge, CONF } from '../ui.js';
import { SOURCES, KIND_LABEL } from '../data/sources.js';
import { RULES, COMBOS, SYSTEMS } from '../data/rules.js';
import { MISSIONS } from '../data/missions.js';
import { PASSPORT } from '../demo/passport.js';
import { WEIGHTS, POINTS } from '../engine/score.js';
import { AGENT_CAPS, AGENT_NEVER, agentMay } from '../engine/agent.js';

const OPS = { gte: '≥', lte: '≤', gt: '>', lt: '<' };
const KIND_ORDER = ['nasa', 'agency', 'clinical', 'assumption'];
const SYS_LABEL = Object.fromEntries(SYSTEMS.map((s) => [s.id, s.label]));
const UNIT = Object.fromEntries(PASSPORT.map((p) => [p.signal, p.unit]));

const srcTag = (id) => {
  const s = SOURCES[id];
  if (!s) return h('span', { class: 'src', text: String(id) });
  const attrs = { class: `src src-${s.kind}`, title: s.title };
  if (s.url) Object.assign(attrs, { href: s.url, rel: 'noopener', target: '_blank' });
  return h(s.url ? 'a' : 'span', attrs, s.short);
};

const table = (head, rows, cls = '') =>
  h('div', { class: 'so-wrap' }, h('table', { class: `so-table ${cls}` }, [
    h('thead', {}, h('tr', {}, head.map((t) => h('th', { text: t })))),
    h('tbody', {}, rows.map((r) => h('tr', {}, r.map((c) => h('td', {}, c))))),
  ]));

const section = (title, body, open = false) =>
  h('details', { class: 'so-sec', open }, [h('summary', { text: title }), h('div', { class: 'so-body' }, body)]);

// Onboard agent: what it may do at each distance, and what it never does (design assumption).
function agentSection() {
  const yes = (on) => h('span', { class: on ? 'ag-yes' : 'ag-no', text: on ? '✓' : '–' });
  const head = ['Action', ...['iss', 'moon', 'mars-transit'].map((id) => MISSIONS.find((m) => m.id === id).label)];
  const rows = Object.entries(AGENT_CAPS).map(([id, c]) => [c.label, ...['iss', 'moon', 'mars-transit'].map((mid) => yes(agentMay(MISSIONS.find((m) => m.id === mid)).includes(id)))]);
  return [
    table(head, rows),
    h('div', { class: 'ag-never' }, [h('b', { text: 'Never, at any distance: ' }), h('span', { text: AGENT_NEVER.join(' · ') })]),
    h('p', { class: 'so-note', text: 'Rules decide every status and who acts. The agent does non-clinical steps; clinical steps wait for a person to approve. AI writes only the handover note and the answers to three fixed questions. Design assumption, simulated.' }),
  ];
}

function threshold(r) {
  const sym = OPS[r.op];
  if (r.display) return r.display;
  const num = String(r.value).replace('-', '−');
  let t;
  if (r.kind === 'delta') t = `${sym} ${num} ${UNIT[r.signal] || ''} vs personal norm`;
  else if (r.kind === 'pct') t = `${sym} ${num} % vs personal norm`;
  else t = `${sym} ${num} ${UNIT[r.signal] || ''}`;
  if (r.window > 1) t += `, ${r.window}-day mean`;
  return t.replace(/\s+/g, ' ').trim();
}

function topBand() {
  const layers = [
    ['Rules decide', 'status, tier'],
    ['Forecast warns', 'trend to threshold'],
    ['AI advisor explains', 'never changes the verdict'],
  ];
  const strip = h('div', { class: 'so-layers' });
  layers.forEach(([a, b], i) => {
    if (i) strip.append(h('span', { class: 'so-arrow', 'aria-hidden': 'true', text: '→' }));
    strip.append(h('div', { class: 'so-layer' }, [h('b', { text: a }), h('span', { text: b })]));
  });
  const legend = h('div', { class: 'so-legend' }, ['established', 'hypothesis', 'ask'].map((c) =>
    h('div', { class: 'so-leg' }, [confBadge(c), h('span', { text: CONF[c].label })])));
  return [
    h('div', { class: 'so-banner', text: 'Not a medical device · Synthetic data · Educational prototype' }),
    h('p', { class: 'so-tag', text: 'AI advises, rules decide.' }),
    strip,
    legend,
  ];
}

function rulesSection() {
  const rows = RULES.map((r) => [
    SYS_LABEL[r.system] || r.system,
    r.title,
    h('span', { class: `dot d-${r.level}`, title: r.level }),
    threshold(r),
    srcTag(r.source),
    srcTag(r.context),
  ]);
  for (const c of COMBOS) {
    rows.push([
      c.systems.map((s) => SYS_LABEL[s] || s).join(' + '),
      c.title,
      h('span', { class: 'dot d-yellow', title: 'linked signals' }),
      `${c.min} of ${c.systems.length} systems yellow together`,
      srcTag(c.source),
      srcTag(c.context),
    ]);
  }
  return [
    h('p', { class: 'so-count', text: `${RULES.length + COMBOS.length} rules · every rule has a source` }),
    table(['System', 'Rule', 'Level', 'Threshold', 'Source', 'Why in space'], rows),
  ];
}

function escalationSection() {
  // Same matrix as js/engine/escalation.js, written out for flight surgeons and judges.
  const ms = MISSIONS;
  const cell = {
    iss: { y: 'Flight surgeon (reply in seconds)', r: 'Crew medic + flight surgeon live', l: 'Flight surgeon (reply in seconds)' },
    moon: { y: 'Decide together: crew medic acts, flight surgeon live', r: 'Crew medic + flight surgeon live, return option ~3 days', l: 'Decide together' },
    'mars-transit': { y: 'Handle it yourself + report (reply ≥ 40 min)', r: 'Crew medic, act on board', l: 'Crew medic' },
    mars: { y: 'Handle it yourself + report (reply ≥ 40 min); home only at a launch window', r: 'Crew medic, act on board', l: 'Crew medic' },
  };
  const rows = [
    ['Green', ...ms.map(() => 'No action')],
    ['Yellow', ...ms.map((m) => cell[m.id].y)],
    ['Red', ...ms.map((m) => cell[m.id].r)],
    ['Linked signals or failed countermeasure', ...ms.map((m) => cell[m.id].l)],
    ['Delay source', ...ms.map((m) => srcTag(m.delaySource))],
    ['Time home source', ...ms.map((m) => srcTag(m.careSource))],
  ];
  return [table(['Status', ...ms.map((m) => m.label)], rows, 'so-matrix')];
}

function passportSection() {
  const rows = PASSPORT.map((p) => [p.label, p.unit, p.baseline, p.noise, p.drift, p.events, p.basis, srcTag(p.source)]);
  return [
    h('p', { text: 'Synthetic data. Shapes follow NASA HRP findings; magnitudes marked as assumptions are illustrative. Open generator, fixed seed 20261114.' }),
    table(['Signal', 'Unit', 'Baseline', 'Noise', 'Drift', 'Events', 'Basis', 'Source'], rows),
  ];
}

function indexSection() {
  const wrows = Object.entries(WEIGHTS).map(([k, w]) => [SYS_LABEL[k] || k, String(w)]);
  const prows = Object.entries(POINTS).map(([k, p]) => [k[0].toUpperCase() + k.slice(1), String(p)]);
  return [
    h('p', { class: 'so-formula', text: 'Index = 100 × Σ(weight × points) / Σ(weights)' }),
    h('p', { class: 'muted', text: 'Only systems with data count. Crew index: mean of members, capped at lowest member + 20.' }),
    h('div', { class: 'so-two' }, [table(['System', 'Weight'], wrows), table(['Status', 'Points'], prows)]),
    h('p', {}, ['Basis: ', srcTag('demo-assumption')]),
  ];
}

function allSources() {
  return KIND_ORDER.map((k) => {
    const items = Object.entries(SOURCES).filter(([, s]) => s.kind === k);
    return h('div', { class: 'so-group' }, [
      h('h3', { text: KIND_LABEL[k] }),
      k === 'nasa' ? h('p', { class: 'muted', text: 'Challenge Resources tab' }) : null,
      h('ul', { class: 'so-list' }, items.map(([, s]) => h('li', {}, [
        s.url ? h('a', { href: s.url, rel: 'noopener', target: '_blank', text: s.title }) : h('span', { text: s.title }),
      ]))),
    ]);
  });
}

function realSection() {
  const items = [
    'Synthetic crew of 4 over 180 days.',
    'Simulated suit stream, modelled on CSA Bio-Monitor.',
    'Simulated downlink: nothing leaves the browser.',
    'AI advisor answers are precomputed with Claude and marked "AI-generated (Claude), precomputed".',
    'In this demo the advisor would run on a cloud model; on a mission it would run on board.',
  ];
  return [h('ul', { class: 'so-list' }, items.map((t) => h('li', { text: t })))];
}

function licences() {
  return [h('ul', { class: 'so-list' }, [
    h('li', {}, ['CrewCheck code: ', h('a', { href: 'LICENSE', target: '_blank', rel: 'noopener', text: 'Apache License 2.0' })]),
    h('li', {}, ['Chart.js 4.4.7: ', h('a', { href: 'vendor/chart.js.LICENSE.md', target: '_blank', rel: 'noopener', text: 'MIT' })]),
    h('li', { text: 'No AI-generated images; the figure and icons are hand-made SVG.' }),
    h('li', { text: 'No agency logos.' }),
  ])];
}

export default function render(root) {
  root.append(h('div', { class: 'so' }, [
    h('h1', { class: 'so-title', text: 'Sources' }),
    section('Overview', topBand(), true),
    section('Rules', rulesSection()),
    section('Escalation by distance', escalationSection()),
    section('What the onboard agent can and cannot do', agentSection()),
    section('Synthetic data passport', passportSection()),
    section('CrewCheck Index', indexSection()),
    section('All sources', allSources()),
    section('What is real and what is simulated', realSection()),
    section('Licences', licences()),
  ]));
}
