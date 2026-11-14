// Rules decide. Each rule is data with a source; the Sources screen is built from this file.
// kind: 'abs' compares the window mean; 'delta' compares mean minus personal norm; 'pct' compares % change from personal norm.
// window: days in the rolling mean. op: gte | lte | gt | lt.
// source: id in SOURCES for the threshold itself; context: NASA page that explains why this matters in space.
const R = (id, system, signal, level, op, value, o = {}) => ({ id, system, signal, level, op, value, kind: 'abs', window: 1, ...o });

export const RULES = [
  // Heart & circulation
  R('sbp-y', 'heart', 'sbp', 'yellow', 'gte', 130, { source: 'aha-bp', context: 'nasa-cardio', title: 'Systolic pressure 130 or higher', action: 're-measure' }),
  R('sbp-r', 'heart', 'sbp', 'red', 'gt', 180, { source: 'aha-bp', context: 'nasa-cardio', title: 'Systolic pressure above 180 (severe range)', action: 'medic-now' }),
  R('dbp-y', 'heart', 'dbp', 'yellow', 'gte', 90, { source: 'aha-bp', context: 'nasa-cardio', title: 'Diastolic pressure 90 or higher', action: 're-measure' }),
  R('dbp-r', 'heart', 'dbp', 'red', 'gt', 120, { source: 'aha-bp', context: 'nasa-cardio', title: 'Diastolic pressure above 120 (severe range)', action: 'medic-now' }),
  R('sbp-drift', 'heart', 'sbp', 'yellow', 'gte', 12, { kind: 'delta', window: 3, source: 'demo-assumption', context: 'nasa-cardio', title: 'Systolic 12+ above personal norm (3-day mean)', action: 're-measure' }),
  R('hr-y', 'heart', 'hr', 'yellow', 'gte', 100, { source: 'clinical-vitals', context: 'nasa-cardio', title: 'Resting pulse 100 or higher', action: 're-measure' }),
  R('hr-r', 'heart', 'hr', 'red', 'gte', 130, { source: 'demo-assumption', context: 'nasa-cardio', title: 'Resting pulse 130 or higher', action: 'medic-now' }),
  R('hr-low', 'heart', 'hr', 'yellow', 'lte', 40, { source: 'demo-assumption', context: 'nasa-cardio', title: 'Resting pulse 40 or lower', action: 're-measure' }),
  // Lungs & oxygen
  R('spo2-y', 'lungs', 'spo2', 'yellow', 'lte', 94, { source: 'clinical-spo2', context: 'nasa-hazards', title: 'Blood oxygen below the 95-100% normal range', action: 're-measure' }),
  R('spo2-r', 'lungs', 'spo2', 'red', 'lte', 88, { source: 'clinical-spo2', context: 'nasa-hazards', title: 'Blood oxygen 88% or lower (immediate care)', action: 'medic-now' }),
  R('rr-y', 'lungs', 'rr', 'yellow', 'gte', 22, { source: 'demo-assumption', context: 'nasa-hazards', title: 'Breathing rate 22 or higher at rest (normal 12-18)', action: 're-measure' }),
  R('rr-r', 'lungs', 'rr', 'red', 'gte', 30, { source: 'demo-assumption', context: 'nasa-hazards', title: 'Breathing rate 30 or higher at rest', action: 'medic-now' }),
  // Eyes & brain (SANS)
  R('vision-y', 'eyes', 'vision', 'yellow', 'gte', 1, { source: 'nasa-sans', context: 'nasa-sans', title: 'New change in vision', action: 'eye-check' }),
  R('headache-y', 'eyes', 'headache', 'yellow', 'gte', 3, { source: 'demo-assumption', context: 'nasa-sans', title: 'Severe headache', action: 'eye-check' }),
  // Sleep
  R('sleep-y', 'sleep', 'sleepH', 'yellow', 'lt', 7, { window: 3, source: 'cdc-sleep', context: 'nasa-sleep', title: 'Under 7 h sleep (3-day mean)', action: 'light-schedule' }),
  R('sleep-r', 'sleep', 'sleepH', 'red', 'lt', 5, { window: 3, source: 'demo-assumption', context: 'nasa-sleep', title: 'Under 5 h sleep (3-day mean)', action: 'medic-now' }),
  // Mind
  R('mood-y', 'mind', 'mood', 'yellow', 'lte', 2.5, { window: 3, source: 'demo-assumption', context: 'nasa-isolation', title: 'Low mood (3-day mean 2.5 of 5 or lower)', action: 'talk' }),
  R('mood-r', 'mind', 'mood', 'red', 'lte', 1.5, { window: 3, source: 'demo-assumption', context: 'nasa-behavior', title: 'Very low mood (3-day mean 1.5 of 5 or lower)', action: 'medic-now' }),
  // Bones & muscle
  R('exercise-y', 'bones', 'exerciseMin', 'yellow', 'lt', 60, { window: 7, source: 'demo-assumption', context: 'nasa-fitness', title: 'Under 60 min exercise a day (7-day mean; NASA plans 1.5 h)', action: 'exercise' }),
  R('exercise-r', 'bones', 'exerciseMin', 'red', 'lt', 30, { window: 7, source: 'demo-assumption', context: 'nasa-fitness', title: 'Under 30 min exercise a day (7-day mean)', action: 'exercise' }),
  R('mass-y', 'bones', 'mass', 'yellow', 'lte', -3, { kind: 'pct', window: 3, source: 'demo-assumption', context: 'nasa-fitness', title: 'Body mass 3% below personal norm', action: 'exercise' }),
  R('mass-r', 'bones', 'mass', 'red', 'lte', -5, { kind: 'pct', window: 3, source: 'demo-assumption', context: 'nasa-fitness', title: 'Body mass 5% below personal norm', action: 'medic-now' }),
  // Metabolic & immune
  R('glu-y', 'metabolic', 'glucose', 'yellow', 'gte', 100, { source: 'ada-glucose', context: 'nasa-risks', title: 'Fasting glucose 100 or higher (prediabetes range)', action: 're-measure' }),
  R('glu-r', 'metabolic', 'glucose', 'red', 'gte', 126, { source: 'ada-glucose', context: 'nasa-risks', title: 'Fasting glucose 126 or higher (diabetes range)', action: 'medic-now' }),
  R('glu-low-y', 'metabolic', 'glucose', 'yellow', 'lt', 70, { source: 'ada-hypo', context: 'nasa-risks', title: 'Glucose below 70', action: 're-measure' }),
  R('glu-low-r', 'metabolic', 'glucose', 'red', 'lt', 54, { source: 'demo-assumption', context: 'nasa-risks', title: 'Glucose below 54', action: 'medic-now' }),
  R('temp-y', 'metabolic', 'temp', 'yellow', 'gte', 38, { source: 'demo-assumption', context: 'nasa-immune', title: 'Temperature 38 °C or higher', action: 're-measure' }),
  R('temp-r', 'metabolic', 'temp', 'red', 'gte', 39.5, { source: 'demo-assumption', context: 'nasa-immune', title: 'Temperature 39.5 °C or higher', action: 'medic-now' }),
  R('temp-low', 'metabolic', 'temp', 'yellow', 'lte', 35.5, { source: 'demo-assumption', context: 'nasa-immune', title: 'Temperature 35.5 °C or lower', action: 're-measure' }),
];

