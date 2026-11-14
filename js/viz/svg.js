const SVG_NS = 'http://www.w3.org/2000/svg';

function apply(node, attrs, children) {
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
      else node.setAttribute(k, v === true ? '' : String(v));
    }
  }
  const list = Array.isArray(children) ? children : children === undefined || children === null ? [] : [children];
  for (const c of list) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

/** SVG element. Text children become text nodes (never innerHTML). */
export function el(tag, attrs, children) {
  return apply(document.createElementNS(SVG_NS, tag), attrs, children);
}

/** HTML element. Text children become text nodes (never innerHTML). */
export function h(tag, attrs, children) {
  return apply(document.createElement(tag), attrs, children);
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}
