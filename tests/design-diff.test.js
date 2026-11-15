import { test } from 'node:test';
import assert from 'node:assert/strict';
import { missionById, decidesText, oneWayText } from '../js/data/missions.js';
import { whoActs } from '../js/screens/verdict.js';
import { evaluate } from '../js/engine/evaluate.js';
import { escalate } from '../js/engine/escalation.js';
import { generateCrew, HERO_ID } from '../js/demo/generator.js';

const hero = generateCrew().find((c) => c.id === HERO_ID);

test('mission strip: who decides differs for ISS and Mars transit', () => {
  assert.equal(decidesText(missionById('iss')), 'Flight surgeon decides');
  assert.equal(decidesText(missionById('mars-transit')), 'Crew decides');
  assert.notEqual(oneWayText(missionById('iss')), oneWayText(missionById('mars-transit')));
});

test('verdict headline names who acts; tier and status unchanged', () => {
  const ev = evaluate(hero.records, 118);
  const mars = escalate(ev, missionById('mars-transit'));
  const iss = escalate(ev, missionById('iss'));
  assert.deepEqual([mars.tier, mars.status], ['crew', 'yellow']);
  assert.deepEqual([iss.tier, iss.status], ['earth', 'yellow']);
  assert.deepEqual(whoActs(mars, missionById('mars-transit')), { title: 'Crew medic acts now', sub: 'Earth answers in 40 min' });
  assert.deepEqual(whoActs(iss, missionById('iss')), { title: 'Flight surgeon decides', sub: 'Answer in seconds' });
  const small = escalate(evaluate(hero.records, 60), missionById('mars-transit'));
  assert.equal(whoActs(small, missionById('mars-transit'), 'Maya').title, 'Maya acts now');
});
