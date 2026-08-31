import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { createEmployee, getEmployees } from "@/lib/employees";

// Khusus supervisor -- dipakai halaman /team (Master Data Karyawan). Beda
// dari GET /api/employees (publik) karena ikut kirim email.
async function requireSupervisor() {
  const session = await getServerSession(authOptions);
  return session?.user?.isSupervisor ? session : null;
}

export async function GET() {
  const session = await requireSupervisor();
  if (!session) {
    return NextResponse.json({ error: "Hanya supervisor/manager yang bisa lihat master data karyawan." }, { status: 403 });
  }
  const employees = await getEmployees();
  return NextResponse.json({ employees });
}

const createSchema = z.object({
  id: z
    .string()
    .min(1, "Slug wajib diisi.")
    .regex(/^[a-z0-9-]+$/, "Slug cuma boleh huruf kecil, angka, dan tanda hubung."),
  name: z.string().min(1, "Nama wajib diisi."),
  email: z.string().email("Format email tidak valid."),
  isSupervisor: z.boolean().optional().default(false)
});

export async function POST(req: NextRequest) {
  const session = await requireSupervisor();
  if (!session) {
    return NextResponse.json({ error: "Hanya supervisor/manager yang bisa menambah karyawan." }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const employee = await createEmployee(parsed.data);
    return NextResponse.json({ employee }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Gagal menambah karyawan -- slug atau email mungkin sudah dipakai." },
      { status: 400 }
    );
  }
}
