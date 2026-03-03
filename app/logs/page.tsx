import { LogTable } from "@/components/LogTable";

export default function LogsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Action Logs</h1>
        <p className="text-muted-foreground">
          Complete audit trail of all system actions
        </p>
      </div>
      <LogTable />
    </div>
  );
}
