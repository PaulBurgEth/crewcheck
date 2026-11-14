import { test } from 'node:test';
import assert from 'node:assert/strict';
import { casesOf, caseOn, stageOf, agentDay, agentMay, caseLog } from '../js/engine/agent.js';
import { evaluate } from '../js/engine/evaluate.js';
import { escalate } from '../js/engine/escalation.js';
import { missionById, MISSIONS } from '../js/data/missions.js';
import { generateCrew, HERO_ID, MISSION_EVENTS } from '../js/demo/generator.js';

const hero = generateCrew().find((c) => c.id === HERO_ID);
const CM = MISSION_EVENTS.find((e) => e.id === 'countermeasure').day;
const MARS = missionById('mars-transit');

test('cases follow the rules: one per run of yellow/red days, none open on green days', () => {
  const cases = casesOf(hero.records);
  for (let d = 1; d <= 180; d++) {
    const open = caseOn(cases, d);
    const status = evaluate(hero.records, d).overall;
    assert.equal(!!open, status === 'yellow' || status === 'red', `day ${d}`);
  }
  const story = caseOn(cases, 118);
  assert.equal(story.openDay, 103);
  assert.ok(story.closeDay > 128);
});

test('story case goes Flag → Plan → Act → Verify', () => {
  const c = caseOn(casesOf(hero.records), 118);
  assert.equal(stageOf(c, 103, CM), 'flag');
  assert.equal(stageOf(c, 110, CM), 'plan');
  assert.equal(stageOf(c, 121, CM), 'act');
  assert.equal(stageOf(c, 128, CM), 'verify');
  assert.equal(stageOf(c, 60, CM), 'watch');
  const log = caseLog(hero.records, c, MARS, { upTo: 128, countermeasureDay: CM });
  assert.ok(log.some((l) => /Re-checked/.test(l.text) && l.day === 128));
});

test('Agent may grows with distance', () => {
  const [iss, moon, mars] = ['iss', 'moon', 'mars-transit'].map((id) => agentMay(missionById(id)));
  assert.ok(iss.length < moon.length && moon.length < mars.length);
  for (const x of iss) assert.ok(moon.includes(x));
  for (const x of moon) assert.ok(mars.includes(x));
});

test('agent never changes status or tier', () => {
  for (const d of [10, 103, 113, 118, 121, 128, 150]) {
    for (const m of MISSIONS) {
      const ev = evaluate(hero.records, d);
      const v = escalate(ev, m);
      const snap = JSON.stringify(v);
      agentDay(v, m);
      assert.equal(JSON.stringify(v), snap);
      assert.equal(escalate(evaluate(hero.records, d), m).tier, v.tier);
    }
  }
});

test('clinical steps wait for a person', () => {
  const v = escalate(evaluate(hero.records, 118), MARS);
  const { done, human } = agentDay(v, MARS);
  assert.ok(human.some((h) => h.id === 'review'));
  assert.ok(!done.some((x) => ['review', 'talk', 'eye', 'surgeon'].includes(x.id)));
});
