// GET /api/me → ข้อมูล session ปัจจุบัน (ใช้เช็กว่ายังล็อกอินอยู่ไหม)
// POST /api/me {old_password, new_password} → เปลี่ยนรหัสผ่านตัวเอง
const { sb, body } = require('../lib/db');
const A = require('../lib/auth');
module.exports = async (req, res) => {
  const s = A.requireRole(req, res); if (!s) return;
  if (req.method === 'GET') return res.json(s);
  if (s.username === 'admin') return res.status(400).json({ error: 'บัญชี admin หลักเปลี่ยนรหัสได้ที่ ADMIN_TOKEN ใน Vercel เท่านั้น' });
  const p = body(req);
  if (String(p.new_password || '').length < 6) return res.status(400).json({ error: 'รหัสใหม่ต้องยาวอย่างน้อย 6 ตัว' });
  const { data } = await sb().from('staff_users').select('password_hash').eq('username', s.username).maybeSingle();
  if (!data || !A.verifyPassword(p.old_password, data.password_hash)) return res.status(400).json({ error: 'รหัสเดิมไม่ถูกต้อง' });
  await sb().from('staff_users').update({ password_hash: A.hashPassword(p.new_password) }).eq('username', s.username);
  res.json({ ok: true });
};
