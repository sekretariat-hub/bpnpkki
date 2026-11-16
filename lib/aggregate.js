// Mengubah nilai field Airtable (string / select / lookup / boolean) menjadi daftar label.
function labels(v) {
  if (v === undefined || v === null || v === '') return [];
  if (Array.isArray(v)) return v.flatMap(labels);
  if (typeof v === 'object') return v.name ? [String(v.name)] : [];
  if (typeof v === 'boolean') return v ? ['Ya'] : [];
  return [String(v)];
}

// Hitung kemunculan tiap label. Record tanpa nilai masuk ke "(kosong)" bila withEmpty.
function countBy(rows, fieldId, { withEmpty = true, split = false } = {}) {
  const m = new Map();
  for (const r of rows) {
    let ls = labels(r.fields[fieldId]);
    if (split) ls = ls.flatMap((s) => s.split(/\s*,\s*/)).filter(Boolean);
    if (!ls.length) {
      if (withEmpty) m.set('(kosong)', (m.get('(kosong)') || 0) + 1);
      continue;
    }
    for (const l of new Set(ls)) m.set(l, (m.get(l) || 0) + 1);
  }
  return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

function sum(rows, fieldId) {
  return rows.reduce((s, r) => s + (Number(r.fields[fieldId]) || 0), 0);
}

module.exports = { labels, countBy, sum };
