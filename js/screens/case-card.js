import { h } from '../ui.js';
import { icon } from '../viz/icons.js';
import { STAGES, casesOf, caseOn, stageOf, agentDay, caseLog } from '../engine/agent.js';
import { SYSTEMS } from '../data/rules.js';
import { findHandover } from '../data/advisor-precomputed.js';

const LABEL = Object.fromEntries(SYSTEMS.map((s) => [s.id, s.label]));
const STAGE_ICON = { watch: 'eye', flag: 'flag', plan: 'form', act: 'spark', verify: 'shield' };
const STAGE_WORD = { watch: 'Watch', flag: 'Flag', plan: 'Plan', act: 'Act', verify: 'Verify' };
const cache = new WeakMap();
const approved = new Map(); // `${person}:${caseId}:${actionId}` -> day approved (memory only, like check-ins)
let noteOpen = false;
export const noteIsOpen = () => noteOpen;

export const casesFor = (records, strip) => {
  if (!cache.has(strip)) cache.set(strip, casesOf(records));
  return cache.get(strip);
};

// Onboard agent case card: five stages, what the agent did, what waits for a person. It never changes the verdict.
export function renderCase({ person, records, strip, v, mission, day, countermeasureDay, live, onChange, onLog, reveal = false }) {
  const c = caseOn(casesFor(records, strip), day);
  const stage = stageOf(c, day, countermeasureDay);
  // Stages are icons; only the current one carries its word.
  const bar = h('ol', { class: 'cs-stages', 'aria-label': `Agent stage: ${STAGE_WORD[stage]}` }, STAGES.map((s) => h('li', {
    class: `cs-st${s === stage ? ' on' : ''}${STAGES.indexOf(s) < STAGES.indexOf(stage) ? ' past' : ''}`, title: STAGE_WORD[s],
  }, [icon(STAGE_ICON[s]), s === stage ? h('span', { text: STAGE_WORD[s] }) : null])));
  const head = h('div', { class: 'cs-head' }, [icon('spark'), h('span', { class: 'cs-title', text: 'Onboard agent' }),
    h('button', { type: 'button', class: 'cs-log', onclick: onLog }, [icon('more'), h('span', { text: 'Log' })])]);
  const box = h('section', { class: `cs${reveal ? ' cs-reveal' : ''}`, 'data-spot': 'act' }, [head, bar]);
  if (!c) {
    box.append(h('div', { class: 'cs-idle' }, [icon('eye'), h('span', { text: 'Watching · no open case' })]));
    return box;
  }
  box.setAttribute('aria-label', `Case since day ${c.openDay}: ${c.systems.map((s) => LABEL[s]).join(', ')}`);
  head.querySelector('.cs-title').title = `Case since day ${c.openDay}`;
  const { done, human } = agentDay(v, mission);
  const key = (a) => `${person.id}:${c.id}:${a.id}`;
  box.append(
    h('ul', { class: 'cs-done', 'aria-label': 'Done by agent' }, done.map((a, i) => h('li', { style: `--i:${i}` }, [icon('check', 'cs-ok'), icon(a.icon), h('span', { text: a.text })]))),
    h('ul', { class: 'cs-human', 'aria-label': 'Needs a person' }, human.map((a, i) => {
      const ok = approved.get(key(a));
      return h('li', { style: `--i:${done.length + i}` }, [icon('person'), icon(a.icon), h('span', { text: a.text }),
        ok ? h('span', { class: 'cs-appr', text: `Approved d${ok.day}` }) : h('button', { type: 'button', class: 'cs-btn', onclick: () => { approved.set(key(a), { day, text: a.text }); onChange(); } }, 'Approve')]);
    })),
  );
  const note = live?.text || findHandover(person.id, day, c.openDay);
  if (note) {
    box.append(h('button', { type: 'button', class: 'cs-note-btn', 'aria-expanded': String(noteOpen), onclick: () => { noteOpen = !noteOpen; onChange(); } }, [icon('form'), h('span', { text: 'Note' })]));
    if (noteOpen) box.append(h('div', { class: 'cs-note' }, [h('p', { text: note }), h('div', { class: 'adv-origin', text: live?.origin === 'onboard' ? 'AI-written onboard · rules decided' : live ? 'AI-written (Claude), live · rules decided' : 'AI-written (Claude), precomputed · rules decided' })]));
  }
  return box;
}

// Agent log for the drawer: the case so far, plus approvals made in this page.
export function renderAgentLog({ person, records, strip, mission, day, countermeasureDay }) {
  const c = caseOn(casesFor(records, strip), day) || [...casesFor(records, strip)].reverse().find((x) => x.openDay <= day);
  const lines = c ? caseLog(records, c, mission, { upTo: day, countermeasureDay }) : [];
  for (const [k, a] of approved) {
    const [pid, cid] = k.split(':');
    if (pid === person.id && c && cid === c.id) lines.push({ day: a.day, icon: 'person', text: `Approved by a person: ${a.text}` });
  }
  lines.sort((a, b) => a.day - b.day);
  return h('section', { class: 'ag-log' }, [
    h('h3', { class: 'ins-title', text: 'Agent log' }),
    lines.length ? h('ul', {}, lines.map((l) => h('li', {}, [h('span', { class: 'ag-d', text: `D${l.day}` }), icon(l.icon), h('span', { text: l.text })])))
      : h('div', { class: 'muted', text: 'No case yet' }),
    h('div', { class: 'ins-foot', text: 'Simulated · rules decide · the agent does non-clinical steps only' }),
  ]);
}
