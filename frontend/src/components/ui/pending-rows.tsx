import { Skeleton } from "@/components/ui/skeleton";

// keeps the header mounted while data loads, so a filter change cannot jump the panel
export function PendingRows({ columns, rows = 3 }: { columns: number; rows?: number }) {
  return (
    <tbody>
      {Array.from({ length: rows }, (_, row) => (
        <tr key={`pending-${row}`} className="border-b last:border-0">
          {Array.from({ length: columns }, (_, column) => (
            <td key={`pending-${row}-${column}`} className="px-4 py-3">
              <Skeleton className="h-3.5 w-full max-w-32" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}
