/**
 * Jadwal Tim -- jembatan HTTP ke Google Sheet ini lewat Apps Script Web App.
 *
 * PENTING: script ini dibuat sebagai project BERDIRI SENDIRI di
 * script.google.com (bukan lewat menu Extensions > Apps Script di dalam
 * sheet-nya). Kalau dibuat lewat menu di dalam sheet yang filenya milik
 * akun Workspace kantor, Google otomatis membatasi akses Web App-nya cuma
 * untuk akun dalam domain kantor itu (URL-nya jadi .../a/macros/domain/...)
 * -- dan server aplikasi kita tidak bisa "login" untuk lewat batasan itu.
 * Dengan script berdiri sendiri milik akun pribadi + SpreadsheetApp.openById,
 * URL yang dihasilkan tidak kena batasan itu.
 *
 * Cara pakai:
 * 1. Buka script.google.com, login pakai akun Gmail PRIBADI kamu (akun yang
 *    sama dipakai bikin project Google Cloud kemarin).
 * 2. Klik "New project".
 * 3. Hapus kode default, tempel isi file ini.
 * 4. Ganti SECRET_TOKEN di bawah dengan kata sandi acak buatan sendiri.
 * 5. SHEET_ID di bawah sudah diisi sesuai sheet "Jadwal PS - ERP" kamu --
 *    tidak perlu diubah kecuali sheet-nya beda.
 * 6. Share sheet aslinya (dari akun kantor) ke akun Gmail pribadi kamu itu,
 *    dengan akses Editor -- caranya: buka sheet > Share > masukin email
 *    Gmail pribadi kamu > pilih Editor > Send.
 * 7. Deploy > New deployment > pilih tipe "Web app".
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 8. Klik Deploy, izinkan akses (Authorize access).
 * 9. Copy URL Web App yang muncul (bentuknya https://script.google.com/macros/s/xxx/exec
 *    -- TANPA "/a/macros/nama-domain/" di tengahnya).
 * 10. Isi APPS_SCRIPT_URL (URL itu) dan APPS_SCRIPT_TOKEN (SECRET_TOKEN di
 *     bawah) di file .env aplikasi web-nya -- harus sama persis.
 *
 * Lihat README.md bagian "Sinkron Google Sheet" untuk detail lengkap.
 */

// GANTI dengan kata sandi rahasia buatan sendiri (bebas, asal panjang & acak).
// Harus sama persis dengan APPS_SCRIPT_TOKEN di .env aplikasi web-nya.
const SECRET_TOKEN = "GANTI_DENGAN_TOKEN_RAHASIA_ACAK";

// ID Google Sheet "Jadwal PS - ERP" (dari bagian /d/<INI>/edit di URL sheet-nya).
const SHEET_ID = "1ukuUdkfbWgJlcmU08naf2ia2yg7_hH0IZAZE3CQXBe4";

function doGet(e) {
  if (e.parameter.token !== SECRET_TOKEN) {
    return respond({ error: "Unauthorized" });
  }
  const range = e.parameter.range;
  if (!range) {
    return respond({ error: "Parameter 'range' wajib diisi." });
  }
  try {
    const values = SpreadsheetApp.openById(SHEET_ID).getRange(range).getValues();
    return respond({ values });
  } catch (err) {
    return respond({ error: String(err) });
  }
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return respond({ error: "Body harus JSON valid." });
  }

  if (body.token !== SECRET_TOKEN) {
    return respond({ error: "Unauthorized" });
  }

  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = body.sheet ? ss.getSheetByName(body.sheet) : ss.getActiveSheet();
    if (!sheet) {
      return respond({ error: `Sheet/tab "${body.sheet}" tidak ditemukan.` });
    }

    // Mode "cells": tulis sel satu-satu berdasarkan {kolom: nilai} di satu
    // baris. Dipakai supaya kolom yang tidak disebut (misalnya kolom Date
    // ber-tipe Date asli) TIDAK PERNAH disentuh sama sekali -- ini sengaja,
    // karena kalau dibaca lalu ditulis ulang lewat setValues(), sel Date
    // berubah jadi teks ISO mentah dan kehilangan format aslinya.
    if (body.row && body.cells) {
      Object.keys(body.cells).forEach((col) => {
        sheet.getRange(`${col}${body.row}`).setValue(body.cells[col]);
      });
      return respond({ ok: true });
    }

    // Mode "range": tulis satu blok range sekaligus (dipakai kalau memang
    // perlu menimpa banyak kolom berurutan, jarang dipakai app ini).
    if (body.range && body.values) {
      sheet.getRange(body.range).setValues(body.values);
      return respond({ ok: true });
    }

    return respond({ error: "Butuh field 'row'+'cells', atau 'range'+'values'." });
  } catch (err) {
    return respond({ error: String(err) });
  }
}

function respond(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
