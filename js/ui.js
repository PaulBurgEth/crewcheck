// Small DOM helpers for screens. Text always via textContent.
export function h(tag, attrs = {}, children = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of [].concat(children)) if (c != null && c !== false) n.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return n;
}

export const CONF = {
  established: { letter: 'E', label: 'Established: NASA source or clinical norm' },
  hypothesis: { letter: 'H', label: 'Hypothesis: trend or model, confirm with a repeat measure' },
  ask: { letter: 'A', label: 'Ask: decision for the crew medic or flight surgeon' },
};
export const confBadge = (c) => h('span', { class: `conf conf-${c}`, title: CONF[c].label, 'aria-label': CONF[c].label, text: CONF[c].letter });

export const STATUS_WORD = { green: 'OK', yellow: 'Watch', red: 'Act', grey: 'No data' };
