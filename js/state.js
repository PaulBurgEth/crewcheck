import { generateCrew, HERO_ID, DEMO_DAY, MISSION_EVENTS } from './demo/generator.js';
import { DEFAULT_MISSION, missionById } from './data/missions.js';
import { evaluate } from './engine/evaluate.js';
import { escalate } from './engine/escalation.js';
import { followUp } from './engine/followup.js';

const KEY = 'crewcheck.v1';
const listeners = new Set();

const crew = generateCrew();
export const state = { crew, personId: HERO_ID, day: DEMO_DAY, missionId: DEFAULT_MISSION, system: null, route: 'today' };

// Manual check-ins entered in the demo are kept in this browser only.
function loadLocal() {
  try { return JSON.parse(localStorage.getItem(KEY)) || { entries: {} }; } catch { return { entries: {} }; }
}
let local = loadLocal();
export function saveEntry(personId, day, entry) {
  local.entries[`${personId}:${day}`] = entry;
  try { localStorage.setItem(KEY, JSON.stringify(local)); } catch { /* storage may be blocked */ }
  emit();
}
export function resetDemo() {
  local = { entries: {} };
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  Object.assign(state, { personId: HERO_ID, day: DEMO_DAY, missionId: DEFAULT_MISSION, system: null });
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
export const person = (id = state.personId) => crew.find((c) => c.id === id);
export const mission = () => missionById(state.missionId);
export const eventsFor = (personId) => MISSION_EVENTS.filter((e) => e.who === 'all' || e.who.includes(personId));

const cache = new Map();
export function verdictFor(personId = state.personId, day = state.day, missionId = state.missionId) {
  const key = `${personId}|${day}|${missionId}|${Object.keys(local.entries).length}`;
  if (cache.has(key)) return cache.get(key);
  const records = recordsOf(personId);
  const ev = evaluate(records, day);
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
