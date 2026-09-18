// ข้อมูลเสา — GET รายการทั้งหมด (ช่าง/แอดมิน) / POST {rows:[{pole_id,zone,address,lat,lng,note}]} upsert เป็นชุด (แอดมิน)
const { sb, requireRole, body, clean } = require('../lib/db');
module.exports = async (req, res) => {
  if (req.method === 'GET') {
    if (!requireRole(req, res, ['admin', 'tech'])) return;
    const { data, error } = await sb().from('poles').select('*').order('pole_id').limit(5000);
    return error ? res.status(500).json({ error: error.message }) : res.json(data);
  }
  if (!requireRole(req, res, ['admin'])) return;
  const rows = (body(req).rows || []).map(r => ({
    pole_id: clean(r.pole_id, 20), zone: clean(r.zone, 10), address: clean(r.address, 200),
    lat: parseFloat(r.lat) || null, lng: parseFloat(r.lng) || null, note: clean(r.note, 200)
  })).filter(r => r.pole_id);
  const bad = rows.filter(r => !/^\d{1,2}\/\d{1,4}$/.test(r.pole_id)).map(r => r.pole_id);
  if (bad.length) return res.status(400).json({ error: 'รูปแบบเลขเสาต้องเป็น หมู่/ต้นที่ เช่น 1/14 — ผิดที่: ' + bad.slice(0, 10).join(', ') });
  if (!rows.length) return res.status(400).json({ error: 'ไม่มีข้อมูล' });
  const { error } = await sb().from('poles').upsert(rows, { onConflict: 'pole_id' });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true, count: rows.length });
};
