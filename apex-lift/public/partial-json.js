// Best-effort parse of an incomplete JSON stream so cards can fill in while tokens arrive.
export function parsePartial(text) {
  const start = text.indexOf('{');
  if (start === -1) return null;
  const s = text.slice(start).replace(/```\s*$/, '');
  try { return JSON.parse(s); } catch { /* fall through */ }

  // Walk the text, remembering open brackets and the last safe cut point at each depth.
  const stack = [];
  let inStr = false;
  let esc = false;
  let lastSafe = -1; // index after a complete value inside an object/array
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{' || c === '[') stack.push(c);
    else if (c === '}' || c === ']') { stack.pop(); lastSafe = i + 1; }
    else if (c === ',') lastSafe = i;
  }

  // Try 1: close an open string and all brackets as-is (keeps the in-progress text value).
  const closers = st => st.slice().reverse().map(b => (b === '{' ? '}' : ']')).join('');
  const attempts = [];
  let body = s;
  if (inStr) body += '"';
  attempts.push(body.replace(/,\s*$/, '') + closers(stack));
  // Try 2: cut back to the last complete value and recompute the stack.
  if (lastSafe > 0) {
    const cut = s.slice(0, lastSafe).replace(/,\s*$/, '');
    const st = [];
    let q = false, e = false;
    for (const ch of cut) {
      if (q) { if (e) e = false; else if (ch === '\\') e = true; else if (ch === '"') q = false; continue; }
      if (ch === '"') q = true;
      else if (ch === '{' || ch === '[') st.push(ch);
      else if (ch === '}' || ch === ']') st.pop();
    }
    attempts.push(cut + closers(st));
  }
  for (const a of attempts) {
    try { return JSON.parse(a); } catch { /* next */ }
  }
  return null;
}
