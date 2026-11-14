// AI advises, rules decide. Advice is attached next to the verdict and can never change it.
export function attachAdvice(verdict, advice) {
  const text = typeof advice?.text === 'string' ? advice.text.slice(0, 600) : '';
  const points = Array.isArray(advice?.points) ? advice.points.filter((p) => typeof p === 'string').slice(0, 4).map((p) => p.slice(0, 160)) : [];
  return Object.freeze({ ...verdict, advice: { text, points, confidence: 'hypothesis', origin: advice?.origin || 'precomputed' } });
}

// The only data the advisor ever sees: fired rules and numbers. No free text.
export function advisorPayload(evaluation, verdict, mission) {
  return {
    mission: mission.id,
    day: evaluation.day,
    tier: verdict.tier,
    status: verdict.status,
    fired: evaluation.fired.map((f) => ({ rule: f.id, signal: f.signal, measured: f.measured, threshold: f.value })),
  };
}
