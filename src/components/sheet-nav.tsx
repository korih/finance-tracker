import Link from "next/link";
import { cn } from "@/lib/utils";

type NavTab = "budget" | "expenses" | "income" | "overview";

const TABS: { value: NavTab; label: string; href: (id: string) => string }[] = [
  { value: "budget",   label: "Budget",   href: (id) => `/dashboard/sheet/${id}/budget` },
  { value: "overview", label: "Overview", href: (id) => `/dashboard/sheet/${id}/overview` },
  { value: "expenses", label: "Expenses", href: (id) => `/dashboard/sheet/${id}/expenses` },
  { value: "income",   label: "Income",   href: (id) => `/dashboard/sheet/${id}/income` },
];

export function SheetNav({ sheetId, active }: { sheetId: string; active: NavTab }) {
  return (
    <nav className="flex gap-1 border-b">
      {TABS.map((tab) => (
        <Link
          key={tab.value}
          href={tab.href(sheetId)}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            active === tab.value
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
