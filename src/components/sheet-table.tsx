import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SheetData } from "@/lib/google-sheets";

export function SheetTable({ data }: { data: SheetData }) {
  if (data.headers.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-12">
        This spreadsheet is empty.
      </p>
    );
  }

  return (
    <div className="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {data.headers.map((header, i) => (
              <TableHead key={i}>{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={data.headers.length}
                className="text-center text-muted-foreground h-24"
              >
                No data rows found.
              </TableCell>
            </TableRow>
          ) : (
            data.rows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {data.headers.map((_, colIndex) => (
                  <TableCell key={colIndex}>
                    {row[colIndex] ?? ""}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
