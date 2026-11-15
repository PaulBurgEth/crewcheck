// Cabin environment: four parameters shown on the Crew screen, plus radiation from the radiation engine.
// Limits are Earth indoor references (home or workplace), not spacecraft norms; context: NASA HRP closed environments.
export const CABIN_PARAMS = [
  { id: 'co2', label: 'CO2', unit: 'ppm', icon: 'co2', hi: 1000, word: 'CO2 high', action: 'Check CO2 scrubber', d: 0, src: 'hc-co2', note: '24-hour average, homes' },
  { id: 'noise', label: 'Noise', unit: 'dBA', icon: 'noise', hi: 85, word: 'Noise high', action: 'Check fans', d: 0, src: 'niosh-noise', note: '8-hour workday average' },
  { id: 'cabinTemp', label: 'Temp', unit: '°C', icon: 'thermo', lo: 20, hi: 24.4, word: 'Temp off', action: 'Check thermal control', d: 1, src: 'osha-temp', note: 'offices, 68-76 °F' },
  { id: 'light', label: 'Light', title: 'Light (visible spectrum)', unit: 'lux', icon: 'sun', lo: 323, word: 'Light low', action: 'Check cabin lights', d: 0, src: 'osha-light', note: 'offices, 30 foot-candles' },
];
export const CABIN_SOURCE = 'nasa-closed-env';
export const RADIATION_SOURCES = ['swri-rad', 'csa-radiation'];

export const limitText = (p) => (p.lo != null && p.hi != null ? `${p.lo}-${p.hi} ${p.unit}` : p.hi != null ? `≤ ${p.hi} ${p.unit}` : `≥ ${p.lo} ${p.unit}`);
