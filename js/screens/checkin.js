import { h } from '../ui.js';
import { el } from '../viz/svg.js';
import { state, saveEntry, localEntry, recordsOf, verdictFor, person } from '../state.js';
import { validateCheckin } from '../engine/validate.js';

export const CHECKIN_FIELDS = [
  { id: 'mood', label: 'Mood', how: 'Tap the face that fits today', why: 'Mood drifts early under isolation (NASA)' },
  { id: 'eyes', label: 'Eyes & head', how: 'Any new blur? Headache 0 none to 3 severe', why: 'Spaceflight eye changes (SANS) start quietly' },
  { id: 'glucose', label: 'Glucose', unit: 'mg/dL', how: 'Finger-stick, before breakfast', why: 'Clinical norm (ADA) ranges' },
  { id: 'mass', label: 'Body mass', unit: 'kg', how: 'Mass device, same time daily', why: 'Falling mass flags muscle and bone loss' },
  { id: 'bp', label: 'Blood pressure', note: 'only if suit is off', how: 'Cuff, seated, 5 min rest', why: 'Suit gives pressure only while worn' },
];
const AUTO = ['Pulse', 'Pressure', 'Breathing', 'Temp', 'SpO2', 'Activity', 'Sleep'];
const MOUTHS = ['M12 29 Q20 21 28 29', 'M13 28 Q20 24 27 28', 'M13 27 L27 27', 'M13 25 Q20 30 27 25', 'M11 24 Q20 34 29 24'];

let savedKey = null;

function face(n) {
  return el('svg', { viewBox: '0 0 40 40', width: 44, height: 44, class: 'ci-face-svg', 'aria-hidden': 'true' }, [
    el('circle', { cx: 20, cy: 20, r: 17, fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }),
    el('circle', { cx: 14, cy: 16, r: 2, fill: 'currentColor' }),
    el('circle', { cx: 26, cy: 16, r: 2, fill: 'currentColor' }),
    el('path', { d: MOUTHS[n - 1], fill: 'none', stroke: 'currentColor', 'stroke-width': 2.2, 'stroke-linecap': 'round' }),
  ]);
}

function infoToggle(f) {
  const line = h('div', { class: 'ci-info', hidden: true });
  const btn = (name, text) => h('button', {
    type: 'button', class: 'ci-tog', 'aria-expanded': 'false',
    onclick: (e) => {
      const b = e.currentTarget;
      const open = b.getAttribute('aria-expanded') === 'true';
      for (const x of b.parentNode.querySelectorAll('.ci-tog')) x.setAttribute('aria-expanded', 'false');
      if (open) { line.hidden = true; return; }
      b.setAttribute('aria-expanded', 'true');
      line.textContent = `${name}: ${text}`;
      line.hidden = false;
    },
  }, name);
  return h('div', { class: 'ci-help' }, [h('div', { class: 'ci-toggles' }, [btn('How', f.how), btn('Why', f.why)]), line]);
}

