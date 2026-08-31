import RequestForm from "@/components/RequestForm";
import RequestHistory from "@/components/RequestHistory";
import { ClipboardListIcon } from "@/components/icons";

export default function RequestsPage() {
  return (
    <div className="space-y-10">
      <div>
        <p className="eyebrow mb-1">Kamu</p>
        <h1 className="text-2xl font-semibold text-ink">Pengajuan saya</h1>
      </div>

      <section className="card max-w-xl space-y-4 border-l-4 border-l-warning p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <ClipboardListIcon className="h-4 w-4 text-warning" />
          Ajukan cuti, ganti hari, atau tukar jadwal
        </h2>
        <RequestForm />
      </section>

      <RequestHistory />
    </div>
  );
}
