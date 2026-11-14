import { test } from 'node:test';
import assert from 'node:assert/strict';
import { streakInfo } from '../js/viz/badges.js';
import { generateCrew, HERO_ID } from '../js/demo/generator.js';

test('streak: Maya day 120 has 37 days, broken on day 83; week chain has 7 entries', () => {
  const maya = generateCrew().find((c) => c.id === HERO_ID);
  const s = streakInfo(maya.records, 120);
  assert.equal(s.n, 37);
  assert.equal(s.missed, 83);
  assert.equal(s.week.length, 7);
  assert.ok(s.week.every((w) => w === true));
  const d1 = streakInfo(maya.records, 3);
  assert.equal(d1.week.filter((w) => w === null).length, 4);
});
