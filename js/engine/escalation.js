import { COMBOS, ACTIONS } from '../data/rules.js';
import { SOURCES } from '../data/sources.js';
import { isReachable } from '../data/missions.js';

const TIERS = ['none', 'self', 'crew', 'earth'];

export function replyMinutes(mission) {
  return Math.round(mission.oneWayMin * 2 * 10) / 10;
}

export function delayLabel(mission) {
  if (isReachable(mission)) return 'reply in seconds';
  return `reply ≥ ${Math.round(mission.oneWayMin * 2)} min`;
}

// Established: rule from NASA or a clinical norm. Hypothesis: demo assumption or personal trend. Ask: decision for a human.
export const confidenceOf = (sourceId) => (['nasa', 'clinical', 'agency'].includes(SOURCES[sourceId]?.kind) ? 'established' : 'hypothesis');

export function combosFired(evaluation) {
  return COMBOS.filter((c) => c.systems.filter((s) => evaluation.systems[s]?.status === 'yellow' || evaluation.systems[s]?.status === 'red').length >= c.min);
}

// evaluation from evaluate(); mission from MISSIONS; opts.followupFailed: a countermeasure did not work.
// Returns who acts now (tier), who is notified, a one-line headline and short actions.
export function escalate(evaluation, mission, { followupFailed = false } = {}) {
  const status = evaluation.overall;
  const reach = isReachable(mission);
  const combos = combosFired(evaluation);
  const reply = { sent: false, replyMin: replyMinutes(mission), label: delayLabel(mission) };
  const actions = [];
  const seen = new Set();
  for (const f of evaluation.fired) {
    const key = f.action;
    if (seen.has(key)) continue;
    seen.add(key);
    actions.push({ text: ACTIONS[key], confidence: confidenceOf(f.source), ruleId: f.id });
  }

  if (status !== 'yellow' && status !== 'red') {
    return { tier: 'none', notify: [], headline: 'All clear', sub: 'Keep the routine', actions: [], combos, reply, status };
  }

  let tier;
  let notify;
  let headline;
  let sub;
  if (status === 'red') {
    tier = 'crew';
    if (reach) {
      notify = ['earth'];
      headline = 'Crew medic now';
      sub = 'Flight surgeon on the line';
    } else {
      notify = ['earth'];
      reply.sent = true;
      headline = 'Crew medic now · act on board';
      sub = `Report sent to Earth · ${reply.label}`;
    }
  } else if (reach) {
    tier = 'earth';
    notify = [];
    headline = 'Ask the flight surgeon';
    sub = 'Earth is close · reply in seconds';
  } else {
    tier = 'self';
    notify = ['earth'];
    reply.sent = true;
    headline = 'Act now yourself';
    sub = `Report sent to Earth · ${reply.label}`;
  }

  // Far from Earth, linked signals or a failed countermeasure bring in the crew medic earlier.
  if (!reach && tier === 'self' && (combos.length || followupFailed)) {
    tier = 'crew';
    headline = followupFailed ? 'Countermeasure did not work · crew medic' : 'Linked signals · crew medic';
  }
  if (tier === 'crew' || tier === 'earth') actions.push({ text: tier === 'earth' ? 'Ask the flight surgeon' : 'Crew medic review', confidence: 'ask', ruleId: null });
  if (reach && status === 'red' && mission.id === 'moon') actions.push({ text: 'Prepare return option (~3 days)', confidence: 'ask', ruleId: null });

  return { tier, notify, headline, sub, actions, combos, reply, status, tierIndex: TIERS.indexOf(tier) };
}
