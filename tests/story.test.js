import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STEPS, stepDuration, stepTiming } from '../js/screens/story.js';
import { evaluate } from '../js/engine/evaluate.js';
import { escalate } from '../js/engine/escalation.js';
import { missionById } from '../js/data/missions.js';
import { generateCrew, HERO_ID } from '../js/demo/generator.js';
import { QUESTIONS, ANSWERS } from '../js/data/advisor-precomputed.js';

const hero = generateCrew().find((c) => c.id === HERO_ID);

test('story v2: nine steps from day 1, each with day, badge, title and two-sentence text', () => {
  assert.equal(STEPS.length, 9);
  assert.equal(STEPS[0].day, 1);
  for (const s of STEPS) {
    assert.ok(Number.isInteger(s.day) && s.day >= 1 && s.day <= 180, s.id);
    assert.ok(s.badge.startsWith(`Day ${s.from ?? s.day}`), s.id);
    const w = s.title.split(/\s+/).length;
    assert.ok(w >= 2 && w <= 6, s.title);
    assert.ok((s.text.match(/[.!?](\s|$)/g) || []).length >= 2, s.id);
  }
});

test('story v2: Play takes at most 100 s; each step holds at least 6 s after its motion ends', () => {
  let day = 1;
  let total = 0;
  for (const s of STEPS) {
    const d = stepDuration(s, s.from ?? (day < s.day ? day : null));
    assert.ok(d - stepTiming(s, day).animEnd >= 6000, s.id);
    total += d;
    day = s.day;
  }
  assert.ok(total <= 100000, String(total));
});

test('story v2: distance step switches ISS then Mars transit and lights scene and verdict', () => {
  const s = STEPS.find((x) => x.id === 'distance');
  assert.deepEqual(s.missions, ['iss', 'mars-transit']);
  assert.deepEqual(s.spots, ['scene', 'rules']);
});

test('story v2: days in the cards match the data', () => {
  const at = (id) => STEPS.find((x) => x.id === id);
  const ev = (d) => evaluate(hero.records, d);
  const mars = missionById('mars-transit');
  assert.equal(ev(at('sense').day).overall, 'green');
  const small = ev(at('small').day);
  assert.equal(small.overall, 'yellow');
  assert.ok(small.fired.some((f) => f.signal === 'exerciseMin'));
  assert.equal(escalate(small, mars).tier, 'self');
  const drift = at('drift');
  assert.equal(ev(drift.from - 1).overall, 'green');
  assert.equal(ev(drift.from).overall, 'yellow');
  assert.equal(escalate(ev(drift.day), mars).tier, 'crew');
  assert.ok(new Set(ev(drift.day).fired.map((f) => f.signal)).size >= 3);
  assert.ok(STEPS.some((s) => s.id === 'act' && s.day === 121));
});

test('step distance: the lit node differs for ISS and Mars transit on the same day', () => {
  const s = STEPS.find((x) => x.id === 'distance');
  assert.ok(s.missions.includes('iss') && s.missions.includes('mars-transit'));
  const ev = evaluate(hero.records, s.day);
  assert.equal(escalate(ev, missionById('iss')).tier, 'earth');
  assert.equal(escalate(ev, missionById('mars-transit')).tier, 'crew');
});

test('advisor: three fixed questions give three different answers', () => {
  assert.equal(QUESTIONS.length, 3);
  for (const [k, a] of Object.entries(ANSWERS)) {
    const texts = QUESTIONS.map((q) => a[q.id]);
    assert.ok(texts.every((t) => typeof t === 'string' && t.length > 0 && t.length <= 200), k);
    assert.equal(new Set(texts).size, 3, k);
  }
});