export default function render(root, { go } = {}) {
  const { personId, day } = state;
  const rec = recordsOf(personId).find((r) => r.day === day) || {};
  const src = { ...rec, ...(localEntry(personId, day) || {}) };
  const form = {
    mood: src.mood ?? '', vision: src.vision ?? '', headache: src.headache ?? '',
    glucose: src.glucose ?? '', mass: src.mass ?? '', sbp: '', dbp: '',
  };
  // Blood pressure is prefilled only from what was typed here, never from the suit record.
  const typed = localEntry(personId, day) || {};
  form.sbp = typed.sbp ?? ''; form.dbp = typed.dbp ?? '';

  const errs = {};
  const errBox = (key) => { errs[key] = h('div', { class: 'ci-err', role: 'alert' }); return errs[key]; };
  const moodBtns = [], visBtns = [], headBtns = [];
  const mark = (btns, val) => btns.forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.v) === Number(val) && val !== '')));

  for (let n = 1; n <= 5; n++) {
    moodBtns.push(h('button', { type: 'button', class: 'ci-face', 'data-v': n, 'aria-label': `Mood ${n} of 5`, onclick: () => { form.mood = n; mark(moodBtns, n); } }, [face(n)]));
  }
  [['No', 0], ['Yes', 1]].forEach(([t, v]) => visBtns.push(h('button', { type: 'button', class: 'ci-pick', 'data-v': v, onclick: () => { form.vision = v; mark(visBtns, v); } }, t)));
  for (let n = 0; n <= 3; n++) headBtns.push(h('button', { type: 'button', class: 'ci-pick ci-small', 'data-v': n, 'aria-label': `Headache ${n} of 3`, onclick: () => { form.headache = n; mark(headBtns, n); } }, String(n)));
  mark(moodBtns, form.mood); mark(visBtns, form.vision); mark(headBtns, form.headache);

  const input = (key, label, ph) => h('input', {
    class: 'ci-input', type: 'number', inputmode: 'decimal', step: 'any', placeholder: ph, 'aria-label': label,
    value: form[key] === '' ? null : String(form[key]),
    // A number field reports letters as an empty value; keep them as invalid text so validation rejects them.
    oninput: (e) => { form[key] = e.target.validity?.badInput ? 'not a number' : e.target.value; },
  });
  const field = (f, body, errKeys) => h('section', { class: 'ci-field' }, [
    h('div', { class: 'ci-fhead' }, [h('h3', { class: 'ci-flabel', text: f.label }), f.note ? h('span', { class: 'ci-note', text: f.note }) : null]),
    body, ...errKeys.map(errBox), infoToggle(f),
  ]);
  const [fMood, fEyes, fGlu, fMass, fBp] = CHECKIN_FIELDS;

  const status = h('div', { class: 'ci-status' });
  if (savedKey === `${personId}:${day}`) {
    const { v } = verdictFor(personId, day);
    status.append(
      h('div', { class: `ci-saved ci-res-${v.status}`, role: 'status', text: v.status === 'green' ? 'Saved · all clear · streak +1' : `Saved · ${v.status === 'red' ? 'RED' : 'Watch'}: ${v.headline}` }),
      h('button', { type: 'button', class: 'ci-btn ci-ghost', onclick: () => go && go('today'), text: 'See my monitor' }),
    );
  }

  const save = () => {
    const r = validateCheckin(form);
    for (const k of Object.keys(errs)) errs[k].textContent = '';
    if (!r.ok) {
      const order = ['mood', 'vision', 'headache', 'glucose', 'mass', 'sbp', 'dbp'];
      for (const k of order.filter((x) => r.errors[x])) {
        const m = form[k] === 'not a number' ? `${k === 'sbp' ? 'Systolic' : k === 'dbp' ? 'Diastolic' : 'Value'}: numbers only` : r.errors[k];
        const key = k === 'vision' || k === 'headache' ? 'eyes' : k === 'sbp' || k === 'dbp' ? 'bp' : k;
        if (errs[key] && !errs[key].textContent) errs[key].textContent = m;
      }
      savedKey = null; status.replaceChildren();
      return;
    }
    savedKey = `${personId}:${day}`;
    saveEntry(personId, day, r.entry);
  };

  root.replaceChildren(h('div', { class: 'ci' }, [
    h('div', { class: 'ci-head' }, [h('h2', { class: 'ci-title', text: `Check-in · ${person().name} · Day ${day}` }), h('span', { class: 'ci-pill', text: '< 1 min' })]),
    h('div', { class: 'ci-auto' }, [
      h('div', { class: 'ci-auto-chips' }, AUTO.map((a) => h('span', { class: 'ci-chip', text: `${a} · auto ✓` }))),
      h('div', { class: 'ci-auto-note', text: 'From the suit — nothing to do' }),
    ]),
    field(fMood, h('div', { class: 'ci-faces' }, moodBtns), ['mood']),
    field(fEyes, h('div', { class: 'ci-eyes' }, [
      h('div', { class: 'ci-row' }, [h('span', { class: 'ci-rl', text: 'Vision changed' }), h('div', { class: 'ci-picks' }, visBtns)]),
      h('div', { class: 'ci-row' }, [h('span', { class: 'ci-rl', text: 'Headache 0-3' }), h('div', { class: 'ci-picks' }, headBtns)]),
    ]), ['eyes']),
    field(fGlu, h('label', { class: 'ci-num' }, [input('glucose', 'Glucose mg/dL', 'mg/dL'), h('span', { class: 'ci-unit', text: fGlu.unit })]), ['glucose']),
    field(fMass, h('label', { class: 'ci-num' }, [input('mass', 'Body mass kg', 'kg'), h('span', { class: 'ci-unit', text: fMass.unit })]), ['mass']),
    field(fBp, h('div', { class: 'ci-num' }, [input('sbp', 'Systolic', 'sys'), h('span', { class: 'ci-unit', text: '/' }), input('dbp', 'Diastolic', 'dia'), h('span', { class: 'ci-unit', text: 'mmHg' })]), ['bp']),
    h('button', { type: 'button', class: 'ci-btn', onclick: save, text: 'Save' }),
    status,
  ]));
}
