import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { updateEmployee } from "@/lib/employees";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email("Format email tidak valid.").optional(),
  isActive: z.boolean().optional(),
  isSupervisor: z.boolean().optional()
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isSupervisor) {
    return NextResponse.json({ error: "Hanya supervisor/manager yang bisa mengubah karyawan." }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const employee = await updateEmployee(params.id, parsed.data);
    return NextResponse.json({ employee });
  } catch {
    return NextResponse.json(
      { error: "Gagal menyimpan -- karyawan tidak ditemukan atau email sudah dipakai orang lain." },
      { status: 400 }
    );
  }
}
