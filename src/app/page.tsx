import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SignInButton } from "@/components/sign-in-button";

const features = [
  {
    icon: "📊",
    title: "Spending Insights",
    description:
      "Totals, averages, and per-merchant breakdowns across all your transactions.",
  },
  {
    icon: "📅",
    title: "Monthly Trends",
    description:
      "Visualize your spending month over month to spot patterns instantly.",
  },
  {
    icon: "💳",
    title: "Card Breakdown",
    description:
      "See exactly how much you're spending on each card at a glance.",
  },
];

export default async function Home() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <div className="flex flex-col min-h-screen">
      {/* Nav */}
      <header className="px-6 py-5 flex items-center">
        <span className="font-bold text-lg tracking-tight text-primary">
          Finance Tracker
        </span>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center gap-10">
        {/* Badge */}
        <span className="text-xs font-medium px-3 py-1 rounded-full bg-primary/15 text-primary border border-primary/25">
          Powered by Google Sheets
        </span>

        <div className="space-y-5 max-w-xl">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight">
            Know where your{" "}
            <span className="text-primary">money goes.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
            Connect your Google Sheet and get instant spending analytics — no
            imports, no new tools, no hassle.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <SignInButton />
          <p className="text-xs text-muted-foreground">
            Read-only access · Nothing is stored
          </p>
        </div>
      </main>

      {/* Features */}
      <section className="px-6 py-16 max-w-4xl mx-auto w-full">
        <div className="grid sm:grid-cols-3 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-card rounded-2xl border p-6 space-y-3 shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center text-xl">
                {f.icon}
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t px-6 py-5 text-center text-xs text-muted-foreground">
        Finance Tracker — personal use
      </footer>
    </div>
  );
}