// Linked signals (several yellows together raise the tier earlier than each alone).
export const COMBOS = [
  { id: 'strain', systems: ['sleep', 'mind', 'heart'], min: 3, source: 'demo-assumption', context: 'nasa-isolation', title: 'Sleep, mood and blood pressure off together' },
];

// Short action texts. confidence of the action comes from the rule source kind.
export const ACTIONS = {
  're-measure': 'Re-measure tomorrow',
  'medic-now': 'Crew medic check now',
  'eye-check': 'Eye check with crew medic',
  'light-schedule': 'Light and sleep schedule',
  'talk': 'Talk with crew, private call to family',
  'exercise': 'Back to 1.5 h exercise a day',
};

export const SYSTEMS = [
  { id: 'heart', label: 'Heart', signals: ['sbp', 'dbp', 'hr'] },
  { id: 'lungs', label: 'Lungs', signals: ['spo2', 'rr'] },
  { id: 'eyes', label: 'Eyes', signals: ['vision', 'headache'] },
  { id: 'sleep', label: 'Sleep', signals: ['sleepH'] },
  { id: 'mind', label: 'Mind', signals: ['mood'] },
  { id: 'bones', label: 'Bones', signals: ['exerciseMin', 'mass'] },
  { id: 'metabolic', label: 'Metabolic', signals: ['glucose', 'temp'] },
];
