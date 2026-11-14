import { test } from 'node:test';
import assert from 'node:assert/strict';
import { linkOf } from '../js/viz/scene.js';
import { missionById } from '../js/data/missions.js';

test('Earth link: path length and travel time differ for ISS and Mars transit', () => {
  const iss = linkOf(missionById('iss'));
  const mars = linkOf(missionById('mars-transit'));
  assert.ok(mars.len > iss.len * 4, 'Mars line is much longer');
  assert.ok(mars.roundMs > iss.roundMs, 'Mars envelope travels longer');
  assert.ok(mars.oneWayS > iss.oneWayS);
  assert.equal(iss.far, false);
  assert.equal(mars.far, true);
});

test('Earth link: delay words per distance', async () => {
  // earth.js reads state at render time only; eachWay is pure.
  const { eachWay } = await import('../js/screens/earth.js');
  assert.equal(eachWay(missionById('iss')), 'Live link');
  assert.equal(eachWay(missionById('moon')), '1.3 s each way');
  assert.equal(eachWay(missionById('mars-transit')), '20 min each way');
});

test('Mars surface carries a return note; Mars transit does not', () => {
  assert.equal(missionById('mars').tabNote, 'launch-window return');
  assert.equal(missionById('mars-transit').tabNote, undefined);
});
