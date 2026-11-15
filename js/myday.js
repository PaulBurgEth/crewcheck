// "My day" for the astronaut: what the rule engine's results ask this person to do today.
// No new decisions: the next step is read from the fired rules and the escalation tier. No DOM here.

// Steps that belong to the crew medic or the flight surgeon; never offered as the astronaut's own task.
export const CLINICAL = new Set(['medic-now', 'eye-check']);

const MEASURE = { sbp: 'blood pressure', dbp: 'blood pressure', hr: 'pulse', spo2: 'oxygen', rr: 'breathing', glucose: 'glucose', temp: 'temperature' };
const MEASURE_WHY = {
  sbp: 'Pressure ran above your usual', dbp: 'Pressure ran above your usual', hr: 'Pulse ran outside your range',
  spo2: 'Oxygen read low', rr: 'Breathing ran fast at rest', glucose: 'Glucose out of range', temp: 'Temperature out of range',
};

function stepOf(f) {
  if (f.action === 're-measure') {
    return { id: 'remeasure', icon: 'cuff', text: `Re-measure ${MEASURE[f.signal] || 'it'}`, why: `${MEASURE_WHY[f.signal] || 'One reading was off'}; a second reading confirms it` };
  }
  if (f.action === 'light-schedule') return { id: 'sleep', icon: 'moon', text: 'Keep sleep schedule', why: 'Under 7 h sleep for three days; a fixed bedtime helps' };
  if (f.action === 'talk') return { id: 'talk', icon: 'people', text: 'Talk with crew', why: 'Mood low for three days; talking early helps' };
  if (f.action === 'exercise') {
    return { id: 'train', icon: 'run', text: 'Train 90 min', why: f.signal === 'mass' ? 'Body mass below your usual; training protects muscle' : 'Training below plan this week' };
  }
  return null;
}

// v from escalate(), ev from evaluate(), record = the day record, marks = Set of task ids ticked today.
export function myDayPlan({ v, ev, record = {}, marks = new Set(), checkedIn = false }) {
  const calm = v.status !== 'yellow' && v.status !== 'red';
  let next = null;
  let clinical = false;
  if (!calm) {
    for (const f of ev.fired) {
      if (CLINICAL.has(f.action)) { clinical = true; continue; }
      if (!next) next = stepOf(f);
    }
  }
  let waiting = null;
  if (!calm && (v.tier === 'crew' || clinical)) waiting = 'Waiting for crew medic';
  else if (!calm && v.tier === 'earth') waiting = 'Waiting for flight surgeon';

  const autoTrain = Number(record.exerciseMin) >= 90;
  const tasks = [
    { id: 'suit', icon: 'suit', text: 'Suit on', done: record.hr != null, auto: true },
    { id: 'checkin', icon: 'check', text: 'Check-in', done: !!checkedIn },
    { id: 'train', icon: 'run', text: 'Train 90 min', done: autoTrain || marks.has('train'), auto: autoTrain },
  ];
  if (next && next.id !== 'train') tasks.push({ id: next.id, icon: next.icon, text: next.text, done: marks.has(next.id) });
  if (next) next = { ...next, done: tasks.find((t) => t.id === next.id).done };
  return { calm, next, waiting, tasks };
}

export function dayProgress(tasks) {
  const done = tasks.filter((t) => t.done).length;
  return { done, total: tasks.length, closed: tasks.length > 0 && done === tasks.length };
}
