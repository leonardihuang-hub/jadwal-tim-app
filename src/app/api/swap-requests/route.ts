import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { format } from "date-fns";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SwapRequest } from "@/types/schedule";

const createSchema = z.object({
  targetId: z.string(),
  date: z.string(),
  kind: z.enum(["shift", "ganti_hari"])
});

function toSwapRequest(row: {
  id: string;
  requesterId: string;
  targetId: string;
  date: string;
  kind: string;
  status: string;
  approverId: string | null;
  createdAt: Date;
  decidedAt: Date | null;
}): SwapRequest {
  return {
    id: row.id,
    requesterId: row.requesterId,
    targetId: row.targetId,
    date: row.date,
    kind: row.kind as SwapRequest["kind"],
    status: row.status as SwapRequest["status"],
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

  const employeeId = session.user?.employeeId;
  const isSupervisor = session.user?.isSupervisor;
  const { searchParams } = new URL(req.url);
  const onlyMine = searchParams.get("mine") === "1";
  const incoming = searchParams.get("incoming") === "1";

  // incoming=1 -- notifikasi buat orang yang DIAJAK tukar (bukan pengaju).
  // Selalu dikunci ke diri sendiri, terlepas dari isSupervisor, karena ini
  // pemberitahuan pribadi bukan tampilan admin.
  if (incoming) {
    if (!employeeId) {
      return NextResponse.json({ error: "Akun tidak terdaftar sebagai karyawan." }, { status: 403 });
    }
    const rows = await prisma.swapRequest.findMany({
      where: { targetId: employeeId, status: "pending" },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json({ requests: rows.map(toSwapRequest) });
  }

  if (!isSupervisor && !employeeId) {
    return NextResponse.json({ error: "Akun tidak terdaftar sebagai karyawan." }, { status: 403 });
  }

  const rows = await prisma.swapRequest.findMany({
    where: !isSupervisor || onlyMine ? { requesterId: employeeId } : undefined,
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ requests: rows.map(toSwapRequest) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }
  const requesterId = session.user?.employeeId;
  if (!requesterId) {
    return NextResponse.json({ error: "Akun tidak terdaftar sebagai karyawan." }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.targetId === requesterId) {
    return NextResponse.json({ error: "Tidak bisa tukar jadwal dengan diri sendiri." }, { status: 400 });
  }

  const todayIso = format(new Date(), "yyyy-MM-dd");
  if (parsed.data.date < todayIso) {
    return NextResponse.json(
      { error: "Tidak bisa mengajukan untuk tanggal yang sudah lewat." },
      { status: 400 }
    );
  }

  const row = await prisma.swapRequest.create({
    data: {
      requesterId,
      targetId: parsed.data.targetId,
      date: parsed.data.date,
      kind: parsed.data.kind,
      status: "pending"
    }
  });

  return NextResponse.json({ request: toSwapRequest(row) }, { status: 201 });
}
