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

// Story days have answers; nearby days reuse the closest earlier answer if the same systems are flagged.
export function findAdvice(personId, day, flaggedSystems, flaggedAt) {
  for (let d = day; d >= day - 10; d--) {
    const a = ADVICE[`${personId}:${d}`];
    if (!a) continue;
    if (d === day || (flaggedAt && flaggedAt(d) === flaggedSystems)) return { ...a, day: d, origin: 'precomputed' };
  }
  return null;
}
