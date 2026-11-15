import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verdictFor, recordsOf } from '../js/state.js';
import { HERO_ID } from '../js/demo/generator.js';
import { myDayPlan, dayProgress, CLINICAL } from '../js/myday.js';

const planOn = (day, marks = new Set(), checkedIn = false) => {
  const { v, ev } = verdictFor(HERO_ID, day);
  return myDayPlan({ v, ev, record: recordsOf(HERO_ID)[day - 1], marks, checkedIn });
};
const words = (s) => s.replace(/·/g, ' ').split(/\s+/).filter(Boolean).length;

test('day 120: Maya has a next step, not clinical, and waits for the medic', () => {
  const p = planOn(120);
  assert.equal(p.calm, false);
  assert.ok(p.next && p.next.text, 'next step present');
  assert.equal(p.next.text, 'Re-measure blood pressure');
  assert.ok(!/medic|surgeon|eye check/i.test(p.next.text));
  assert.ok(!CLINICAL.has(p.next.id));
  assert.equal(p.waiting, 'Waiting for crew medic');
  assert.ok(p.tasks.length >= 3 && p.tasks.length <= 4);
  for (const t of p.tasks) assert.ok(!/medic|surgeon/i.test(t.text));
});

test('day 10: calm, no next step, routine tasks only', () => {
  const p = planOn(10);
  assert.equal(p.calm, true);
  assert.equal(p.next, null);
  assert.equal(p.waiting, null);
  assert.deepEqual(p.tasks.map((t) => t.id), ['suit', 'checkin', 'train']);
});

test('day 128: next step still non-clinical', () => {
  const p = planOn(128);
  assert.ok(p.next && !CLINICAL.has(p.next.id));
});

test('ticking all tasks closes the day ring', () => {
  const marks = new Set();
  let p = planOn(120, marks);
  assert.equal(dayProgress(p.tasks).closed, false);
  for (const t of p.tasks) if (!t.done && t.id !== 'checkin') marks.add(t.id);
  p = planOn(120, marks);
  assert.equal(dayProgress(p.tasks).closed, false, 'check-in not saved yet');
  p = planOn(120, marks, true);
  const pr = dayProgress(p.tasks);
  assert.equal(pr.done, pr.total);
  assert.equal(pr.closed, true);
  assert.equal(p.next.done, true);
  assert.deepEqual(dayProgress([]), { done: 0, total: 0, closed: false });
});

test('task labels stay within five words', () => {
  for (const d of [10, 110, 115, 120, 128]) {
    const p = planOn(d);
    for (const t of p.tasks) assert.ok(words(t.text) <= 5, t.text);
    if (p.next) assert.ok(words(p.next.text) <= 5, p.next.text);
    if (p.waiting) assert.ok(words(p.waiting) <= 5);
  }
});
