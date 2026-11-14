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
    const pv = d > 1 ? verdictFor(personId, d - 1, missionId) : null;
    const prevStatus = pv ? pv.v.status : 'green';
    const fired = [...new Set(ev.fired.map((f) => f.id))];
    const sysKey = (e) => Object.entries(e.systems).filter(([, x]) => flagged(x.status)).map(([k]) => k).join();
    const prevSys = pv ? sysKey(pv.ev) : '';
    const notify = v.reply.sent || v.tier === 'earth';
    // A message goes to Earth only when something changes; unchanged days fold into the last message.
    const changed = (flagged(status) && !flagged(prevStatus)) || !pv || pv.v.tier !== v.tier || prevSys !== sysKey(ev);
    const last = entries[entries.length - 1];
    if ((notify || flagged(status)) && (changed || !last)) {
      if (notify) summary.sent++;
      entries.push({
        day: d, lastDay: d, repeats: 0, status, tier: v.tier, headline: v.headline, fired,
        sentAtMin: SENT_AT_MIN, arrivesAtMin: SENT_AT_MIN + oneWayMin, replyAtMin: SENT_AT_MIN + 2 * oneWayMin,
      });
    } else if (last && (notify || flagged(status))) {
      last.lastDay = d;
      last.repeats++;
    }
  }
  return { personId, missionId, from, to: day, oneWayMin, entries, summary };
}

export function packetSize(entries) {
  return new TextEncoder().encode(JSON.stringify(entries)).length;
}
