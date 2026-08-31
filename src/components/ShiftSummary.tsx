import { ChartBarIcon } from "@/components/icons";
import type { DaySchedule, PublicEmployee } from "@/types/schedule";

type Counts = { polisi: number; middle: number; piket: number; gh: number; cuti: number; ot: number };

function emptyCounts(): Counts {
  return { polisi: 0, middle: 0, piket: 0, gh: 0, cuti: 0, ot: 0 };
}

// Rekap total shift per orang untuk rentang tanggal yang sedang ditampilkan
// (biasanya 1 bulan) -- supaya supervisor bisa lihat sekilas pembagian
// beban kerja (Polisi/Middle/Piket/OT) dan absensi (GH/Cuti) sudah rata
// atau belum.
export default function ShiftSummary({
  days,
  employees
}: {
  days: DaySchedule[];
  employees: PublicEmployee[];
}) {
  const counts = new Map<string, Counts>();
  function bump(id: string | undefined, key: keyof Counts) {
    if (!id) return;
    const c = counts.get(id) ?? emptyCounts();
    c[key] += 1;
    counts.set(id, c);
  }

  for (const day of days) {
    bump(day.shiftPagiPolisi, "polisi");
    bump(day.shiftMiddle, "middle");
    bump(day.piketMinggu, "piket");
    day.gantiHariEmployeeIds.forEach((id) => bump(id, "gh"));
    day.cutiEmployeeIds.forEach((id) => bump(id, "cuti"));
    day.overtimeEmployeeIds.forEach((id) => bump(id, "ot"));
  }

  const rows = employees.filter((e) => e.isActive)
    .map((e) => {
      const c = counts.get(e.id) ?? emptyCounts();
      return { id: e.id, name: e.name, ...c, total: c.polisi + c.middle };
    })
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  // Angka 0 ditampilkan sebagai "-" (abu-abu, tidak diwarnai) supaya baris
  // yang padat tidak penuh nol dan lebih gampang lihat yang ada isinya.
  function cell(value: number, colorClass: string) {
    if (value === 0) return <span className="text-ink/30">-</span>;
    return <span className={colorClass}>{value}</span>;
  }

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-line px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <ChartBarIcon className="h-4 w-4 text-accent" />
          Rekap shift periode ini
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-paper text-left text-xs font-semibold uppercase tracking-wide text-ink/40">
              <th className="px-4 py-2">Nama</th>
              <th className="px-4 py-2 text-blue-400">Polisi</th>
              <th className="px-4 py-2 text-violet-400">Middle</th>
              <th className="px-4 py-2 text-teal-400">Piket</th>
              <th className="px-4 py-2 text-pink-400">GH</th>
              <th className="px-4 py-2 text-warning">Cuti</th>
              <th className="px-4 py-2 text-danger">Libur/OT</th>
              <th className="px-4 py-2">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2 font-medium text-ink">{r.name}</td>
                <td className="px-4 py-2">{cell(r.polisi, "text-blue-400")}</td>
                <td className="px-4 py-2">{cell(r.middle, "text-violet-400")}</td>
                <td className="px-4 py-2">{cell(r.piket, "text-teal-400")}</td>
                <td className="px-4 py-2">{cell(r.gh, "text-pink-400")}</td>
                <td className="px-4 py-2">{cell(r.cuti, "text-warning")}</td>
                <td className="px-4 py-2">{cell(r.ot, "text-danger")}</td>
                <td className="px-4 py-2 font-medium">{cell(r.total, "text-ink")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-line px-4 py-2 text-xs text-ink/40">
        Total = Polisi + Middle (indikator beban kerja shift utama).
      </p>
    </div>
  );
}
