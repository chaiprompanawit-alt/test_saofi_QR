// Vercel Cron เรียกทุก 3 วัน → แตะฐานข้อมูล กัน Supabase Free หยุดโปรเจกต์เมื่อไม่มีการใช้งาน 7 วัน
const { sb } = require('../lib/db');
module.exports = async (req, res) => {
  const { count, error } = await sb().from('poles').select('pole_id', { count: 'exact', head: true });
  res.json({ ok: !error, poles: count, at: new Date().toISOString(), error: error && error.message });
};
