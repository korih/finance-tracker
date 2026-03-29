import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Finance Tracker",
};

const EFFECTIVE_DATE = "March 28, 2026";
const CONTACT_EMAIL = "privacy@finance-tracker.korih.com";
const APP_NAME = "Finance Tracker";
const APP_URL = "https://finance-tracker.korih.com";

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-6 py-5 border-b flex items-center gap-4">
        <Link href="/" className="font-semibold text-lg tracking-tight text-foreground">
          {APP_NAME}
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground text-sm">Privacy Policy</span>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12">
        <div className="space-y-2 mb-10">
          <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Effective date: {EFFECTIVE_DATE}</p>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed">

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">1. Overview</h2>
            <p>
              {APP_NAME} ("{APP_NAME}", "we", "us", or "our") is a personal finance tracking
              application. This Privacy Policy explains what information we collect, how we use it,
              and the choices you have. By using {APP_NAME} you agree to the practices described
              here.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">2. Information We Collect</h2>
            <h3 className="font-medium">2.1 Account Information</h3>
            <p>
              When you sign in with Google OAuth we receive your Google account ID (a stable numeric
              identifier), your name, and your email address as provided by Google. We store your
              Google account ID and email solely to identify your account. We do not receive, store,
              or have access to your Google password.
            </p>
            <h3 className="font-medium">2.2 Financial Data</h3>
            <p>
              All financial data you enter — transactions, income entries, categories, recurring
              rules, and savings goals — is stored in our database on Cloudflare&apos;s
              infrastructure. You control this data entirely: you create it, you can delete it.
            </p>
            <h3 className="font-medium">2.3 API Usage Data</h3>
            <p>
              If you use the ingest API to submit transactions programmatically, we log the
              parameters of each request (merchant, amount, card label, timestamp) as part of
              creating the transaction record. We also record the time of each API request to
              enforce rate limits.
            </p>
            <h3 className="font-medium">2.4 Technical Data</h3>
            <p>
              Our hosting provider (Cloudflare) may collect standard server logs including IP
              addresses, browser type, and request timestamps as part of operating the service.
              These logs are governed by{" "}
              <a
                href="https://www.cloudflare.com/privacypolicy/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Cloudflare&apos;s Privacy Policy
              </a>
              .
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>To authenticate you and associate your data with your account.</li>
              <li>To display, calculate, and analyse your financial data as requested.</li>
              <li>To enforce subscription tier limits (free plan: 200 entries).</li>
              <li>To enforce API rate limits and prevent abuse.</li>
              <li>To operate, maintain, and improve the service.</li>
            </ul>
            <p>
              We do <strong>not</strong> sell, rent, or share your personal or financial data with
              third parties for advertising or marketing purposes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">4. Data Retention</h2>
            <p>
              Your data is retained for as long as your account exists. If you wish to delete your
              account and all associated data, contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
                {CONTACT_EMAIL}
              </a>{" "}
              and we will permanently delete your records within 30 days.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">5. Data Security</h2>
            <p>
              We store data in Cloudflare D1 (SQLite) hosted in Cloudflare&apos;s infrastructure,
              which provides encryption at rest and in transit (TLS). Access to your data is
              restricted to your authenticated session. API access requires a secret API key that
              you can regenerate at any time.
            </p>
            <p>
              No system is perfectly secure. We implement reasonable technical safeguards but cannot
              guarantee absolute security.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">6. Third-Party Services</h2>
            <p>We use the following third-party services to operate {APP_NAME}:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>
                <strong>Google OAuth</strong> — for authentication only. Google&apos;s use of the
                data it shares with us is governed by{" "}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Google&apos;s Privacy Policy
                </a>
                .
              </li>
              <li>
                <strong>Cloudflare Workers / D1 / KV</strong> — for compute, database, and
                key-value storage. Governed by{" "}
                <a
                  href="https://www.cloudflare.com/privacypolicy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Cloudflare&apos;s Privacy Policy
                </a>
                .
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Access the personal data we hold about you.</li>
              <li>Correct inaccurate data.</li>
              <li>Request deletion of your account and all associated data.</li>
              <li>Export your financial data (available within the app).</li>
            </ul>
            <p>
              To exercise any of these rights, contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">8. Children&apos;s Privacy</h2>
            <p>
              {APP_NAME} is not directed to children under the age of 13. We do not knowingly
              collect personal information from children. If you believe a child has provided us
              with personal information, please contact us and we will delete it promptly.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. When we do, we will update the
              effective date at the top of this page. Continued use of {APP_NAME} after changes
              constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">10. Contact</h2>
            <p>
              For any privacy-related questions or requests, contact us at:{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
                {CONTACT_EMAIL}
              </a>
            </p>
          </section>

        </div>
      </main>

      <footer className="border-t px-6 py-5 text-center text-xs text-muted-foreground space-x-4">
        <Link href="/" className="hover:underline">Home</Link>
        <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
        <Link href="/terms" className="hover:underline">Terms of Service</Link>
      </footer>
    </div>
  );
}
