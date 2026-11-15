import { generateCrew, HERO_ID, DEMO_DAY, MISSION_EVENTS } from './demo/generator.js';
import { DEFAULT_MISSION, missionById } from './data/missions.js';
import { evaluate } from './engine/evaluate.js';
import { escalate } from './engine/escalation.js';
import { followUp } from './engine/followup.js';
import { RULES } from './data/rules.js';
import { generateCabin } from './demo/cabin.js';
import { commonCause } from './engine/cabin.js';

const listeners = new Set();

const crew = generateCrew();
export const state = { crew, personId: HERO_ID, day: DEMO_DAY, missionId: DEFAULT_MISSION, system: null, route: 'today', liveAlert: null };

// Manual check-ins entered in the demo live only in this page's memory:
// a fresh page load always opens the clean story (day 120, hero).
let local = { entries: {} };
export function saveEntry(personId, day, entry) {
  local.entries[`${personId}:${day}`] = entry;
  emit();
}
export function resetDemo() {
  local = { entries: {} };
  Object.assign(state, { personId: HERO_ID, day: DEMO_DAY, missionId: DEFAULT_MISSION, system: null, liveAlert: null });
  emit();
}
export const localEntry = (personId, day) => local.entries[`${personId}:${day}`];

export function recordsOf(personId) {
  const p = crew.find((c) => c.id === personId);
  return p.records.map((r) => {
    const e = local.entries[`${personId}:${r.day}`];
    return e ? { ...r, ...e } : r;
  });
}
export const cabin = generateCabin();
// Crew rule on the cabin: one case for everyone with the same symptom, or null.
export const cabinCase = (day = state.day) => commonCause(crew.map((c) => ({ id: c.id, record: recordsOf(c.id)[day - 1] })), cabin[day - 1]);
export const person = (id = state.personId) => crew.find((c) => c.id === id);
export const mission = () => missionById(state.missionId);
export const eventsFor = (personId) => MISSION_EVENTS.filter((e) => e.who === 'all' || e.who.includes(personId));

const cache = new Map();
const RANK = { grey: 0, green: 1, yellow: 2, red: 3 };
// An alert from the live suit stream counts like a fired rule until the value is back to normal.
function withLiveAlert(ev, personId, day) {
  const a = state.liveAlert;
  if (!a || a.personId !== personId || a.day !== day) return ev;
  const rule = RULES.find((r) => r.id === a.ruleId);
  if (!rule) return ev;
  const f = { ...rule, measured: Math.round(a.value * 10) / 10, live: true, title: `Live suit alert: ${rule.title}` };
  const up = (cur) => (RANK[rule.level] > RANK[cur] ? rule.level : cur);
  const signals = { ...ev.signals, [rule.signal]: { ...ev.signals[rule.signal], status: up(ev.signals[rule.signal]?.status || 'grey'), fired: [...(ev.signals[rule.signal]?.fired || []), f], value: f.measured } };
  const systems = { ...ev.systems, [rule.system]: { status: up(ev.systems[rule.system].status), fired: [...ev.systems[rule.system].fired, f] } };
  return { ...ev, signals, systems, fired: [...ev.fired, f], overall: up(ev.overall), liveAlert: f };
}
export function setLiveAlert(alert) {
  const cur = state.liveAlert;
  if (!alert && !cur) return;
  if (alert && cur && cur.ruleId === alert.ruleId && cur.day === alert.day) return;
  set({ liveAlert: alert });
}
export function verdictFor(personId = state.personId, day = state.day, missionId = state.missionId) {
  const la = state.liveAlert;
  const key = `${personId}|${day}|${missionId}|${JSON.stringify(local.entries).length}|${la ? `${la.personId}${la.day}${la.ruleId}` : ''}`;
  if (cache.has(key)) return cache.get(key);
  const records = recordsOf(personId);
  const ev = withLiveAlert(evaluate(records, day), personId, day);
  const cm = eventsFor(personId).find((e) => e.id === 'countermeasure' && e.day <= day);
  const fu = cm ? followUp(records, cm.day, day) : null;
  const v = escalate(ev, missionById(missionId), { followupFailed: fu?.state === 'not-worked' });
  const out = { ev, v, fu, records };
  cache.set(key, out);
  return out;
}

const strips = new Map();
export function statusStrip(personId = state.personId) {
  const key = `${personId}|${JSON.stringify(local.entries).length}`;
  if (!strips.has(key)) {
    const records = recordsOf(personId);
    strips.set(key, records.map((r) => evaluate(records, r.day).overall));
  }
  return strips.get(key);
}

export function set(patch) { Object.assign(state, patch); emit(); }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { cache.clear(); for (const fn of listeners) fn(state); }
