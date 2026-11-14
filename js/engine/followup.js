import { evaluate } from './evaluate.js';

// Did the countermeasure work? Compare rules fired the day before it started with rules fired checkAfter days later.
export function followUp(records, startDay, day, { checkAfter = 7 } = {}) {
  const dueDay = startDay + checkAfter;
  const before = evaluate(records, startDay - 1);
  const targets = [...new Set(before.fired.map((f) => f.signal))];
  if (day < startDay) return { state: 'none', startDay, dueDay, items: [] };
  if (day < dueDay) return { state: 'pending', startDay, dueDay, items: targets.map((signal) => ({ signal, result: 'pending' })) };
  const after = evaluate(records, dueDay);
  const stillFiring = new Set(after.fired.map((f) => f.signal));
  const items = targets.map((signal) => ({ signal, result: stillFiring.has(signal) ? 'not-worked' : 'worked' }));
  const failed = items.some((i) => i.result === 'not-worked');
  return { state: failed ? 'not-worked' : 'worked', startDay, dueDay, items };
}
