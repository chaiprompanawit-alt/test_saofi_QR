// GET /api/pole?pole=1/14&k=abc123
// หน้าชาวบ้านเรียกตอนเปิด: ตรวจลายเซ็น QR + ดึงข้อมูลเสา + เช็กว่ามีงานค้างอยู่แล้วไหม
const { sb, qrValid, OPEN_STATUS, clean } = require('../lib/db');

module.exports = async (req, res) => {
  const poleId = clean(req.query.pole, 20);
  const k = clean(req.query.k, 12);
  const ok = qrValid(poleId, k);
  if (!ok) return res.json({ qrOk: false });
  if (!poleId) return res.json({ qrOk: true, pole_id: '', pole: null, openReport: null });

  const [{ data: pole }, { data: open }] = await Promise.all([
    sb().from('poles').select('pole_id,zone,address,lat,lng,note').eq('pole_id', poleId).maybeSingle(),
    sb().from('reports').select('report_id,status,created_at').eq('pole_id', poleId).in('status', OPEN_STATUS)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
  ]);
  res.json({ qrOk: true, pole_id: poleId, pole: pole || null, openReport: open || null });
};
