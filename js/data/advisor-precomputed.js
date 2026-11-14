// AI-generated (Claude), precomputed for key days of the demo story.
// Input for each answer was only the structured payload (fired rules and numbers), see js/engine/advisor.js.
// The advisor explains; it never sets status or escalation.
export const PRECOMPUTED_LABEL = 'AI-generated (Claude), precomputed';

export const ADVICE = {
  'maya:10': {
    text: 'All systems are inside your personal norm. Adaptation signs from the first week are gone.',
    points: ['Keep 1.5 h exercise a day', 'Keep the sleep window steady'],
  },
  'maya:103': {
    text: 'Sleep has been under 7 hours for three nights. Short sleep often comes before mood and blood pressure changes.',
    points: ['Fix the sleep window for 3 nights', 'Dim cabin light 1 h before sleep', 'Re-check sleep in 3 days'],
  },
  'maya:105': {
    text: 'Short sleep is now joined by low mood. The two often feed each other on long missions.',
    points: ['Keep the fixed sleep window', 'Talk with the crew today', 'Watch blood pressure for a third signal'],
  },
  'maya:113': {
    text: 'Systolic pressure reached 130 while sleep and mood stay low. Three linked signals bring in the crew medic far from Earth.',
    points: ['Crew medic check today', 'Light and sleep schedule', 'Re-measure pressure tomorrow'],
  },
  'maya:130': {
    text: 'Sleep is back near 7 hours and mood has recovered. Systolic pressure is still around 131.',
    points: ['Crew medic follows the pressure', 'Daily pressure at the same time', 'Keep exercise at 1.5 h'],
  },
  'maya:112': {
    text: 'Systolic pressure is rising about 0.5 mmHg a day and may reach 130 in under two weeks. Sleep and mood are drifting the same way.',
    points: ['Re-measure pressure at the same time daily', 'Watch sleep and mood together', 'Mention the trend at the next crew medic check'],
  },
  'maya:120': {
    text: 'Three signals moved together: less sleep, lower mood, higher pressure. Together they are more telling than each alone, so the rules brought in the crew medic.',
    points: ['Light and sleep schedule first', 'Private call home and a crew talk', 'Re-check all three in 7 days'],
  },
  'maya:128': {
    text: 'Sleep is back to target after 7 days. Mood and systolic pressure are still off, so the plan was not enough for them.',
    points: ['Crew medic reviews pressure and mood', 'Keep the sleep schedule that worked', 'Daily pressure readings for a week'],
  },
  'maya:150': {
    text: 'Radiation dose jumped today across the whole crew during a solar particle event. Body signals are inside the norm.',
    points: ['Log the time spent in the shielded area', 'No change to the health plan needed'],
  },
  'sofia:120': {
    text: 'Sleep is short for several nights in a row, matching on-call duty. Other signals are stable.',
    points: ['Hand over night calls for 2 nights', 'Protect one full sleep window', 'Re-check sleep after the duty week'],
  },
  'kenji:108': {
    text: 'Exercise time dropped during treadmill maintenance. Bones and muscles lose condition faster without daily load.',
    points: ['Use the resistance device meanwhile', 'Return to 1.5 h a day when the treadmill is back'],
  },
};

// Three fixed questions under the advisor bubble. No free text input exists anywhere.
export const QUESTIONS = [
  { id: 'why-now', label: 'Why now?' },
  { id: 'wait', label: 'What if I wait?' },
  { id: 'medic', label: 'What should the medic check?' },
];

// Answers to the three questions, same origin and limits as the advice above.
export const ANSWERS = {
  'maya:103': {
    'why-now': 'Your 3-night sleep average fell below 7 hours today, the line set by the CDC norm.',
    wait: 'Short sleep tends to pull mood and blood pressure along. Waiting a week makes a shared drift more likely.',
    medic: 'Nothing for the medic yet. Sleep log and light exposure for the next 3 nights are enough.',
  },
  'maya:105': {
    'why-now': 'Low mood joined short sleep today. Two signals together get more attention than one.',
    wait: 'If blood pressure follows, three linked signals will bring in the crew medic by rule.',
    medic: 'A short talk about workload and sleep. Blood pressure at the same time each morning.',
  },
  'maya:112': {
    'why-now': 'The trend, not today\'s value: systolic pressure rose for 3 weeks while sleep and mood stayed low.',
    wait: 'At this pace systolic pressure reaches 130 in under two weeks and the rules escalate.',
    medic: 'The 3-week pressure trend next to the sleep log. Ask about stress and workload.',
  },
  'maya:113': {
    'why-now': 'Systolic pressure crossed 130 today while sleep and mood were already off. That makes three linked signals.',
    wait: 'Far from Earth the answer takes 40 minutes or more. The rules let the crew act now instead.',
    medic: 'Repeat pressure, seated, after 5 minutes rest. Sleep window and mood over the last week.',
  },
  'maya:120': {
    'why-now': 'Sleep, mood and blood pressure stayed off together for a week. Linked signals bring the crew medic in.',
    wait: 'The drift has lasted two weeks. Waiting keeps all three off; a countermeasure starts tomorrow.',
    medic: 'Pressure trend, sleep log and mood answers side by side. Agree on the light and sleep schedule.',
  },
  'maya:128': {
    'why-now': 'Day 128 is the planned re-check, 7 days after the countermeasure started.',
    wait: 'Sleep recovered, so that part worked. Pressure and mood did not move; waiting will not fix them.',
    medic: 'Daily pressure for a week. A longer talk about mood. Keep the sleep schedule that worked.',
  },
  'maya:130': {
    'why-now': 'Sleep and mood are back, but systolic pressure stays around 131.',
    wait: 'One signal left is less urgent than three. The medic keeps watching it daily.',
    medic: 'Pressure at the same time daily and exercise minutes. Compare with the personal norm.',
  },
  'maya:150': {
    'why-now': 'A solar particle event raised the dose for the whole crew today.',
    wait: 'Body signals are normal. The dose is logged for the mission total; no health action needed.',
    medic: 'Time spent in the shielded area. No change to the health plan.',
  },
  'sofia:120': {
    'why-now': 'Your sleep average dropped under 7 hours during the on-call week.',
    wait: 'The cause is known and ends with the duty week. Re-check sleep after it.',
    medic: 'Hand over two night calls. Sleep log after the duty week.',
  },
  'kenji:108': {
    'why-now': 'Exercise averaged under 60 minutes a day while the treadmill is down.',
    wait: 'Bones and muscle lose condition faster without daily load; the cause ends when the treadmill is back.',
    medic: 'Resistance device minutes and body mass once a week.',
  },
};

// Story days have answers; nearby days reuse the closest earlier answer if the same systems are flagged.
export function findAdvice(personId, day, flaggedSystems, flaggedAt) {
  for (let d = day; d >= day - 10; d--) {
    const a = ADVICE[`${personId}:${d}`];
    if (!a) continue;
    if (d === day || (flaggedAt && flaggedAt(d) === flaggedSystems)) return { ...a, answers: ANSWERS[`${personId}:${d}`] || null, day: d, origin: 'precomputed' };
  }
  return null;
}
