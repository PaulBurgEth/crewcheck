import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCrew } from '../js/demo/generator.js';
import { doseSummary } from '../js/engine/radiation.js';

const maya = generateCrew().find((c) => c.id === 'maya');

test('day 120 total in range', () => {
  const s = doseSummary(maya.records, 120);
  assert.ok(s.total > 150 && s.total < 300, String(s.total));
});
test('events', () => {
  assert.equal(doseSummary(maya.records, 120).events.length, 0);
  assert.ok(doseSummary(maya.records, 160).events.some((e) => e.day === 150));
});
test('rate near 1.8', () => {
  assert.ok(Math.abs(doseSummary(maya.records, 120).ratePerDay - 1.8) <= 0.3);
  assert.ok(Math.abs(doseSummary(maya.records, 160).ratePerDay - 1.8) <= 0.3);
});
test('nulls do not throw', () => {
  const recs = maya.records.map((r, i) => (i % 3 ? { ...r, doseMSv: null } : r));
  assert.doesNotThrow(() => doseSummary(recs, 120));
  assert.doesNotThrow(() => doseSummary([], 5));
  assert.doesNotThrow(() => doseSummary(null, 5));
  assert.doesNotThrow(() => doseSummary([{ day: 1, doseMSv: null }, null], 1));
});
