import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCrew, HERO_ID, DEMO_DAY, MISSION_EVENTS } from '../js/demo/generator.js';
import { PASSPORT } from '../js/demo/passport.js';
import { SOURCES } from '../js/data/sources.js';

const crew = generateCrew();
const by = (id) => crew.find((m) => m.id === id);
const rec = (id, d) => by(id).records[d - 1];
const mean = (id, k, a, b) => {
  const v = by(id).records.slice(a - 1, b).map((r) => r[k]);
  return v.reduce((s, x) => s + x, 0) / v.length;
};
const SIGNALS = ['hr', 'sbp', 'dbp', 'rr', 'temp', 'spo2', 'exerciseMin', 'sleepH', 'mood', 'vision', 'headache', 'glucose', 'mass', 'doseMSv'];

test('deterministic for a seed, different for another', () => {
  assert.deepEqual(generateCrew(42), generateCrew(42));
  assert.notDeepEqual(generateCrew(42), generateCrew(43));
});

test('4 members, 180 records each, hero exists', () => {
  assert.equal(crew.length, 4);
  for (const m of crew) {
    assert.equal(m.records.length, 180);
    m.records.forEach((r, i) => assert.equal(r.day, i + 1));
  }
  assert.ok(by(HERO_ID).hero);
  assert.equal(DEMO_DAY, 120);
  assert.ok(MISSION_EVENTS.some((e) => e.day === 150 && e.who === 'all'));
});

test('passport complete and sources valid', () => {
  for (const s of SIGNALS) assert.ok(PASSPORT.some((p) => p.signal === s), s);
  for (const p of PASSPORT) {
    for (const k of ['signal', 'unit', 'label', 'baseline', 'noise', 'drift', 'events', 'source', 'basis']) {
      assert.equal(typeof p[k], 'string');
      assert.ok(p[k].trim().length > 0, `${p.signal}.${k}`);
    }
    assert.ok(p.source in SOURCES, p.source);
    assert.ok(['NASA HRP', 'Clinical norm', 'Demo assumption', 'Partner agency'].includes(p.basis));
  }
});

test('physiological bounds', () => {
  const B = { spo2: [70, 100], temp: [34, 42], hr: [30, 200], sbp: [70, 250], dbp: [40, 150], rr: [6, 40], sleepH: [0, 14], mood: [1, 5], headache: [0, 3], glucose: [40, 400], mass: [30, 200], exerciseMin: [0, 300], doseMSv: [0, 100] };
  for (const m of crew) for (const r of m.records) for (const [k, [lo, hi]] of Object.entries(B)) {
    if (r[k] === null) continue;
    assert.ok(r[k] >= lo && r[k] <= hi, `${m.id} d${r.day} ${k}=${r[k]}`);
  }
});

test('gaps and types', () => {
  for (const m of crew) {
    const suit = m.records.filter((r) => r.hr === null);
    assert.equal(suit.length, 2);
    for (const r of m.records) {
      if ((r.day >= 8 && r.day <= 10) || (r.day >= 115 && r.day <= 130)) for (const k of SIGNALS) assert.notEqual(r[k], null, `${m.id} d${r.day} ${k}`);
      if (r.day === 140) assert.notEqual(r.mood, null);
      if (r.mood !== null) assert.ok(Number.isInteger(r.mood));
      if (r.sbp !== null) assert.ok(Number.isInteger(r.sbp));
      if (r.vision !== null) assert.ok(r.vision === 0 || r.vision === 1);
    }
  }
});

test('radiation baseline and day-150 solar particle event', () => {
  for (const m of crew) {
    const e = m.records[149].doseMSv;
    assert.ok(e >= 25 && e <= 35, `${m.id} ${e}`);
    assert.ok(Math.abs(mean(m.id, 'doseMSv', 1, 149) - 1.8) < 0.1);
  }
});

test('maya day 10 is fully normal', () => {
  const r = rec('maya', 10);
  assert.ok(r.sbp < 125 && r.dbp < 82);
  assert.ok(r.hr >= 50 && r.hr <= 90);
  assert.ok(r.spo2 >= 96);
  assert.ok(r.temp >= 36.2 && r.temp <= 37.4);
  assert.ok(r.glucose >= 75 && r.glucose <= 98);
  assert.equal(r.vision, 0);
  assert.ok(r.headache <= 1);
  for (let d = 8; d <= 10; d++) {
    assert.ok(rec('maya', d).sleepH >= 7.0, `sleep d${d}`);
    assert.ok(rec('maya', d).mood >= 3, `mood d${d}`);
  }
  for (let d = 4; d <= 10; d++) assert.ok(rec('maya', d).exerciseMin >= 70, `ex d${d}`);
});

test('maya story: drift by day 120 and recovery', () => {
  for (let d = 117; d <= 120; d++) assert.ok(rec('maya', d).sbp >= 130, `sbp d${d}`);
  const s120 = rec('maya', 120).sbp;
  assert.ok(s120 >= 132 && s120 <= 136);
  assert.ok(mean('maya', 'sleepH', 118, 120) < 7.0);
  assert.ok(mean('maya', 'mood', 118, 120) <= 2.5);
  for (let d = 58; d <= 64; d++) assert.ok(rec('maya', d).exerciseMin >= 10 && rec('maya', d).exerciseMin <= 25);
  for (let d = 124; d <= 128; d++) assert.ok(rec('maya', d).sbp >= 130);
  assert.ok(mean('maya', 'sbp', 138, 180) < 127);
  assert.ok(mean('maya', 'sleepH', 128, 135) > 6.9);
  assert.ok(mean('maya', 'mood', 133, 137) >= 3);
});

test('sofia on-call and kenji treadmill', () => {
  assert.ok(mean('sofia', 'sleepH', 118, 120) < 7);
  for (let d = 116; d <= 122; d++) assert.ok(rec('sofia', d).sleepH >= 5.7 && rec('sofia', d).sleepH <= 6.4);
  for (let d = 104; d <= 112; d++) assert.ok(rec('kenji', d).exerciseMin >= 15 && rec('kenji', d).exerciseMin <= 30);
  assert.ok(mean('kenji', 'exerciseMin', 114, 120) >= 60);
});
