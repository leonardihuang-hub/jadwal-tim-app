import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchScheduleRange, writeDaySchedule } from "@/lib/googleSheets";
import { syncDayToCalendars } from "@/lib/googleCalendarSync";
import type { DaySchedule } from "@/types/schedule";

// Endpoint tunggal buat approve/reject, baik untuk leave request maupun
// swap request -- sesuai keputusan tim: cukup 1 approver, tidak berjenjang.
const decisionSchema = z.object({
  requestId: z.string(),
  requestKind: z.enum(["leave", "swap"]),
  decision: z.enum(["approved", "rejected"])
});

function applyLeaveToDay(day: DaySchedule, type: string, employeeId: string): DaySchedule {
  if (type === "cuti" && !day.cutiEmployeeIds.includes(employeeId)) {
    return { ...day, cutiEmployeeIds: [...day.cutiEmployeeIds, employeeId] };
  }
  if (type === "ganti_hari" && !day.gantiHariEmployeeIds.includes(employeeId)) {
    return { ...day, gantiHariEmployeeIds: [...day.gantiHariEmployeeIds, employeeId] };
  }
  return day;
}

function applySwapToDay(day: DaySchedule, kind: string, requesterId: string, targetId: string): DaySchedule {
  if (kind === "shift") {
    const next = { ...day };
    if (next.shiftPagiPolisi === requesterId) next.shiftPagiPolisi = targetId;
    else if (next.shiftPagiPolisi === targetId) next.shiftPagiPolisi = requesterId;
    if (next.shiftMiddle === requesterId) next.shiftMiddle = targetId;
    else if (next.shiftMiddle === targetId) next.shiftMiddle = requesterId;
    return next;
  }
  // kind === "ganti_hari": target menggantikan requester di jadwal ganti hari hari itu.
  const gantiHariEmployeeIds = day.gantiHariEmployeeIds
    .filter((id) => id !== requesterId)
    .concat(day.gantiHariEmployeeIds.includes(requesterId) ? [targetId] : []);
  return { ...day, gantiHariEmployeeIds };
}

// Setelah DB diupdate ke approved, coba sinkron hasilnya ke Google Sheet.
// Ini best-effort: kalau writeDaySchedule gagal (misalnya kredensial Sheets
// API belum diisi), approval di DB tetap valid -- cuma gagal disinkron, dan
// itu di-log supaya ketahuan lalu bisa disinkron ulang manual nanti.
async function syncApprovedToSheet(date: string, mutate: (day: DaySchedule) => DaySchedule) {
  try {
    const [day] = await fetchScheduleRange(date, date);
    if (!day) return;
    const nextDay = mutate(day);
    await writeDaySchedule(nextDay);
    try {
      await syncDayToCalendars(day, nextDay);
    } catch (err) {
      console.error(`Gagal push kalender untuk approval tanggal ${date}:`, err);
    }
  } catch (err) {
    console.error(`Gagal sinkron approval tanggal ${date} ke Google Sheet:`, err);
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const isSupervisor = session?.user?.isSupervisor;
  const approverId = session?.user?.employeeId;
  if (!session || !isSupervisor) {
    return NextResponse.json(
      { error: "Hanya supervisor/manager yang bisa approve atau reject." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const parsed = decisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { requestId, requestKind, decision } = parsed.data;

  if (requestKind === "leave") {
    const existing = await prisma.leaveRequest.findUnique({ where: { id: requestId } });
    if (!existing) {
      return NextResponse.json({ error: "Pengajuan tidak ditemukan." }, { status: 404 });
    }
    const updated = await prisma.leaveRequest.update({
      where: { id: requestId },
      data: { status: decision, approverId, decidedAt: new Date() }
    });

    if (decision === "approved") {
      await syncApprovedToSheet(updated.date, (day) => applyLeaveToDay(day, updated.type, updated.employeeId));
    }
  } else {
    const existing = await prisma.swapRequest.findUnique({ where: { id: requestId } });
    if (!existing) {
      return NextResponse.json({ error: "Pengajuan tidak ditemukan." }, { status: 404 });
    }
    const updated = await prisma.swapRequest.update({
      where: { id: requestId },
      data: { status: decision, approverId, decidedAt: new Date() }
    });

    if (decision === "approved") {
      await syncApprovedToSheet(updated.date, (day) =>
        applySwapToDay(day, updated.kind, updated.requesterId, updated.targetId)
      );
    }
  }

  // TODO: trigger notifikasi ke pemohon (dashboard, lalu WhatsApp di fase 2)
  return NextResponse.json({ ok: true, requestId, requestKind, decision });
}
