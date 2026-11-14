import { icon } from './viz/icons.js';
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

// Confidence of a statement: a picture and one word, never a lone letter.
export const CONF = {
  established: { icon: 'shield', word: 'Proven', label: 'Proven: NASA source or clinical norm' },
  hypothesis: { icon: 'flask', word: 'Hypothesis', label: 'Hypothesis: trend or model, confirm with a repeat measure' },
  ask: { icon: 'person', word: 'Ask medic', label: 'Ask medic: decision for the crew medic or flight surgeon' },
};
export const confBadge = (c) => h('span', { class: `conf conf-${c}`, title: CONF[c].label }, [icon(CONF[c].icon), h('span', { class: 'conf-w', text: CONF[c].word })]);

export const STATUS_WORD = { green: 'OK', yellow: 'Watch', red: 'Act', grey: 'No data' };
