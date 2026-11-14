const r = (v, n) => Number(v.toFixed(n));

function median(a) {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function doseSummary(records, day) {
  const rows = (Array.isArray(records) ? records : [])
    .filter((x) => x && Number.isFinite(x.day) && x.day <= day && Number.isFinite(x.doseMSv))
    .map((x) => ({ day: x.day, dose: x.doseMSv }));
  const med = median(rows.map((x) => x.dose));
  const limit = 3 * med;
  const isEvent = (x) => med > 0 && x.dose > limit;
  const total = rows.reduce((s, x) => s + x.dose, 0);
  const todayRow = rows.find((x) => x.day === day);
  const recent = rows.filter((x) => x.day > day - 7 && !isEvent(x));
  const rate = recent.length ? recent.reduce((s, x) => s + x.dose, 0) / recent.length : med;
  const ratePerDay = r(rate, 2);
  return {
    total: r(total, 1),
    today: todayRow ? todayRow.dose : null,
    ratePerDay,
    projected180: r(total + ratePerDay * Math.max(0, 180 - day), 1),
    events: rows.filter(isEvent),
  };
}
