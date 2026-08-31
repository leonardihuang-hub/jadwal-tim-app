import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { format } from "date-fns";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { LeaveRequest } from "@/types/schedule";

// Kenapa request/approval TIDAK langsung ditulis ke Google Sheet?
// Karena Sheet sebaiknya cuma menyimpan jadwal yang SUDAH final/approved
// (itu yang dibaca lib/googleSheets.ts). Alur pending -> approved lebih
// aman disimpan di database dulu, baru begitu approved, backend memanggil
// writeDaySchedule() untuk menulis hasil akhirnya ke Sheet (lihat
// api/approvals/route.ts).

const createSchema = z.object({
  type: z.enum(["cuti", "ganti_hari"]),
  date: z.string(),
  reason: z.string().min(1, "Alasan wajib diisi.")
});

function toLeaveRequest(row: {
  id: string;
  employeeId: string;
  type: string;
  date: string;
  reason: string;
  status: string;
  approverId: string | null;
  createdAt: Date;
  decidedAt: Date | null;
}): LeaveRequest {
  return {
    id: row.id,
    employeeId: row.employeeId,
    type: row.type as LeaveRequest["type"],
    date: row.date,
    reason: row.reason,
    status: row.status as LeaveRequest["status"],
    approverId: row.approverId ?? undefined,
    createdAt: row.createdAt.toISOString(),
    decidedAt: row.decidedAt?.toISOString()
  };
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  // Karyawan biasa cuma lihat pengajuan miliknya sendiri; supervisor bisa
  // lihat semua (dipakai ApprovalQueue). ?mine=1 memaksa filter ke diri sendiri.
  const employeeId = session.user?.employeeId;
  const isSupervisor = session.user?.isSupervisor;
  const onlyMine = new URL(req.url).searchParams.get("mine") === "1";
  if (!isSupervisor && !employeeId) {
    return NextResponse.json({ error: "Akun tidak terdaftar sebagai karyawan." }, { status: 403 });
  }

  const rows = await prisma.leaveRequest.findMany({
    where: !isSupervisor || onlyMine ? { employeeId } : undefined,
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ requests: rows.map(toLeaveRequest) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }
  const employeeId = session.user?.employeeId;
  if (!employeeId) {
    return NextResponse.json({ error: "Akun tidak terdaftar sebagai karyawan." }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const todayIso = format(new Date(), "yyyy-MM-dd");
  if (parsed.data.date < todayIso) {
    return NextResponse.json(
      { error: "Tidak bisa mengajukan untuk tanggal yang sudah lewat." },
      { status: 400 }
    );
  }

  const row = await prisma.leaveRequest.create({
    data: {
      employeeId,
      type: parsed.data.type,
      date: parsed.data.date,
      reason: parsed.data.reason,
      status: "pending"
    }
  });

  // TODO: kirim notifikasi ke supervisor (dashboard + nanti WhatsApp di fase 2)
  return NextResponse.json({ request: toLeaveRequest(row) }, { status: 201 });
}
