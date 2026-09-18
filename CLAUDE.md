# saofi_innovation — ระบบแจ้งซ่อมไฟฟ้าสาธารณะ ทต.ป่าสัก (ลำพูน)

## เรากำลังทำอะไร
Innovation ให้นายช่างไฟฟ้า อบต./เทศบาล: ชาวบ้าน**สแกน QR บนเสาไฟ** → หน้าเว็บรู้ทันทีว่าเสาต้นไหน (ไม่ต้องกรอก) → เก็บพิกัด Lat/Long → ช่างดูบนแดชบอร์ด+แผนที่ นำทาง Google Maps → ติดตามงานแบบ incident
Chai (ผู้ใช้) วางแผนตั้ง **หจก.** รับดูแลระบบให้ อบต. — รายละเอียดใน `private/` (gitignored ห้าม commit)

## สถานะ (18 ก.ย. 2568)
- ✅ MVP เสร็จบน **Google Apps Script + Google Sheet** (ต้นทุน 0) อยู่ใน `apps_script/`
- ✅ ระบบกันแจ้งมั่ว 6 ชั้น (ซ้ำ/โควตาเบอร์/บัญชีดำ/honeypot/ลายเซ็น QR/สถานะแจ้งเท็จ)
- ✅ QR generator สร้างเป็นชุดตามหมู่ `docs/qr_generator.html`
- ⏳ **ยังไม่ได้ deploy จริง** บนบัญชี Google ของ อบต. (ทำตาม README)
- 🎯 **ขั้นต่อไปที่ Chai ตัดสินใจแล้ว: ย้ายไป Vercel + Supabase** — เช็กลิสต์อยู่ใน `private/แผนธุรกิจ_หจก.md` ข้อ 5.5

## ข้อเท็จจริงสำคัญ
- เสาไฟ **~1,300 ต้น / 14 หมู่** · รหัสเสา = **`หมู่/ต้นที่`** เช่น `1/14` (ห้ามใช้ `-`)
- `1/14` วางลง Sheet จะกลายเป็นวันที่ → ต้องล็อกคอลัมน์เป็นข้อความ (`setupSheets()` ทำให้แล้ว) — ถ้าย้าย DB ให้ pole_id เป็น TEXT
- พิกัดเสา **สำรวจล่วงหน้าต่อต้น** (ชีต Poles) ไม่ใช่ GPS คนแจ้ง (GPS ใช้เป็น fallback เมื่อไม่พบเสา)
- ลายเซ็น QR: `k` = 6 ตัวแรกของ SHA-256(`QR_SECRET|pole_id`) — generator (Web Crypto) และ Code.gs (Utilities.computeDigest) ต้องตรงกัน
- ค่าลับทั้งหมดอยู่ Script Properties (`ADMIN_TOKEN`, `NOTIFY_EMAIL`, `QR_SECRET`) — โค้ดอยู่ GitHub สาธารณะ ห้ามฝังรหัส
- Remote: https://github.com/chaiprompanawit-alt/test_saofi_QR.git (branch `main`)

## กฎการทำงานในโปรเจกต์นี้
- ตอบ/เขียนเอกสารเป็น**ภาษาไทย** ผู้ใช้ไม่ใช่โปรแกรมเมอร์เต็มตัว อธิบายเชิงธุรกิจ+เทคนิคควบคู่
- ทุกอย่างใน `private/` ห้ามขึ้น git (ตรวจ `git check-ignore` ก่อน commit)
- ข้อมูลผู้แจ้ง = PII (PDPA) ห้ามใส่ข้อมูลจริงใน repo
- แผนที่ใช้ Leaflet+OSM (ฟรี ไม่มี API key) ปุ่มนำทางลิงก์ไป Google Maps
