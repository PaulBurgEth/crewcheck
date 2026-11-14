import { h, confBadge, STATUS_WORD } from '../ui.js';
import { EXPLAIN, SIGNAL_LABEL } from '../data/explain.js';
import { SYSTEMS, ACTIONS } from '../data/rules.js';
import { SOURCES, KIND_LABEL } from '../data/sources.js';
import { confidenceOf } from '../engine/escalation.js';

const srcTag = (id) => {
  const s = SOURCES[id];
  return h('span', { class: `src src-${s.kind}`, title: s.title }, s.short);
};

const fmt = (v) => (v == null ? '–' : Number.isInteger(v) ? String(v) : v.toFixed(1));

// Drawer opened from the body map. Text lives behind this button only.
export function renderWhy(container, { systemId, ev, onClose }) {
  const sys = SYSTEMS.find((s) => s.id === systemId);
  const ex = EXPLAIN[systemId];
  const st = ev.systems[systemId];
  const row = (icon, label, content) => h('div', { class: 'why-row' }, [h('span', { class: 'why-ic', 'aria-hidden': 'true', text: icon }), h('span', { class: 'why-k', text: label }), h('div', { class: 'why-v' }, content)]);

  const readings = h('div', { class: 'why-readings' }, sys.signals.map((s) => {
    const sig = ev.signals[s] || {};
    const [label, unit] = SIGNAL_LABEL[s];
    return h('div', { class: `why-read r-${sig.status || 'grey'}` }, [h('span', { class: 'rv', text: fmt(sig.value) }), h('span', { class: 'ru', text: unit }), h('span', { class: 'rl', text: label })]);
  }));

  const fired = st.fired.length
    ? st.fired.map((f) => h('div', { class: 'why-rule' }, [
      h('span', { class: `dot d-${f.level}` }),
      h('span', { text: `${f.title} · now ${fmt(f.measured)}` }),
      srcTag(f.source),
    ]))
    : [h('span', { class: 'muted', text: 'No rule fired' })];

  const actions = [...new Set(st.fired.map((f) => f.action))];
  const doList = actions.length
    ? actions.map((a) => h('div', { class: 'why-do' }, [confBadge(confidenceOf(st.fired.find((f) => f.action === a).source)), h('span', { text: ACTIONS[a] })]))
    : [h('span', { class: 'muted', text: 'Keep the routine' })];

  const panel = h('aside', { class: `why why-${st.status}`, role: 'dialog', 'aria-label': `Why: ${sys.label}` }, [
    h('div', { class: 'why-head' }, [
      h('span', { class: 'why-title', text: sys.label }),
      h('span', { class: `chip c-${st.status}`, text: STATUS_WORD[st.status] }),
      h('button', { class: 'why-x', 'aria-label': 'Close', text: '×', onclick: onClose }),
    ]),
    readings,
    row('◎', 'What', [h('span', { text: ex.what })]),
    row('✦', 'In space', [h('span', { text: ex.space }), srcTag(ex.spaceSource), ex.extraSource ? srcTag(ex.extraSource) : null]),
    row('⚖', 'Rule', fired),
    row('→', 'Do', doList),
    h('div', { class: 'why-foot', text: `Stored on board · works without Earth link · ${KIND_LABEL[SOURCES[ex.spaceSource].kind]}` }),
  ]);
  container.replaceChildren(panel);
  panel.querySelector('.why-x').focus({ preventScroll: true });
}
