import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDownlink, packetSize } from '../js/engine/downlink.js';
import { verdictFor } from '../js/state.js';
import { HERO_ID } from '../js/demo/generator.js';

test('hero Mars transit day 120 has yellow days and sent messages', () => {
  const r = buildDownlink(HERO_ID, 120, 'mars-transit', verdictFor);
  assert.ok(r.summary.yellow >= 1);
  assert.ok(r.summary.sent >= 1);
  assert.equal(r.summary.days, 14);
  assert.ok(r.entries.length >= 1);
  for (const e of r.entries) assert.equal(e.replyAtMin - e.sentAtMin, 40);
  assert.ok(packetSize(r.entries) > 0);
});

test('ISS reply is under a minute', () => {
  const r = buildDownlink(HERO_ID, 120, 'iss', verdictFor);
  for (const e of r.entries) assert.ok(e.replyAtMin - e.sentAtMin < 1);
});

test('healthy crew member day 10 sends nothing (hero is yellow days 1-9 in the data)', () => {
  const r = buildDownlink('sofia', 10, 'mars-transit', verdictFor);
  assert.equal(r.summary.sent, 0);
  assert.equal(r.entries.length, 0);
});
