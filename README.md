# Jadwal tim

Starter codebase untuk dashboard jadwal shift, cuti, ganti hari, dan overtime tim
kamu. Google Sheet kamu tetap jadi sumber data utama, disinkronkan 2 arah dengan
web app ini.

## Keputusan produk yang sudah dikonfirmasi

- **Arsitektur**: web app custom (Next.js), Google Sheet tetap sumber data utama, sync 2 arah.
  Edit manual di Sheet dibatasi ke editor terpercaya, jadi risiko konflik sync kecil.
- **Login**: Google SSO, dibatasi ke domain Google Workspace tim (`ALLOWED_GOOGLE_DOMAIN`).
- **Notifikasi**: dashboard dulu (v1). WhatsApp menyusul di fase 2.
- **Approval**: 1 approver (supervisor/manager), tidak berjenjang.
- **Kuota cuti otomatis**: fase 2, di v1 cuti dicatat tanpa hitungan kuota.
- **Data historis**: rencana import semua histori 2024-2025 dst ke sistem baru.
- **Tim aktif**: dikelola di database lewat halaman `/team` ("Master Data
  Karyawan", khusus supervisor) -- tidak lagi hardcode di kode. Karyawan
  nonaktif (misal Ayu) tidak dihapus, cuma ditandai nonaktif.

## Struktur project

```
apps-script/Code.gs     script Apps Script Web App -- jembatan sync ke Google Sheet
prisma/schema.prisma    model database (LeaveRequest, SwapRequest) -- SQLite lokal
src/
  app/                  halaman (dashboard, requests, assign, approvals, team, login)
  app/api/              route API (schedule, leave-requests, swap-requests, approvals,
                         employees, admin/employees, auth)
  components/           komponen UI (kartu hari ini, kalender minggu/bulan, form,
                         EmployeeMasterTable, dsb)
  lib/
    auth.ts             konfigurasi NextAuth + Google SSO (+ dev-login untuk lokal)
    googleSheets.ts      <-- jembatan sync 2 arah ke Google Sheet, baca INI dulu
    employees.ts          CRUD karyawan (database) -- dipanggil sekali per
                         request lalu di-passing sebagai parameter, bukan
                         di-fetch ulang di tiap helper
    constants.ts         aturan bisnis (polisi, piket, overtime) -- daftar
                         karyawan SUDAH PINDAH ke database, lihat employees.ts
    validators.ts         validasi aturan bisnis sebelum simpan jadwal
    prisma.ts            Prisma client singleton
  types/schedule.ts     model data (Employee, DaySchedule, LeaveRequest, SwapRequest)
  types/next-auth.d.ts  augmentasi tipe next-auth (employeeId, isSupervisor)
```

## Setup

### 1. Install dependency

```
npm install
```

### 2. Google Cloud -- OAuth (buat login SSO)

1. Buka [Google Cloud Console](https://console.cloud.google.com/) → buat project baru (atau pakai yang ada).
2. **APIs & Services → OAuth consent screen** → pilih Internal kalau tim kamu pakai Google Workspace, isi info dasar.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**, tipe Web application.
   - Authorized redirect URI: `http://localhost:3000/api/auth/callback/google` (tambahkan URL production nanti).
4. Salin Client ID & Client Secret ke `.env` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`).

### 3. Sinkron Google Sheet (Apps Script Web App)

Baca/tulis ke Sheet lewat **Apps Script Web App**, bukan Service Account --
ini menghindari kebijakan organisasi Google Cloud yang kadang memblokir
pembuatan key service account, dan tidak butuh project Cloud Console sama
sekali untuk bagian ini.

**PENTING**: buat script-nya sebagai project **berdiri sendiri** di
[script.google.com](https://script.google.com), login pakai **Gmail
pribadi** -- BUKAN lewat menu Extensions di dalam Sheet-nya. Kalau dibuat
dari dalam Sheet yang filenya milik akun Google Workspace kantor, Google
otomatis membatasi Web App-nya cuma bisa diakses akun dalam domain kantor
itu (URL-nya jadi ada `/a/macros/nama-domain/` di tengah), dan server
aplikasi kita tidak bisa "login" untuk lewat batasan itu.

1. Buka [script.google.com](https://script.google.com), pastikan login pakai Gmail pribadi kamu.
2. Klik **New project**.
3. Hapus kode default di editor yang muncul, tempel isi file
   [`apps-script/Code.gs`](apps-script/Code.gs) dari repo ini.
4. Ganti nilai `SECRET_TOKEN` dengan kata sandi acak buatan sendiri (bebas,
   asal panjang -- ini kayak API key). `SHEET_ID` sudah diisi sesuai sheet
   "Jadwal PS - ERP", tidak perlu diubah.
5. **Share sheet aslinya** (dari akun kantor) ke akun Gmail pribadi kamu:
   buka sheet-nya → **Share** → masukin email Gmail pribadi kamu → akses
   **Editor** → **Send**.
6. Di editor script, klik **Deploy → New deployment** → pilih tipe **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
7. Klik **Deploy**, lalu **Authorize access**.
8. Copy URL yang muncul -- pastikan bentuknya `https://script.google.com/macros/s/xxx/exec`
   (polos, **tanpa** `/a/macros/nama-domain/` di tengah -- kalau ada, berarti
   masih salah tempat buatnya, ulangi dari langkah 1).
9. Isi ke `.env`:
   - `APPS_SCRIPT_URL` = URL dari langkah 8
   - `APPS_SCRIPT_TOKEN` = `SECRET_TOKEN` yang kamu isi di langkah 4 (harus sama persis)
   - `GOOGLE_SHEET_TAB_NAME` = nama tab yang berisi jadwal

Setiap kali kamu ubah isi kode-nya, kamu perlu **Deploy → Manage deployments
→ Edit (ikon pensil) → New version → Deploy** supaya perubahannya kepakai
(URL Web App-nya tetap sama, tidak perlu update `.env` lagi).

### 4. Isi `.env`

```
cp .env.example .env
```

`NEXTAUTH_SECRET` bisa dibuat dengan `openssl rand -base64 32`. Kamu bisa
kosongkan dulu bagian Google (OAuth & Service Account) -- app otomatis jalan
di mock mode & dev-login (lihat "Status saat ini" di bawah) sampai kamu isi.

### 5. Siapkan database

Database pakai **Postgres** (bukan SQLite -- SQLite tidak cocok dipakai di
hosting serverless seperti Vercel karena filesystem-nya sementara). Untuk
lokal, paling gampang pakai instance cloud gratis juga (Neon/Vercel Postgres)
supaya sama persis dengan production -- isi `DATABASE_URL` di `.env` dengan
connection string-nya, lalu:

```
npx prisma migrate deploy
```

(pakai `migrate deploy`, bukan `migrate dev` -- `migrate dev` butuh terminal
interaktif yang kadang bermasalah di beberapa environment; migrasinya sudah
tersedia lengkap di `prisma/migrations/`, jadi `deploy` cukup.)

Setelah itu isi data karyawan awal:

```
node scripts/seed-employees.mjs
```

## Deploy ke Vercel

1. **Buat database Postgres** -- dari dashboard Vercel: buka project
   (setelah langkah 2 di bawah) → tab **Storage** → **Create Database** →
   pilih **Postgres** (Neon) → **Connect** ke project. Vercel otomatis
   mengisi beberapa env var (`POSTGRES_PRISMA_URL`, dst).
2. **Import project dari GitHub** -- buka [vercel.com/new](https://vercel.com/new),
   login/daftar, pilih **Import Git Repository**, pilih repo
   `jadwal-tim-app` kamu. Vercel otomatis mendeteksi ini project Next.js.
3. **Isi Environment Variables** (Project Settings → Environment Variables):
   - `DATABASE_URL` = connection string Postgres dari langkah 1 (pakai yang
     ada `?pgbouncer=true` / "Prisma"-nya kalau ditawarkan beberapa varian)
   - `NEXTAUTH_URL` = URL project Vercel kamu, mis. `https://jadwal-tim-app.vercel.app`
   - `NEXTAUTH_SECRET` = sama seperti nilai di `.env` lokal
   - `ALLOWED_GOOGLE_DOMAIN` = `esb.co.id`
   - `APPS_SCRIPT_URL`, `APPS_SCRIPT_TOKEN`, `GOOGLE_SHEET_TAB_NAME` = sama
     seperti di `.env` lokal
   - `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` boleh dikosongkan dulu untuk
     tahap uji coba (app otomatis jalan di mode dev-login).
4. **Ubah Build Command** (Project Settings → Build & Development Settings)
   jadi:
   ```
   npx prisma migrate deploy && npm run build
   ```
   supaya migrasi database ikut diterapkan otomatis tiap deploy.
5. Klik **Deploy**. Setelah selesai, buka URL-nya, login (dev-login), lalu
   jalankan `node scripts/seed-employees.mjs` sekali (dengan `DATABASE_URL`
   di `.env` lokal diarahkan sementara ke Postgres production) untuk isi
   data karyawan awal -- atau tambahkan manual lewat halaman `/team`.

Ini membuat `prisma/dev.db` (SQLite) sesuai `prisma/schema.prisma`.

### 6. Jalankan

```
npm run dev
```

Buka `http://localhost:3000`.

## Status saat ini

Sudah selesai: database Prisma+SQLite untuk leave/swap requests (ganti array
in-memory), alur approve/reject yang menyinkronkan hasil approved ke jadwal,
pembatasan akses `/assign`, `/approvals`, & `/team` khusus supervisor lewat
`middleware.ts`, `AssignGrid` yang tersambung ke jadwal asli + validasi +
simpan, form tukar jadwal, riwayat pengajuan di halaman `/requests`, dan
halaman **"Master Data Karyawan"** (`/team`) untuk kelola nama/email/status
supervisor/aktif-nonaktif karyawan sendiri tanpa edit kode -- data karyawan
sekarang di tabel `Employee` (Prisma), bukan lagi hardcode di
`lib/constants.ts`. Komponen client baca daftar karyawan lewat
`EmployeeProvider`/`useEmployees()` (fetch sekali dari `/api/employees`,
tanpa expose email); halaman server baca lewat `lib/employees.ts` langsung.

Selama `APPS_SCRIPT_URL`/`APPS_SCRIPT_TOKEN` belum diisi di `.env`,
`lib/googleSheets.ts` otomatis jalan di **mock mode**: data jadwal digenerate
& disimpan di memori supaya seluruh alur (dashboard, assign, approval) tetap
bisa dites secara lokal. Login juga punya **mode dev** (pilih nama dari
dropdown di `/login`) selama `GOOGLE_CLIENT_ID` belum diisi -- keduanya
otomatis mati sendiri begitu kredensial asli diisi.

**Sinkron ke Sheet asli sudah tersambung dan terverifikasi** (tab "Calendar
PS", kolom A-P, terkonfirmasi Agustus 2026) -- baca (`fetchScheduleRange`)
dan tulis (`writeDaySchedule`) sudah jalan lewat Apps Script Web App, dengan
optimasi baca cuma baris yang relevan (bukan seluruh sheet) supaya cepat &
tidak gampang timeout. Kolom "Off Middle" / "Off Monitoring" (catatan siapa
yang tidak boleh diassign role tertentu minggu itu) sudah ditegakkan lewat
`lib/validators.ts`. Kolom "Piket Sabtu" sengaja belum didukung (keputusan
produk saat ini).

**Kalender pribadi (Google Calendar) sudah ada** -- halaman `/calendar`
("Kalender saya", bisa diakses semua karyawan login) menampilkan link feed
`.ics` pribadi yang bisa di-subscribe di Google Calendar ("Kalender lain" ->
"Dari URL"). Begitu disubscribe, jadwal orang itu sendiri (Polisi, Middle,
Piket, GH, Cuti, Libur/OT) otomatis muncul di kalender mereka, dan Google
akan refresh feed itu sendiri tiap beberapa jam. Implementasinya:
- `Employee.calendarToken` (kolom baru, nullable+unique) -- token acak per
  karyawan, dibuat otomatis pertama kali mereka buka `/calendar`
  (`getEmployeeCalendarToken` di `lib/employees.ts`).
- `GET /api/calendar/[token]` -- endpoint publik TANPA cek sesi login (Google
  Calendar butuh akses tanpa cookie), keamanannya ada di token acak itu
  sendiri di URL. Baca jadwal 14 hari ke belakang s/d 90 hari ke depan lewat
  `fetchScheduleRange`, lalu diubah jadi teks `.ics` oleh `lib/ics.ts`.
- Sengaja pakai feed read-only (bukan push 2 arah lewat Calendar API +
  OAuth) supaya tidak perlu scope Google tambahan / consent ulang dari tiap
  karyawan -- trade-off-nya refresh tidak instan (tergantung jadwal polling
  Google, biasa beberapa jam sekali).

## Yang masih perlu dikerjakan (lanjutkan di Claude Code)

1. **Email karyawan** -- buka `/team` (login sebagai supervisor, misal Diana
   atau Leonardi) dan ganti tiap email placeholder (`@namaperusahaan.com`) ke
   email company asli tiap orang (`nama@esb.co.id`), supaya begitu
   `GOOGLE_CLIENT_ID` diisi, login SSO bisa mencocokkan akun ke email yang
   benar. `ALLOWED_GOOGLE_DOMAIN` di `.env` sudah diset ke `esb.co.id`.
2. **Notifikasi WhatsApp (fase 2)** -- setelah v1 stabil, integrasikan vendor
   seperti Fonnte/Wablas/Qontak, atau WhatsApp Business API resmi kalau tim
   sudah siap dengan verifikasi bisnis Meta.
3. **Kuota cuti tahunan (fase 2)** -- tambahkan field `leaveQuota` di `Employee`
   dan logika hitung sisa cuti otomatis.
4. **Piket Sabtu** -- kolom sudah ada di sheet tapi sengaja belum didukung
   aplikasi (keputusan produk saat ini) -- tambahkan kalau nanti dibutuhkan.
5. **Import histori 2024-2025** -- data historis sebelum Januari 2025 (kalau
   ada di tab/sheet terpisah) belum diimport ke sistem baru.
6. **ESLint** -- belum pernah dikonfigurasi di project ini (`npm run lint`
   akan minta setup interaktif). Jalankan `npx next lint` dan ikuti wizard-nya
   kalau mau linting aktif.

## Deploy

Direkomendasikan [Vercel](https://vercel.com) -- cukup connect repo GitHub,
lalu isi semua environment variable dari `.env` di dashboard Vercel. Jangan lupa
update `NEXTAUTH_URL` dan Authorized redirect URI OAuth ke domain production.

**Penting soal database**: SQLite (`DATABASE_URL="file:./dev.db"`) cocok untuk
lokal, tapi filesystem Vercel bersifat sementara/read-only di production --
data leave/swap request bakal hilang. Sebelum deploy, ganti `DATABASE_URL` ke
Postgres (misalnya [Supabase](https://supabase.com) atau
[Neon](https://neon.tech)), lalu jalankan `npx prisma migrate deploy` sekali
untuk membuat tabelnya di database baru itu.
