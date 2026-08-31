import ApprovalQueue from "@/components/ApprovalQueue";
import { CheckCircleIcon } from "@/components/icons";

export default function ApprovalsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-1">Khusus supervisor/manager</p>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-ink">
          <CheckCircleIcon className="h-5 w-5 text-accent" />
          Antrian approval
        </h1>
      </div>
      <ApprovalQueue />
    </div>
  );
}
