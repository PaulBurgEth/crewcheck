import { test } from 'node:test';
import assert from 'node:assert/strict';
import { forecast, nextCrossings } from '../js/engine/forecast.js';
import { RULES } from '../js/data/rules.js';
import { generateCrew } from '../js/demo/generator.js';

const rule = (id) => RULES.find((r) => r.id === id);
const series = (n, f) => Array.from({ length: n }, (_, i) => ({ day: i + 1, sbp: f(i) }));

test('rising sbp predicts crossing of 130', () => {
  const recs = series(21, (i) => 110 + (15 * i) / 20);
  const f = forecast(recs, 21, rule('sbp-y'));
  assert.ok(f.crossDay > 21 && f.daysToCross <= 30);
  assert.equal(f.alreadyFiring, false);
  assert.equal(f.cone.length, 30);
});
test('flat series has no crossing', () => {
  assert.equal(forecast(series(21, () => 115), 21, rule('sbp-y')).crossDay, null);
});
test('falling series vs gte rule is null', () => {
  assert.equal(forecast(series(21, (i) => 125 - i * 0.5), 21, rule('sbp-y')).crossDay, null);
});
test('fewer than 7 points returns null', () => {
  assert.equal(forecast(series(6, (i) => 110 + i), 6, rule('sbp-y')), null);
});
test('maya day 108 has a coming crossing', () => {
  const maya = generateCrew().find((c) => c.id === 'maya');
  const list = nextCrossings(maya.records, 108, RULES);
  const hit = list.find((x) => ['sbp-y', 'sleep-y'].includes(x.rule.id));
  assert.ok(hit, JSON.stringify(list.map((x) => [x.rule.id, x.daysToCross])));
  assert.ok(hit.daysToCross >= 1 && hit.daysToCross <= 30);
});
test('adaptation week is not extrapolated: no forecast on day 10', () => {
  const maya = generateCrew().find((c) => c.id === 'maya');
  assert.equal(forecast(maya.records, 10, rule('hr-low-y') || RULES.find((r) => r.signal === 'hr' && r.op === 'lt' || r.signal === 'hr' && r.op === 'lte')), null);
  assert.equal(forecast(maya.records, 20, rule('sbp-y')), null);
  assert.ok(forecast(maya.records, 21, rule('sbp-y')));
});
test('noise is not a trend: Ilya day 40 sleep shows no crossing', () => {
  const ilya = generateCrew().find((c) => c.id === 'ilya');
  assert.ok(!nextCrossings(ilya.records, 40).some((x) => x.rule.id === 'sleep-y'));
});
