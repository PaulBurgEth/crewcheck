import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STEPS } from '../js/screens/story.js';
import { evaluate } from '../js/engine/evaluate.js';
import { escalate } from '../js/engine/escalation.js';
import { missionById } from '../js/data/missions.js';
import { generateCrew, HERO_ID } from '../js/demo/generator.js';
import { QUESTIONS, ANSWERS } from '../js/data/advisor-precomputed.js';

const hero = generateCrew().find((c) => c.id === HERO_ID);

test('story has six steps with captions of at most 12 words', () => {
  assert.equal(STEPS.length, 6);
  for (const s of STEPS) assert.ok(s.caption.split(/\s+/).length <= 12, s.caption);
});

test('step 4: the lit node differs for ISS and Mars transit on the same day', () => {
  const s = STEPS.find((x) => x.id === 'distance');
  assert.ok(s.missions.includes('iss') && s.missions.includes('mars-transit'));
  const ev = evaluate(hero.records, s.day);
  const iss = escalate(ev, missionById('iss')).tier;
  const mars = escalate(ev, missionById('mars-transit')).tier;
  assert.equal(iss, 'earth');
  assert.equal(mars, 'crew');
});

test('steps use real days: drift ends yellow, sense is green', () => {
  assert.equal(evaluate(hero.records, STEPS[0].day).overall, 'green');
  assert.equal(evaluate(hero.records, STEPS[1].day).overall, 'yellow');
});

test('advisor: three fixed questions give three different answers', () => {
  assert.equal(QUESTIONS.length, 3);
  for (const [k, a] of Object.entries(ANSWERS)) {
    const texts = QUESTIONS.map((q) => a[q.id]);
    assert.ok(texts.every((t) => typeof t === 'string' && t.length > 0 && t.length <= 200), k);
    assert.equal(new Set(texts).size, 3, k);
  }
});
