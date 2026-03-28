import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { SpreadsheetFile } from "@/lib/google-sheets";

export function SpreadsheetPicker({ sheets }: { sheets: SpreadsheetFile[] }) {
  if (sheets.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-12">
        No spreadsheets found in your Google Drive.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sheets.map((sheet) => (
        <Link key={sheet.id} href={`/dashboard/sheet/${sheet.id}`}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="text-base truncate">{sheet.name}</CardTitle>
              <CardDescription>
                Last modified{" "}
                {new Date(sheet.modifiedTime).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  );
}
