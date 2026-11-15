// Cabin environment: four parameters shown on the Crew screen.
// All limits are demo assumptions (no source with numbers in this build); context: NASA HRP closed environments.
export const CABIN_PARAMS = [
  { id: 'co2', label: 'CO2', unit: 'mmHg', icon: 'co2', hi: 4, word: 'CO2 high', action: 'Check CO2 scrubber', d: 1 },
  { id: 'noise', label: 'Noise', unit: 'dBA', icon: 'noise', hi: 65, word: 'Noise high', action: 'Check fans', d: 0 },
  { id: 'cabinTemp', label: 'Temp', unit: '°C', icon: 'thermo', lo: 18, hi: 27, word: 'Temp off', action: 'Check thermal control', d: 1 },
  { id: 'light', label: 'Light', unit: 'lux', icon: 'sun', lo: 100, word: 'Light low', action: 'Check cabin lights', d: 0 },
];
export const CABIN_SOURCE = 'nasa-closed-env';
export const CABIN_LIMIT_SOURCE = 'demo-assumption';

export const limitText = (p) => (p.lo != null && p.hi != null ? `${p.lo}-${p.hi} ${p.unit}` : p.hi != null ? `≤ ${p.hi} ${p.unit}` : `≥ ${p.lo} ${p.unit}`);
