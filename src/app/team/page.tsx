import EmployeeMasterTable from "@/components/EmployeeMasterTable";
import { ClipboardListIcon } from "@/components/icons";

export default function TeamPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-1">Khusus supervisor/manager</p>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-ink">
          <ClipboardListIcon className="h-5 w-5 text-accent" />
          Master Data Karyawan
        </h1>
        <p className="mt-1 text-sm text-ink/60">
          Kelola nama, email login (@esb.co.id), status supervisor, dan aktif/nonaktif tiap karyawan.
        </p>
      </div>
      <EmployeeMasterTable />
    </div>
  );
}
