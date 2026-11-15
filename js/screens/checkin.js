import { h } from '../ui.js';
import { el } from '../viz/svg.js';
import { state, saveEntry, localEntry, recordsOf, verdictFor, person, mission } from '../state.js';

const filled = (v) => v !== '' && v != null;
import { validateCheckin } from '../engine/validate.js';
import { renderDayRing, renderPatch, renderStreak } from '../viz/badges.js';
import { myDayPlan, dayProgress } from '../myday.js';
import { nextMeasurements } from './instruments.js';
import { whoActs } from './verdict.js';
import { icon } from '../viz/icons.js';

const NEXT_ICON = { 'Cognition tests': 'brain', Questionnaires: 'form', 'Periodic exams': 'drop' };

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
let justSaved = false;
// Tasks ticked on My day live only in this page's memory, like the check-ins.
const marks = new Map();
const marksOf = (key) => { if (!marks.has(key)) marks.set(key, new Set()); return marks.get(key); };
let closedSeen = new Set();

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
  const src = localEntry(personId, day) || rec;
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
  const mark = (btns, val) => { btns.forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.v) === Number(val) && val !== ''))); };

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
      h('div', { class: `ci-saved${v.status === 'red' ? ' ci-res-red' : ''}`, role: 'status' }, [
        h('span', { class: 'ci-saved-t', text: v.status === 'red' ? `Saved · ${whoActs(v, mission(), person().name.split(' ')[0]).title}` : 'Check-in saved' }),
        h('button', { type: 'button', class: 'ci-btn ci-ghost', onclick: () => go && go('today'), text: v.status === 'green' ? 'Monitor: all clear' : `Monitor: ${whoActs(v, mission(), person().name.split(' ')[0]).title}` }),
      ]),
    );
  }

  const save = () => {
    const r = validateCheckin(form);
    for (const k of Object.keys(errs)) errs[k].textContent = '';
    if (!r.ok) {
      const order = ['mood', 'vision', 'headache', 'glucose', 'mass', 'sbp', 'dbp'];
      for (const k of order.filter((x) => r.errors[x])) {
        const m = form[k] === 'not a number' ? `${{ sbp: 'Systolic', dbp: 'Diastolic', glucose: 'Glucose', mass: 'Body mass' }[k] || 'Value'}: numbers only` : r.errors[k];
        const key = k === 'vision' || k === 'headache' ? 'eyes' : k === 'sbp' || k === 'dbp' ? 'bp' : k;
        if (errs[key] && !errs[key].textContent) errs[key].textContent = m;
      }
      savedKey = null; status.replaceChildren();
      return;
    }
    savedKey = `${personId}:${day}`;
    justSaved = true;
    for (const k of ['glucose', 'mass']) if (String(form[k]).trim() === '') r.entry[k] = null;
    saveEntry(personId, day, r.entry);
  };

  const key = `${personId}:${day}`;
  const top = h('div', { class: 'md-top' });
  const formStart = h('h3', { class: 'md-sec ci-formhead', text: 'Quick check-in' });
  const drawTop = () => {
    const { v, ev } = verdictFor(personId, day);
    const dm = marksOf(key);
    const checkedIn = !!localEntry(personId, day);
    const plan = myDayPlan({ v, ev, record: rec, marks: dm, checkedIn });
    const prog = dayProgress(plan.tasks);
    const justClosed = prog.closed && !closedSeen.has(key);
    if (prog.closed) closedSeen.add(key); else closedSeen.delete(key);
    const tick = (id) => { dm.add(id); drawTop(); };
    const crewDone = state.crew.map((c) => (c.id === personId ? checkedIn : recordsOf(c.id)[day - 1]?.mood != null));

    const n = plan.next;
    const card = plan.calm
      ? h('section', { class: 'md-next md-calm', 'aria-label': 'Your next step' }, [
        h('div', { class: 'md-k', text: 'Your next step' }),
        h('div', { class: 'md-act' }, [icon('check', 'md-ic'), h('b', { text: 'All clear · keep the routine' })]),
      ])
      : h('section', { class: `md-next${n?.done ? ' md-done' : ''}`, 'aria-label': 'Your next step' }, [
        h('div', { class: 'md-k', text: 'Your next step' }),
        n ? h('div', { class: 'md-act' }, [icon(n.icon, 'md-ic'), h('b', { text: n.text }),
          n.done ? h('span', { class: 'md-ok', text: 'Done ✓' }) : h('button', { type: 'button', class: 'md-btn', onclick: () => tick(n.id), text: 'Done' })]) : null,
        n ? h('div', { class: 'md-why', text: n.why }) : null,
        plan.waiting ? h('div', { class: 'md-wait' }, [icon('cross', 'md-ic-s'), h('span', { text: plan.waiting })]) : null,
      ]);

    const list = h('ul', { class: 'md-tasks' }, plan.tasks.map((t) => h('li', { class: `md-task${t.done ? ' on' : ''}` }, [
      icon(t.icon, 'md-ic-s'), h('span', { class: 'md-tt', text: t.text }),
      t.done ? h('span', { class: 'md-st', text: t.auto ? 'Auto ✓' : '✓' })
        : t.id === 'checkin' ? h('button', { type: 'button', class: 'md-tbtn', onclick: () => formStart.scrollIntoView({ behavior: 'smooth', block: 'start' }), text: 'Start' })
          : h('button', { type: 'button', class: 'md-tbtn', onclick: () => tick(t.id), text: 'Done' }),
    ])));

    top.replaceChildren(card, h('section', { class: `md-today${prog.closed ? ' closed' : ''}${justClosed ? ' md-pop' : ''}` }, [
      h('div', { class: 'md-ringcol' }, [
        renderDayRing({ closed: prog.closed, size: 150, segments: plan.tasks.map((t) => ({ label: t.text, on: t.done })) }),
        h('div', { class: 'md-closed', text: prog.closed ? 'Day closed' : `${prog.total - prog.done} to go` }),
      ]),
      h('div', { class: 'md-right' }, [h('h3', { class: 'md-sec', text: 'Today' }), list]),
    ]), h('div', { class: 'md-game' }, [
      renderStreak(recordsOf(personId), day),
      h('div', { class: 'md-patch' }, [renderPatch({ done: crewDone, names: state.crew.map((c) => c.name), size: 56, flash: justClosed && crewDone.every(Boolean) }), h('span', { text: 'Crew patch' })]),
      // Next scheduled measurements: icon and day only.
      h('div', { class: 'ci-next', 'aria-label': 'Next measurements' }, nextMeasurements(day).slice(0, 3).map((m) => h('span', { class: 'ci-next-i', title: `${m.label}: day ${m.day}` }, [icon(NEXT_ICON[m.label] || 'clock'), h('b', { text: `d${m.day}` })]))),
    ]));
  };
  drawTop();

  root.replaceChildren(h('div', { class: 'ci' }, [
    h('div', { class: 'ci-head' }, [h('h2', { class: 'ci-title', text: `My day · ${person().name.split(' ')[0]} · Day ${day}` })]),
    top,
    status,
    formStart,
    h('div', { class: 'ci-auto' }, [
      h('div', { class: 'ci-auto-chips' }, AUTO.map((a) => h('span', { class: 'ci-chip', text: `${a} · auto ✓` }))),
      h('div', { class: 'ci-auto-note', text: 'From the suit' }),
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
  ]));
  // After saving, the reward sits at the top of the screen.
  if (savedKey === `${personId}:${day}` && justSaved) {
    justSaved = false;
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    // After the re-render settles, bring the ring and "Day closed" into view.
    setTimeout(() => root.querySelector('.md-today')?.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'center' }), 60);
  }
}
