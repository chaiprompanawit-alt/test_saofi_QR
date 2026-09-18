/**
 * ระบบแจ้งซ่อมไฟฟ้าสาธารณะ - เทศบาลตำบลป่าสัก (MVP)
 * Google Apps Script Web App + Google Sheet
 *
 * โครงสร้าง Sheet (สร้างชีตชื่อตรงตามนี้):
 *  - ชีต "Poles"   : เลขเสา + พิกัด (สำรวจล่วงหน้า)
 *      คอลัมน์: pole_id | zone | address | lat | lng | note
 *  - ชีต "Reports" : บันทึกการแจ้งซ่อม (ระบบเขียนให้อัตโนมัติ)
 *      คอลัมน์: report_id | timestamp | pole_id | lat | lng | reporter_name |
 *               reporter_phone | detail | status | assigned_to | staff_note | updated_at
 *
 * วิธี Deploy: Deploy > New deployment > Web app
 *   - Execute as: Me
 *   - Who has access: Anyone (เพื่อให้ชาวบ้านสแกน QR แจ้งได้โดยไม่ต้องล็อกอิน)
 */

var SHEET_POLES = 'Poles';
var SHEET_REPORTS = 'Reports';
var ADMIN_TOKEN = 'CHANGE_ME_2568'; // << เปลี่ยนเป็นรหัสลับของเจ้าหน้าที่ ใช้เปิดหน้า admin
var STATUS_LIST = ['แจ้งใหม่', 'รับเรื่องแล้ว', 'กำลังดำเนินการ', 'เสร็จสิ้น', 'ปิดงาน/ไม่พบปัญหา'];

function doGet(e) {
  var page = (e && e.parameter && e.parameter.page) || 'report';

  if (page === 'admin') {
    var t = HtmlService.createTemplateFromFile('admin');
    t.token = (e.parameter.token || '');
    t.adminOk = (e.parameter.token === ADMIN_TOKEN);
    return t.evaluate()
      .setTitle('แดชบอร์ดช่างไฟ - ทต.ป่าสัก')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  // หน้าแจ้งซ่อมสำหรับชาวบ้าน (สแกน QR มา)
  var poleId = (e && e.parameter && e.parameter.pole) ? String(e.parameter.pole).trim() : '';
  var t = HtmlService.createTemplateFromFile('report');
  t.poleId = poleId;
  t.pole = poleId ? getPole(poleId) : null;
  return t.evaluate()
    .setTitle('แจ้งซ่อมไฟฟ้าสาธารณะ - ทต.ป่าสัก')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** ให้ HTML ฝัง include ไฟล์อื่นได้ */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/** ---------- ข้อมูลเสา ---------- */
function getSheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) throw new Error('ไม่พบชีตชื่อ "' + name + '" กรุณาสร้างตามคู่มือ');
  return sh;
}

function getPole(poleId) {
  var sh = getSheet_(SHEET_POLES);
  var data = sh.getDataRange().getValues();
  var head = data[0];
  var idx = colIndex_(head);
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idx.pole_id]).trim() === String(poleId).trim()) {
      return {
        pole_id: String(data[i][idx.pole_id]).trim(),
        zone: data[i][idx.zone] || '',
        address: data[i][idx.address] || '',
        lat: data[i][idx.lat] || '',
        lng: data[i][idx.lng] || '',
        note: data[i][idx.note] || ''
      };
    }
  }
  return null; // ไม่พบเสา -> ให้ชาวบ้านกรอกเลขเสาเอง
}

function colIndex_(head) {
  var map = {};
  head.forEach(function (h, i) { map[String(h).trim().toLowerCase()] = i; });
  return {
    pole_id: pick_(map, ['pole_id', 'เลขเสา', 'id']),
    zone: pick_(map, ['zone', 'โซน', 'หมู่']),
    address: pick_(map, ['address', 'ที่อยู่', 'ตำแหน่ง']),
    lat: pick_(map, ['lat', 'latitude', 'ละติจูด']),
    lng: pick_(map, ['lng', 'lon', 'longitude', 'ลองจิจูด']),
    note: pick_(map, ['note', 'หมายเหตุ'])
  };
}
function pick_(map, keys) {
  for (var i = 0; i < keys.length; i++) if (map[keys[i]] !== undefined) return map[keys[i]];
  return -1;
}

/** ---------- รับการแจ้งซ่อมจากหน้าเว็บ ---------- */
function submitReport(payload) {
  var sh = getSheet_(SHEET_REPORTS);
  ensureReportHeader_(sh);

  var pole = payload.pole_id ? getPole(payload.pole_id) : null;
  // พิกัด: ใช้ของเสาที่สำรวจไว้เป็นหลัก; ถ้าไม่มีค่อยใช้ GPS ที่ผู้แจ้งส่งมา
  var lat = (pole && pole.lat) ? pole.lat : (payload.gps_lat || '');
  var lng = (pole && pole.lng) ? pole.lng : (payload.gps_lng || '');

  var now = new Date();
  var reportId = 'R' + Utilities.formatDate(now, 'Asia/Bangkok', 'yyMMdd-HHmmss');

  sh.appendRow([
    reportId,
    now,
    payload.pole_id || '(ไม่ระบุ)',
    lat,
    lng,
    payload.reporter_name || '',
    payload.reporter_phone || '',
    payload.detail || '',
    'แจ้งใหม่',
    '',      // assigned_to
    '',      // staff_note
    now      // updated_at
  ]);

  return { ok: true, report_id: reportId };
}

function ensureReportHeader_(sh) {
  if (sh.getLastRow() === 0) {
    sh.appendRow(['report_id', 'timestamp', 'pole_id', 'lat', 'lng', 'reporter_name',
      'reporter_phone', 'detail', 'status', 'assigned_to', 'staff_note', 'updated_at']);
  }
}

/** ---------- ฝั่งเจ้าหน้าที่ (admin) ---------- */
function getReports(token) {
  if (token !== ADMIN_TOKEN) throw new Error('unauthorized');
  var sh = getSheet_(SHEET_REPORTS);
  if (sh.getLastRow() < 2) return [];
  var data = sh.getDataRange().getValues();
  var head = data[0];
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var o = {};
    head.forEach(function (h, j) { o[String(h).trim()] = data[i][j]; });
    o._row = i + 1; // เลขแถวจริงใน sheet
    // แปลงวันที่เป็น string อ่านง่าย
    if (o.timestamp instanceof Date) o.timestamp = Utilities.formatDate(o.timestamp, 'Asia/Bangkok', 'dd/MM/yyyy HH:mm');
    if (o.updated_at instanceof Date) o.updated_at = Utilities.formatDate(o.updated_at, 'Asia/Bangkok', 'dd/MM/yyyy HH:mm');
    rows.push(o);
  }
  return rows.reverse(); // ใหม่สุดอยู่บน
}

function updateReport(token, row, status, assignedTo, staffNote) {
  if (token !== ADMIN_TOKEN) throw new Error('unauthorized');
  var sh = getSheet_(SHEET_REPORTS);
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var idx = {};
  head.forEach(function (h, i) { idx[String(h).trim()] = i + 1; });

  if (status) sh.getRange(row, idx['status']).setValue(status);
  if (assignedTo !== undefined) sh.getRange(row, idx['assigned_to']).setValue(assignedTo);
  if (staffNote !== undefined) sh.getRange(row, idx['staff_note']).setValue(staffNote);
  sh.getRange(row, idx['updated_at']).setValue(new Date());
  return { ok: true };
}

function getStatusList() { return STATUS_LIST; }
