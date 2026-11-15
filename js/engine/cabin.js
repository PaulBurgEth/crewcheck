import { CABIN_PARAMS } from '../data/cabin.js';
import { doseSummary } from './radiation.js';

// Symptoms the crew rule compares across people (same day).
export const SYMPTOMS = [
  { id: 'headache', label: 'Headache', test: (r) => typeof r.headache === 'number' && r.headache >= 1 },
  { id: 'sleep', label: 'Short sleep', test: (r) => typeof r.sleepH === 'number' && r.sleepH < 7 },
];

export function cabinOut(row) {
  if (!row) return [];
  return CABIN_PARAMS.filter((p) => typeof row[p.id] === 'number' && ((p.hi != null && row[p.id] > p.hi) || (p.lo != null && row[p.id] < p.lo)));
}

// Crew rule "common cause": two or more people with the same symptom on a day when a cabin
// parameter is out of range make one cabin case, not personal cases. Non-clinical; changes no status.
// members: [{ id, record }] for one day; cabinRow: that day's cabin values.
export function commonCause(members, cabinRow, min = 2) {
  const out = cabinOut(cabinRow);
  if (!out.length) return null;
  for (const s of SYMPTOMS) {
    const who = members.filter((m) => m.record && s.test(m.record)).map((m) => m.id);
    if (who.length >= min) {
      const p = out[0];
      return { day: cabinRow.day, param: p.id, label: p.label, word: p.word, value: cabinRow[p.id], unit: p.unit, symptom: s.id, who, action: p.action, clinical: false, approval: false, confidence: 'hypothesis' };
    }
  }
  return null;
}

// Radiation for the cabin strip, from the existing radiation engine (no new model):
// crew mean dose today and so far; a solar particle event the engine detects becomes a non-clinical case.
export function radiationCase(members, day) {
  const s = members.map((m) => ({ id: m.id, ...doseSummary(m.records, day) }));
  const mean = (k) => { const v = s.map((x) => x[k]).filter((x) => typeof x === 'number'); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const who = s.filter((x) => x.events.some((e) => e.day === day)).map((x) => x.id);
  const today = mean('today');
  return {
    today: today == null ? null : Math.round(today * 10) / 10,
    total: Math.round(mean('total')),
    event: who.length ? { day, param: 'rad', label: 'Radiation', word: 'Radiation spike', who, action: 'Move to shelter', clinical: false, approval: false, confidence: 'hypothesis' } : null,
  };
}
