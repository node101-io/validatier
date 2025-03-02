
function uatomToAtom (uatom) {
  if (typeof uatom != "number") uatom = parseFloat(uatom);
  return uatom / 1e6;
}

function atomToUatom (atom) {
  if (typeof atom != "number") atom = parseFloat(atom);
  return atom * 1e6;
}
