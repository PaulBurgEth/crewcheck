import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStream, detectAlerts } from '../js/sensor/stream.js';
import { RULES } from '../js/data/rules.js';

const take = (s, n) => Array.from({ length: n }, () => s.next());
const rec = { hr: 62, rr: 14, spo2: 98, temp: 36.7, sbp: 116, dbp: 74 };

test('normal stream gives no alerts (several seeds)', () => {
  for (let seed = 1; seed <= 20; seed++) {
    assert.deepEqual(detectAlerts(take(createStream(rec, { seed }), 120), RULES), []);
  }
});
test('spo2 drop alerts without manual input', () => {
  const s = take(createStream(rec, { seed: 3, event: { type: 'spo2-drop', at: 20, depth: 7, length: 12 } }), 60);
  const a = detectAlerts(s, RULES);
  const y = a.find((x) => x.ruleId === 'spo2-y');
  assert.ok(y && y.level === 'yellow' && y.t >= 20 && y.value <= 94);
  assert.equal(a.filter((x) => x.ruleId === 'spo2-y').length, 1);
  const deep = take(createStream(rec, { seed: 3, event: { type: 'spo2-drop', at: 20, depth: 10, length: 12 } }), 60);
  assert.ok(detectAlerts(deep, RULES).some((x) => x.ruleId === 'spo2-r'));
});
test('hr spike alerts hr-y', () => {
  const s = take(createStream(rec, { seed: 2, event: { type: 'hr-spike', at: 10, depth: 50, length: 14 } }), 40);
  assert.ok(detectAlerts(s, RULES).some((x) => x.ruleId === 'hr-y'));
});
test('single low sample does not alert; three do', () => {
  const mk = (vals) => vals.map((spo2, t) => ({ t, spo2 }));
  assert.deepEqual(detectAlerts(mk([98, 98, 90, 98, 98, 90, 90, 98]), RULES), []);
  assert.ok(detectAlerts(mk([98, 90, 90, 90]), RULES).some((x) => x.ruleId === 'spo2-y'));
});
test('deterministic per seed, differs across seeds, defaults for missing record', () => {
  assert.deepEqual(take(createStream(rec, { seed: 5 }), 30), take(createStream(rec, { seed: 5 }), 30));
  assert.notDeepEqual(take(createStream(rec, { seed: 5 }), 30), take(createStream(rec, { seed: 6 }), 30));
  const d = take(createStream({ hr: null }, { seed: 1 }), 20);
  assert.ok(d.every((x) => Math.abs(x.hr - 64) < 5 && Math.abs(x.spo2 - 98) < 1));
});
