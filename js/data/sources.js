// Every number in the product points to one of these ids.
// kind: 'nasa' (challenge Resources tab), 'agency' (partner agency), 'clinical' (clinical norm), 'assumption' (demo assumption)
export const SOURCES = {
  'nasa-hazards': { kind: 'nasa', short: 'NASA HRP, 5 Hazards', title: 'NASA Human Research Program: 5 Hazards of Human Spaceflight', url: 'https://www.nasa.gov/hrp/hazards/' },
  'nasa-distance': { kind: 'nasa', short: 'NASA HRP, Distance from Earth', title: 'NASA HRP Hazard: Distance from Earth', url: 'https://www.nasa.gov/hrp/hazard-distance-from-earth/' },
  'nasa-gravity': { kind: 'nasa', short: 'NASA HRP, Gravity Fields', title: 'NASA HRP Hazard: Gravity Fields', url: 'https://www.nasa.gov/hrp/hazard-gravity-fields/' },
  'nasa-radiation': { kind: 'nasa', short: 'NASA HRP, Space Radiation', title: 'NASA HRP Hazard: Space Radiation', url: 'https://www.nasa.gov/hrp/hazard-space-radiation/' },
  'nasa-isolation': { kind: 'nasa', short: 'NASA HRP, Isolation', title: 'NASA HRP Hazard: Isolation and Confinement', url: 'https://www.nasa.gov/hrp/hazard-isolation-and-confinement/' },
  'nasa-risks': { kind: 'nasa', short: 'NASA HRP, Risks', title: 'NASA HRP: Risks of Human Spaceflight', url: 'https://www.nasa.gov/hrp/risks/' },
  'nasa-sans': { kind: 'nasa', short: 'NASA HRP, Risk of SANS', title: 'NASA HRP: Risk of Spaceflight Associated Neuro-ocular Syndrome (SANS)', url: 'https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/' },
  'nasa-fitness': { kind: 'nasa', short: 'NASA HRP, Reduced Fitness', title: 'NASA HRP: Risk of Reduced Cardiorespiratory and Musculoskeletal Fitness', url: 'https://www.nasa.gov/reference/risk-of-reduced-cardiorespiratory-and-musculoskeletal-fitness/' },
  'nasa-sleep': { kind: 'nasa', short: 'NASA HRP, Sleep', title: 'NASA HRP: Risk from Inadequate Sleep and Irregular Schedules', url: 'https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/' },
  'nasa-bone': { kind: 'nasa', short: 'NASA HRP, Bone', title: 'NASA HRP: Risk of Spaceflight-Induced Bone Changes', url: 'https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/' },
  'nasa-cardio': { kind: 'nasa', short: 'NASA HRP, Cardiovascular', title: 'NASA HRP: Risk of Cardiovascular Adaptations', url: 'https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/' },
  'nasa-behavior': { kind: 'nasa', short: 'NASA HRP, Behavioral', title: 'NASA HRP: Risk of Behavioral Conditions and Psychiatric Disorders', url: 'https://www.nasa.gov/reference/risk-of-behavioral-conditions-and-psychiatric-disorders/' },
  'nasa-immune': { kind: 'nasa', short: 'NASA HRP, Immune', title: 'NASA HRP: Risk of Altered Immune System Responses', url: 'https://www.nasa.gov/reference/risk-of-altered-immune-system-responses/' },
  'nasa-std-3001': { kind: 'nasa', short: 'NASA-STD-3001 Vol. 1', title: 'NASA-STD-3001 Volume 1 Rev C, Crew Health', url: 'https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-1-rev-c-with-signature.pdf' },
  'csa-biomonitor': { kind: 'agency', short: 'CSA Bio-Monitor', title: 'Canadian Space Agency: Bio-Monitor', url: 'https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp' },
  'csa-radiation': { kind: 'agency', short: 'CSA, Monitoring Radiation', title: 'Canadian Space Agency: Monitoring Radiation for Astronaut Health', url: 'https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp' },
  'swri-rad': { kind: 'agency', short: 'MSL RAD estimate (SwRI)', title: 'SwRI: radiation exposure associated with a trip to Mars (MSL RAD)', url: 'https://www.swri.org/press-release/swri-led-team-calculates-radiation-exposure-associated-trip-mars' },
  'aha-bp': { kind: 'clinical', short: 'Clinical norm (AHA)', title: 'American Heart Association: blood pressure categories', url: 'https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings' },
  'ada-glucose': { kind: 'clinical', short: 'Clinical norm (ADA)', title: 'American Diabetes Association: diagnosis and hypoglycemia levels', url: 'https://diabetes.org/diabetes/a1c/diagnosis' },
  'aasm-sleep': { kind: 'clinical', short: 'Clinical norm (AASM)', title: 'AASM / SRS: adults should sleep 7 or more hours', url: 'https://aasm.org/seven-or-more-hours-of-sleep-per-night-a-health-necessity-for-adults/' },
  'clinical-vitals': { kind: 'clinical', short: 'Clinical norm (vital signs)', title: 'MedlinePlus: pulse, adults 60 to 100 beats per minute', url: 'https://medlineplus.gov/ency/article/003399.htm' },
  'clinical-spo2': { kind: 'clinical', short: 'Clinical norm (pulse oximetry)', title: 'MedlinePlus: most healthy people have blood oxygen 95% to 100%', url: 'https://magazine.medlineplus.gov/pdf/Pulse_oximeters.PDF_.final_.011123.pdf' },
  'demo-assumption': { kind: 'assumption', short: 'Demo assumption', title: 'Demo assumption: illustrative value chosen for this prototype, not a clinical or NASA threshold', url: null },
};

export const KIND_LABEL = { nasa: 'NASA HRP', agency: 'Partner agency', clinical: 'Clinical norm', assumption: 'Demo assumption' };
