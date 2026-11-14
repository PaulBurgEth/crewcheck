const NUM = /^[+-]?\d+(\.\d+)?$/;
const given = (v) => !(v === undefined || v === null || (typeof v === 'string' && v.trim() === ''));

function parse(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : NaN;
  if (typeof v === 'string' && NUM.test(v.trim())) return Number(v.trim());
  return NaN;
}

export function validateCheckin(input = {}) {
  const errors = {};
  const entry = {};
  const num = (key, lo, hi, { int = false, msg } = {}) => {
    if (!given(input[key])) return false;
    const n = parse(input[key]);
    if (Number.isNaN(n) || n < lo || n > hi || (int && !Number.isInteger(n))) { errors[key] = msg || `Enter ${lo} to ${hi}`; return false; }
    entry[key] = n;
    return true;
  };

  if (!given(input.mood)) errors.mood = 'Pick a mood';
  else num('mood', 1, 5, { int: true, msg: 'Pick 1 to 5' });
  num('vision', 0, 1, { int: true, msg: 'Yes or no' });
  num('headache', 0, 3, { int: true, msg: 'Pick 0 to 3' });
  num('glucose', 40, 400, { msg: 'Enter 40 to 400 mg/dL' });
  num('mass', 30, 200, { msg: 'Enter 30 to 200 kg' });

  const hasS = given(input.sbp), hasD = given(input.dbp);
  if (hasS && !hasD) errors.dbp = 'Add diastolic';
  if (hasD && !hasS) errors.sbp = 'Add systolic';
  if (hasS) num('sbp', 70, 250, { msg: 'Systolic 70 to 250' });
  if (hasD) num('dbp', 40, 150, { msg: 'Diastolic 40 to 150' });

  if (Object.keys(errors).length) return { ok: false, entry: null, errors };
  return { ok: true, entry, errors: {} };
}
