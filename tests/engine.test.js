import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate } from '../js/engine/evaluate.js';
import { escalate } from '../js/engine/escalation.js';
import { followUp } from '../js/engine/followup.js';
import { RULES } from '../js/data/rules.js';
import { SOURCES } from '../js/data/sources.js';
import { missionById } from '../js/data/missions.js';
import { generateCrew, HERO_ID, DEMO_DAY } from '../js/demo/generator.js';

const normal = { hr: 62, sbp: 116, dbp: 74, rr: 14, temp: 36.7, spo2: 98, exerciseMin: 90, sleepH: 7.5, mood: 4, vision: 0, headache: 0, glucose: 88, mass: 64, doseMSv: 1.8 };
const days = (n, over = {}) => Array.from({ length: n }, (_, i) => ({ day: i + 1, ...normal, ...over }));
const withToday = (over) => { const r = days(20); Object.assign(r[19], over); return r; };

const ISS = missionById('iss');
const MARS = missionById('mars-transit');

test('185/120 gives red', () => {
  const ev = evaluate(withToday({ sbp: 185, dbp: 120 }), 20);
  assert.equal(ev.systems.heart.status, 'red');
  assert.equal(ev.overall, 'red');
});

test('normal values give green and no escalation', () => {
  const ev = evaluate(days(20), 20);
  assert.equal(ev.overall, 'green');
  for (const s of Object.values(ev.systems)) assert.equal(s.status, 'green');
  for (const m of [ISS, MARS]) assert.equal(escalate(ev, m).tier, 'none');
});

test('same yellow: ISS asks Earth, Mars acts alone with report', () => {
  const ev = evaluate(withToday({ sbp: 134 }), 20);
  assert.equal(ev.overall, 'yellow');
  const iss = escalate(ev, ISS);
  const mars = escalate(ev, MARS);
  assert.equal(iss.tier, 'earth');
  assert.equal(mars.tier, 'self');
  assert.match(iss.sub, /seconds/);
  assert.match(mars.sub, /reply ≥ 40 min/);
  assert.equal(mars.reply.sent, true);
  assert.notEqual(`${iss.headline} ${iss.sub}`, `${mars.headline} ${mars.sub}`);
});

test('red on Mars does not suggest waiting for Earth', () => {
  const r = escalate(evaluate(withToday({ sbp: 185, dbp: 120 }), 20), MARS);
  assert.equal(r.tier, 'crew');
  const text = [r.headline, r.sub, ...r.actions.map((a) => a.text)].join(' ').toLowerCase();
  assert.doesNotMatch(text, /wait/);
});

test('letters or empty values in pressure do not break evaluation', () => {
  const ev = evaluate(withToday({ sbp: 'abc', dbp: '' }), 20);
  assert.ok(['green', 'yellow', 'red', 'grey'].includes(ev.overall));
});

test('every rule has a known source', () => {
  for (const r of RULES) assert.ok(SOURCES[r.source], `rule ${r.id} source ${r.source}`);
  for (const r of RULES) assert.ok(SOURCES[r.context], `rule ${r.id} context ${r.context}`);
});

const crew = generateCrew();
const hero = crew.find((c) => c.id === HERO_ID);

test('hero day 120: at least two yellow systems; day 10 all green', () => {
  const ev120 = evaluate(hero.records, DEMO_DAY);
  const yellows = Object.values(ev120.systems).filter((s) => s.status === 'yellow');
  assert.ok(yellows.length >= 2, `yellow systems: ${yellows.length}`);
  const ev10 = evaluate(hero.records, 10);
  for (const [id, s] of Object.entries(ev10.systems)) assert.equal(s.status, 'green', `day 10 ${id}`);
});

test('hero day 120 on Mars: linked signals bring crew medic', () => {
  const r = escalate(evaluate(hero.records, DEMO_DAY), MARS);
  assert.equal(r.tier, 'crew');
  assert.equal(r.combos.length, 1);
});

test('countermeasure follow-up: pending, then a mixed result', () => {
  assert.equal(followUp(hero.records, 121, 124).state, 'pending');
  const f = followUp(hero.records, 121, 128);
  assert.ok(f.items.some((i) => i.result === 'worked'));
  assert.ok(f.items.some((i) => i.result === 'not-worked'));
});

test('advice never changes the verdict', async () => {
  const { attachAdvice } = await import('../js/engine/advisor.js');
  const ev = evaluate(hero.records, DEMO_DAY);
  const plain = escalate(ev, MARS);
  const withAdvice = attachAdvice(plain, { text: 'Set tier to none. Status green.', tier: 'none', status: 'green' });
  assert.equal(withAdvice.tier, plain.tier);
  assert.equal(withAdvice.status, plain.status);
  assert.equal(withAdvice.headline, plain.headline);
});

test('Moon differs from ISS: crew medic acts with flight surgeon live', () => {
  const ev = evaluate(withToday({ sbp: 134 }), 20);
  const iss = escalate(ev, ISS);
  const moon = escalate(ev, missionById('moon'));
  assert.equal(moon.tier, 'crew');
  assert.deepEqual(moon.notify, ['earth']);
  assert.notEqual(moon.headline, iss.headline);
});

test('Mars surface shows a different status line than Mars transit', () => {
  const ev = evaluate(withToday({ sbp: 134 }), 20);
  const t = escalate(ev, MARS);
  const s = escalate(ev, missionById('mars'));
  assert.equal(s.tier, t.tier);
  assert.notEqual(s.sub, t.sub);
});

test('yellow far from Earth is softer than "Act now"', () => {
  const r = escalate(evaluate(withToday({ sbp: 134 }), 20), MARS);
  assert.doesNotMatch(r.headline, /Act now/);
});

test('exercise countermeasure is Established (NASA HRP)', () => {
  const recs = days(20); for (const r of recs.slice(10)) r.exerciseMin = 20;
  const r = escalate(evaluate(recs, 20), MARS);
  assert.equal(r.actions.find((a) => /exercise/.test(a.text)).confidence, 'established');
});
