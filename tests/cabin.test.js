import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { generateCabin, CABIN_EPISODE } from '../js/demo/cabin.js';
import { generateCrew } from '../js/demo/generator.js';
import { commonCause, cabinOut, radiationCase } from '../js/engine/cabin.js';
import { CABIN_PARAMS } from '../js/data/cabin.js';
import { PASSPORT } from '../js/demo/passport.js';
import { SOURCES } from '../js/data/sources.js';
import { verdictFor, cabinCase } from '../js/state.js';
import { MISSIONS } from '../js/data/missions.js';

const cabin = generateCabin();
const crew = generateCrew();
const day = (d) => crew.map((c) => ({ id: c.id, record: c.records[d - 1] }));
const EP = [];
for (let d = CABIN_EPISODE.from; d <= CABIN_EPISODE.to; d++) EP.push(d);

test('Maya: status and tier on story days match main', () => {
  const ref = JSON.parse(readFileSync(new URL('./fixtures/maya-main.json', import.meta.url), 'utf8'));
  assert.ok(Object.keys(ref).length >= MISSIONS.length * 30);
  for (const [k, want] of Object.entries(ref)) {
    const [mid, d] = k.split(':');
    const { v } = verdictFor('maya', Number(d), mid);
    assert.deepEqual([v.status, v.tier], want, k);
  }
});

test('episode days avoid the hero story days and spare Maya', () => {
  for (const d of EP) assert.ok(!(d <= 10 || (d >= 55 && d <= 70) || (d >= 100 && d <= 135) || d === 180), String(d));
  assert.ok(!CABIN_EPISODE.who.includes('maya'));
  assert.ok(CABIN_EPISODE.who.length >= 2 && CABIN_EPISODE.who.length <= 3);
});

test('crew series unchanged outside the episode; Maya unchanged everywhere (vs main)', () => {
  const ref = JSON.parse(readFileSync(new URL('./fixtures/crew-main-hash.json', import.meta.url), 'utf8'));
  const sha = (x) => createHash('sha256').update(JSON.stringify(x)).digest('hex');
  for (const c of crew) assert.equal(sha(c.records.filter((r) => !EP.includes(r.day))), ref[c.id], c.id);
  assert.equal(sha(crew.find((c) => c.id === 'maya').records), ref['maya-full']);
});

test('common cause fires on every episode day with 2+ crew', () => {
  for (const d of EP) {
    const cc = commonCause(day(d), cabin[d - 1]);
    assert.ok(cc, `day ${d}`);
    assert.equal(cc.param, 'co2');
    assert.ok(cc.who.length >= 2);
    assert.ok(!cc.who.includes('maya'));
    assert.equal(cc.clinical, false);
    assert.equal(cc.approval, false);
    assert.equal(cc.action, 'Check CO2 scrubber');
    assert.deepEqual(cabinCase(d)?.who, cc.who);
  }
});

test('does not fire when only one person has the symptom', () => {
  const d = EP[0];
  const one = day(d).map((m, i) => ({ id: m.id, record: { ...m.record, headache: i === 1 ? 1 : 0, sleepH: 7.5 } }));
  assert.equal(commonCause(one, cabin[d - 1]), null);
});

test('does not fire when the cabin is in range', () => {
  const two = day(EP[0]).map((m) => ({ id: m.id, record: { ...m.record, headache: 1 } }));
  for (let d = 1; d <= 180; d++) {
    if (EP.includes(d)) continue;
    assert.equal(cabinOut(cabin[d - 1]).length, 0, `cabin day ${d}`);
    assert.equal(commonCause(two, cabin[d - 1]), null, `day ${d}`);
  }
});

test('cabin values physically possible, deterministic', () => {
  const B = { co2: [300, 20000], noise: [30, 90], cabinTemp: [10, 35], light: [0, 2000] };
  assert.equal(cabin.length, 180);
  assert.deepEqual(generateCabin(), cabin);
  for (const r of cabin) for (const [k, [lo, hi]] of Object.entries(B)) assert.ok(r[k] >= lo && r[k] <= hi, `d${r.day} ${k}=${r[k]}`);
});

test('every cabin series has a passport row with an Earth indoor reference', () => {
  for (const p of CABIN_PARAMS) {
    const row = PASSPORT.find((x) => x.signal === p.id);
    assert.ok(row, p.id);
    assert.ok(row.source in SOURCES);
    assert.equal(row.source, p.src);
    assert.equal(row.basis, 'Earth indoor reference');
    assert.equal(SOURCES[p.src].kind, 'earth');
    assert.match(SOURCES[p.src].title, /not a spacecraft norm/);
    assert.match(SOURCES[p.src].url, /^https:\/\//);
  }
  assert.equal(SOURCES['nasa-closed-env'].url, 'https://www.nasa.gov/hrp/hazard-hostile-closed-environments/');
});

test('radiation from the radiation engine: spike on the solar particle event day, calm otherwise', () => {
  const members = crew.map((c) => ({ id: c.id, records: c.records }));
  const spe = radiationCase(members, 150);
  assert.ok(spe.event);
  assert.equal(spe.event.who.length, 4);
  assert.equal(spe.event.action, 'Move to shelter');
  assert.equal(spe.event.clinical, false);
  assert.equal(spe.event.approval, false);
  assert.ok(spe.today > 20);
  for (const d of [40, 90, 120, 149, 151]) assert.equal(radiationCase(members, d).event, null, String(d));
  const d90 = radiationCase(members, 90);
  assert.ok(d90.today > 1 && d90.today < 3 && d90.total > 100);
});
