// "Why?" texts stored on board: they work without a link to Earth.
// Each line points to a source id; only facts read on the cited page.
export const EXPLAIN = {
  heart: {
    what: 'Blood pressure and resting pulse, from the suit',
    space: 'Without gravity, body fluids shift toward the head',
    spaceSource: 'nasa-gravity',
  },
  lungs: {
    what: 'Blood oxygen and breathing rate, from the suit',
    space: 'A hostile, closed environment is one of five hazards of spaceflight',
    spaceSource: 'nasa-hazards',
  },
  eyes: {
    what: 'Vision change and headache, from check-in',
    space: 'About 70% of ISS astronauts show swelling at the back of the eye (SANS)',
    spaceSource: 'nasa-sans',
  },
  sleep: {
    what: 'Sleep hours, from the wrist actigraph',
    space: '16 sunrises a day; light and a regular schedule are the countermeasures',
    spaceSource: 'nasa-sleep',
  },
  mind: {
    what: 'Mood, one tap at check-in',
    space: 'Isolation and confinement is one of five hazards of spaceflight',
    spaceSource: 'nasa-hazards',
  },
  bones: {
    what: 'Exercise minutes and body mass',
    space: 'Bones lose 1-1.5% density a month; crews train about 1.5 h a day, 6-7 days a week',
    spaceSource: 'nasa-gravity',
    extraSource: 'nasa-fitness',
  },
  metabolic: {
    what: 'Fasting glucose and temperature',
    space: 'Medical care is far away, so small shifts are re-checked early',
    spaceSource: 'demo-assumption',
  },
};

export const SIGNAL_LABEL = {
  sbp: ['Systolic', 'mmHg'], dbp: ['Diastolic', 'mmHg'], hr: ['Pulse', 'bpm'], spo2: ['SpO2', '%'], rr: ['Breathing', '/min'],
  temp: ['Temperature', '°C'], sleepH: ['Sleep', 'h'], mood: ['Mood', '/5'], vision: ['Vision change', ''], headache: ['Headache', '/3'],
  exerciseMin: ['Exercise', 'min'], glucose: ['Glucose', 'mg/dL'], mass: ['Mass', 'kg'], doseMSv: ['Dose', 'mSv'],
};
