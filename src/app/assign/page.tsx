import AssignGrid from "@/components/AssignGrid";
import { PencilIcon } from "@/components/icons";

export default function AssignPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-1">Khusus supervisor/manager</p>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-ink">
          <PencilIcon className="h-5 w-5 text-accent" />
          Assign jadwal
        </h1>
      </div>
      <AssignGrid />
    </div>
  );
}
