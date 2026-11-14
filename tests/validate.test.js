import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateCheckin } from '../js/engine/validate.js';

test('letters in sbp', () => {
  const r = validateCheckin({ mood: 3, sbp: 'abc', dbp: '80' });
  assert.equal(r.ok, false); assert.equal(r.entry, null); assert.ok(r.errors.sbp);
});
test('empty sbp with dbp given', () => {
  const r = validateCheckin({ mood: 3, sbp: '', dbp: '80' });
  assert.equal(r.ok, false); assert.ok(r.errors.sbp);
});
test('valid full input gives numbers', () => {
  const r = validateCheckin({ mood: '4', vision: '0', headache: 2, glucose: '88.5', mass: '71.2', sbp: '120', dbp: 78 });
  assert.equal(r.ok, true);
  assert.deepEqual(r.entry, { mood: 4, vision: 0, headache: 2, glucose: 88.5, mass: 71.2, sbp: 120, dbp: 78 });
});
test('mood required; optional empties omitted', () => {
  assert.ok(validateCheckin({ glucose: '90' }).errors.mood);
  assert.ok(validateCheckin({ mood: '' }).errors.mood);
  const r = validateCheckin({ mood: 3, glucose: '', mass: '', sbp: '', dbp: '' });
  assert.deepEqual(r.entry, { mood: 3 });
});
test('"120" string becomes 120', () => {
  assert.strictEqual(validateCheckin({ mood: 3, sbp: '120', dbp: '80' }).entry.sbp, 120);
});
test('range and integer errors', () => {
  assert.ok(validateCheckin({ mood: 6 }).errors.mood);
  assert.ok(validateCheckin({ mood: 2.5 }).errors.mood);
  assert.ok(validateCheckin({ mood: 3, vision: 2 }).errors.vision);
  assert.ok(validateCheckin({ mood: 3, headache: 4 }).errors.headache);
  assert.ok(validateCheckin({ mood: 3, glucose: 39 }).errors.glucose);
  assert.ok(validateCheckin({ mood: 3, mass: 201 }).errors.mass);
  assert.ok(validateCheckin({ mood: 3, sbp: 69, dbp: 80 }).errors.sbp);
  assert.ok(validateCheckin({ mood: 3, sbp: 120, dbp: 151 }).errors.dbp);
});
test('hostile strings give errors, no throw', () => {
  for (const s of ["Fisherman's", 'a"b', 'C:\\x', 'a\nb', '1e3', 'NaN', '12abc']) {
    const r = validateCheckin({ mood: s, vision: s, headache: s, glucose: s, mass: s, sbp: s, dbp: s });
    assert.equal(r.ok, false); assert.equal(r.entry, null);
  }
});
