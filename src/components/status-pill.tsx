import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  draft: "border-gray-300 bg-gray-100 text-gray-700",
  submitted: "border-yellow-300 bg-yellow-100 text-yellow-700",
  rejected: "border-red-300 bg-red-100 text-red-700",
  approved: "border-blue-300 bg-blue-100 text-blue-700",
  published: "border-green-300 bg-green-100 text-green-700",
  scheduled: "border-purple-300 bg-purple-100 text-purple-700"
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex rounded-full border px-2 py-1 text-xs font-semibold", styles[status] ?? styles.draft)}>
      {status}
    </span>
  );
}
