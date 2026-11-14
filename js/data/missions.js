// oneWayMin: one-way signal delay. careDays: time to real medical care (return home).
export const MISSIONS = [
  { id: 'iss', label: 'ISS', place: 'Low Earth orbit', oneWayMin: 0, careLabel: 'hours home', delaySource: 'demo-assumption', careSource: 'demo-assumption' },
  { id: 'moon', label: 'Moon', place: 'Lunar orbit', oneWayMin: 1.3 / 60, careLabel: '~3 days home', delaySource: 'demo-assumption', careSource: 'demo-assumption' },
  { id: 'mars-transit', label: 'Mars transit', place: 'Deep space', oneWayMin: 20, careLabel: 'months home', delaySource: 'nasa-distance', careSource: 'nasa-distance' },
  { id: 'mars', label: 'Mars surface', place: 'Mars', oneWayMin: 20, careLabel: 'launch window home', tabNote: 'launch-window return', delaySource: 'nasa-distance', careSource: 'demo-assumption' },
];

export const DEFAULT_MISSION = 'mars-transit';
export const missionById = (id) => MISSIONS.find((m) => m.id === id) || MISSIONS[2];
// Earth can answer within a minute: the flight surgeon can take part in the decision.
export const isReachable = (m) => m.oneWayMin * 2 < 1;
