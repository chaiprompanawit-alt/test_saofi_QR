// POST /api/login {username, password} → {token, role, name}
// - username "admin" + รหัส ADMIN_TOKEN = บัญชีแอดมินหลัก (ใช้ตั้งต้นระบบ / กู้คืนเมื่อลืมรหัส)
// - อื่น ๆ ตรวจกับตาราง staff_users
const { sb, body, clean } = require('../lib/db');
const A = require('../lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const p = body(req);
  const username = clean(p.username, 50).toLowerCase();
  const password = String(p.password || '');
  if (!username || !password) return res.status(400).json({ error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });

  let user = null;
  if (username === 'admin' && process.env.ADMIN_TOKEN && password === process.env.ADMIN_TOKEN) {
    user = { username: 'admin', display_name: 'ผู้ดูแลระบบ', role: 'admin' };
  } else {
    const { data } = await sb().from('staff_users').select('*').eq('username', username).maybeSingle();
    if (data && data.active && A.verifyPassword(password, data.password_hash)) {
      user = data;
      await sb().from('staff_users').update({ last_login: new Date().toISOString() }).eq('username', username);
    }
  }
  if (!user) return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
  res.json({ token: A.issueToken(user), role: user.role, name: user.display_name, username: user.username });
};
