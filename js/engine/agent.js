import { evaluate } from './evaluate.js';
import { escalate } from './escalation.js';
import { followUp } from './followup.js';

// Onboard watch agent. It decides nothing: cases, stages and actions are read from the rule engine's
// results (evaluate, escalate, followUp). It only does non-clinical work, and less of it near Earth.

export const STAGES = ['watch', 'flag', 'plan', 'act', 'verify'];

// What the agent may do on its own at each distance (design assumption, see Sources).
const MAY = {
  watch: { icon: 'eye', label: 'Watch signals' },
  forward: { icon: 'envelope', label: 'Notify Earth' },
  remeasure: { icon: 'cuff', label: 'Schedule re-measure' },
  report: { icon: 'form', label: 'Draft report' },
  page: { icon: 'cross', label: 'Page medic' },
  track: { icon: 'shield', label: 'Track case' },
};
export const AGENT_CAPS = MAY;
const LEVEL = { iss: ['watch', 'forward'], moon: ['watch', 'forward', 'remeasure', 'report'] };
const FAR = ['watch', 'forward', 'remeasure', 'report', 'page', 'track'];
export const agentMay = (mission) => LEVEL[mission.id] || FAR;

// Never done by the agent, whatever the distance.
export const AGENT_NEVER = ['Diagnose', 'Medicines or doses', 'Close a red case alone', 'Change status or thresholds'];

const bad = (s) => s === 'yellow' || s === 'red';

// Cases: one per run of non-green days. Opens on the first yellow/red day, closes on the next green day.
export function casesOf(records, { lastDay = 180 } = {}) {
  const out = [];
  let open = null;
  for (let d = 1; d <= lastDay; d++) {
    const ev = evaluate(records, d);
    if (bad(ev.overall)) {
      if (!open) open = { id: `case-${d}`, openDay: d, closeDay: null, worst: ev.overall, systems: new Set() };
      if (ev.overall === 'red') open.worst = 'red';
      for (const [k, s] of Object.entries(ev.systems)) if (bad(s.status)) open.systems.add(k);
    } else if (open) {
      open.closeDay = d;
      out.push({ ...open, systems: [...open.systems] });
      open = null;
    }
  }
  if (open) out.push({ ...open, systems: [...open.systems] });
  return out;
}

export function caseOn(cases, day) {
  return cases.find((c) => c.openDay <= day && (c.closeDay === null || day < c.closeDay)) || null;
}

// Stage of an open case on a day. A countermeasure inside the case drives Plan → Act → Verify.
export function stageOf(c, day, countermeasureDay = null) {
  if (!c || day < c.openDay || (c.closeDay !== null && day >= c.closeDay)) return 'watch';
  if (day === c.openDay) return 'flag';
  const cm = countermeasureDay !== null && countermeasureDay > c.openDay ? countermeasureDay : null;
  if (cm !== null) {
    if (day < cm) return 'plan';
    if (day < cm + 7) return 'act';
    return 'verify';
  }
  return day - c.openDay < 2 ? 'plan' : 'act';
}

// Agent work for the day: what it did itself and what waits for a person. Pure; the verdict is not touched.
export function agentDay(v, mission) {
  const may = new Set(agentMay(mission));
  const done = [];
  const human = [];
  if (!bad(v.status)) return { done, human };
  const acts = new Set(v.actions.map((a) => a.text));
  const has = (re) => [...acts].some((t) => re.test(t));
  if (has(/re-measure/i)) (may.has('remeasure') ? done : human).push({ id: 'remeasure', icon: 'cuff', text: may.has('remeasure') ? 'Re-measure set' : 'Re-measure' });
  if (has(/light|exercise/i)) (may.has('remeasure') ? done : human).push({ id: 'reminders', icon: 'clock', text: may.has('remeasure') ? 'Reminders set' : 'Set reminders' });
  if (v.reply.sent || v.tier === 'earth' || v.notify.includes('earth')) done.push({ id: 'report', icon: 'envelope', text: may.has('report') ? 'Report sent' : 'Forwarded' });
  if (v.tier === 'crew') (may.has('page') ? done : human).push({ id: 'page', icon: 'cross', text: may.has('page') ? 'Medic paged' : 'Call medic' });
  // Clinical steps always wait for a person.
  if (v.tier === 'crew') human.push({ id: 'review', icon: 'cross', text: 'Medic review' });
  if (has(/talk/i)) human.push({ id: 'talk', icon: 'people', text: 'Talk to crew' });
  if (has(/eye/i)) human.push({ id: 'eye', icon: 'eye', text: 'Eye check' });
  if (v.tier === 'earth') human.push({ id: 'surgeon', icon: 'cross', text: 'Ask surgeon' });
  return { done, human };
}

// Log of one case, built from the same engines: one line per change.
export function caseLog(records, c, mission, { upTo, countermeasureDay = null } = {}) {
  if (!c) return [];
  const end = Math.min(upTo, c.closeDay ?? upTo);
  const log = [];
  let prevStage = null;
  let prevKey = '';
  for (let d = c.openDay; d <= end; d++) {
    if (c.closeDay !== null && d === c.closeDay) { log.push({ day: d, icon: 'check', text: 'Closed: signals back in range' }); break; }
    const ev = evaluate(records, d);
    const v = escalate(ev, mission);
    const stage = stageOf(c, d, countermeasureDay);
    const flagged = Object.entries(ev.systems).filter(([, s]) => bad(s.status)).map(([k]) => k).sort().join(', ');
    if (d === c.openDay) log.push({ day: d, icon: 'eye', text: `Flagged: ${flagged}` });
    else if (flagged !== prevKey) log.push({ day: d, icon: 'eye', text: `Now flagged: ${flagged}` });
    const { done } = agentDay(v, mission);
    const doneKey = done.map((x) => x.id).join();
    if (d === c.openDay || doneKey !== prevStage?.done) for (const a of done) log.push({ day: d, icon: a.icon, text: a.text });
    if (countermeasureDay === d) log.push({ day: d, icon: 'shield', text: 'Countermeasure started' });
    if (stage === 'verify' && prevStage?.stage !== 'verify') {
      const fu = followUp(records, countermeasureDay, d);
      const ok = fu.items.filter((i) => i.result === 'worked').length;
      log.push({ day: d, icon: 'check', text: `Re-checked: ${ok} of ${fu.items.length} back in range${fu.state === 'not-worked' ? ' · stepped up to crew medic' : ''}` });
    }
    prevStage = { stage, done: doneKey };
    prevKey = flagged;
  }
  return log;
}
