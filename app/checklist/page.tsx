import { ChecklistPanel } from "@/components/ChecklistPanel";

export default function ChecklistPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Daily Checklist</h1>
        <p className="text-muted-foreground">
          Morning prep checklist for VIP conference rooms
        </p>
      </div>
      <ChecklistPanel />
    </div>
  );
}
