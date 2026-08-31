import type { DaySchedule, PublicEmployee } from "@/types/schedule";

export default function TodayOverview({ day, employees }: { day: DaySchedule; employees: PublicEmployee[] }) {
  function nameOf(id?: string) {
    if (!id) return "Belum diisi";
    return employees.find((e) => e.id === id)?.name ?? id;
  }

  const cards = [
    { label: "Pagi / polisi", value: nameOf(day.shiftPagiPolisi), borderClass: "border-l-blue-400" },
    { label: "Shift middle", value: nameOf(day.shiftMiddle), borderClass: "border-l-violet-400" },
    {
      label: "Cuti",
      value: day.cutiEmployeeIds.length ? day.cutiEmployeeIds.map(nameOf).join(", ") : "-",
      borderClass: "border-l-warning"
    },
    {
      label: "Ganti hari",
      value: day.gantiHariEmployeeIds.length ? day.gantiHariEmployeeIds.map(nameOf).join(", ") : "-",
      borderClass: "border-l-pink-400"
    }
  ];

  if (day.isHoliday) {
    cards.push({
      label: `Overtime (${day.holidayName ?? "tanggal merah"})`,
      value: day.overtimeEmployeeIds.length ? day.overtimeEmployeeIds.map(nameOf).join(", ") : "Belum diisi",
      borderClass: "border-l-danger"
    });
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((c) => (
        <div key={c.label} className={`card border-l-4 p-4 ${c.borderClass}`}>
          <p className="eyebrow mb-2">{c.label}</p>
          <p className="text-base font-medium leading-snug text-ink">{c.value}</p>
        </div>
      ))}
    </div>
  );
}
