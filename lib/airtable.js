// Klien Airtable minimal. Token hanya dibaca dari environment variable (tidak pernah dikirim ke browser).
const BASE = process.env.AIRTABLE_BASE_ID || 'appG76IeTvWetH0FJ';

function headers() {
  if (!process.env.AIRTABLE_TOKEN) throw new Error('AIRTABLE_TOKEN belum diset');
  return { Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' };
}

async function req(url, opts = {}, attempt = 0) {
  const r = await fetch(url, { ...opts, headers: { ...headers(), ...(opts.headers || {}) } });
  if (r.status === 429 && attempt < 4) {
    await new Promise((res) => setTimeout(res, 1200 * (attempt + 1)));
    return req(url, opts, attempt + 1);
  }
  if (!r.ok) throw new Error(`Airtable ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

// Fabrik klien per base (base BPN bawaan; base lain mis. Schole lewat forBase).
function forBase(base) {
  // Ambil seluruh record sebuah tabel (paginasi otomatis). fields = array field ID.
  async function fetchAll(tableId, fields = [], extra = {}) {
    const out = [];
    let offset;
    do {
      const p = new URLSearchParams({ pageSize: '100', returnFieldsByFieldId: 'true' });
      fields.forEach((f) => p.append('fields[]', f));
      Object.entries(extra).forEach(([k, v]) => p.set(k, v));
      if (offset) p.set('offset', offset);
      const j = await req(`https://api.airtable.com/v0/${base}/${tableId}?${p}`);
      out.push(...j.records);
      offset = j.offset;
    } while (offset);
    return out;
  }

  async function update(tableId, recordId, fields, opts = {}) {
    return req(`https://api.airtable.com/v0/${base}/${tableId}/${recordId}`, {
      method: 'PATCH',
      body: JSON.stringify({ fields, returnFieldsByFieldId: true, ...(opts.typecast ? { typecast: true } : {}) }),
    });
  }

  async function create(tableId, fields, opts = {}) {
    return req(`https://api.airtable.com/v0/${base}/${tableId}`, {
      method: 'POST',
      body: JSON.stringify({ fields, returnFieldsByFieldId: true, ...(opts.typecast ? { typecast: true } : {}) }),
    });
  }

  // Ambil record berdasarkan daftar ID (dipecah per 80 ID, via POST agar URL tidak kepanjangan).
  async function listByIds(tableId, ids, fields = []) {
    const uniq = [...new Set(ids)].filter(Boolean);
    const out = [];
    for (let i = 0; i < uniq.length; i += 80) {
      const chunk = uniq.slice(i, i + 80);
      const formula = chunk.length === 1 ? `RECORD_ID()='${chunk[0]}'` : `OR(${chunk.map((x) => `RECORD_ID()='${x}'`).join(',')})`;
      let offset;
      do {
        const body = { fields, filterByFormula: formula, pageSize: 100, returnFieldsByFieldId: true };
        if (offset) body.offset = offset;
        const j = await req(`https://api.airtable.com/v0/${base}/${tableId}/listRecords`, { method: 'POST', body: JSON.stringify(body) });
        out.push(...j.records);
        offset = j.offset;
      } while (offset);
    }
    return out;
  }

  async function remove(tableId, recordId) {
    return req(`https://api.airtable.com/v0/${base}/${tableId}/${recordId}`, { method: 'DELETE' });
  }


  return { fetchAll, listByIds, update, create, remove, BASE: base };
}
const def = forBase(BASE);
module.exports = { ...def, forBase };
