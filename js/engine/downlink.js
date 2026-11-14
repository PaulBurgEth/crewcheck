import { missionById } from '../data/missions.js';

const SENT_AT_MIN = 8 * 60;
const flagged = (s) => s === 'yellow' || s === 'red';

export function buildDownlink(personId, day, missionId, verdictFor, { period = 14 } = {}) {
  const oneWayMin = missionById(missionId).oneWayMin;
  const from = Math.max(1, day - period + 1);
  const entries = [];
  const summary = { days: 0, green: 0, yellow: 0, red: 0, systemsFlagged: {}, sent: 0 };
  for (let d = from; d <= day; d++) {
    const { ev, v } = verdictFor(personId, d, missionId);
    const status = v.status;
    summary.days++;
    if (status in summary && status !== 'days' && status !== 'sent') summary[status]++;
    for (const [id, s] of Object.entries(ev.systems)) {
      if (flagged(s.status)) summary.systemsFlagged[id] = (summary.systemsFlagged[id] || 0) + 1;
    }
    const prev = d > 1 ? verdictFor(personId, d - 1, missionId).v.status : 'green';
    const episodeStart = flagged(status) && !flagged(prev);
    if (v.reply.sent) summary.sent++;
    if (v.reply.sent || v.tier === 'earth' || episodeStart) {
      entries.push({
        day: d, status, tier: v.tier, headline: v.headline,
        fired: [...new Set(ev.fired.map((f) => f.id))],
        sentAtMin: SENT_AT_MIN, arrivesAtMin: SENT_AT_MIN + oneWayMin, replyAtMin: SENT_AT_MIN + 2 * oneWayMin,
      });
    }
  }
  return { personId, missionId, from, to: day, oneWayMin, entries, summary };
}

export function packetSize(entries) {
  return new TextEncoder().encode(JSON.stringify(entries)).length;
}
