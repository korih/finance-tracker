import Link from "next/link";

export const metadata = {
  title: "Terms of Service — Finance Tracker",
};

const EFFECTIVE_DATE = "March 28, 2026";
const CONTACT_EMAIL = "support@finance-tracker.korih.com";
const APP_NAME = "Finance Tracker";

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-6 py-5 border-b flex items-center gap-4">
        <Link href="/" className="font-semibold text-lg tracking-tight text-foreground">
          {APP_NAME}
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground text-sm">Terms of Service</span>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12">
        <div className="space-y-2 mb-10">
          <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">Effective date: {EFFECTIVE_DATE}</p>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed">

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">1. Acceptance of Terms</h2>
            <p>
              By accessing or using {APP_NAME} ("the Service"), you agree to be bound by these
              Terms of Service ("Terms"). If you do not agree, do not use the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">2. Description of Service</h2>
            <p>
              {APP_NAME} is a personal finance tracking tool that allows you to record transactions,
              income, savings goals, and spending categories. It provides analytics and visualisations
              based on data you enter. The Service is provided on a free and premium subscription
              basis.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">3. Eligibility</h2>
            <p>
              You must be at least 13 years of age to use the Service. By using the Service, you
              represent that you meet this requirement.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">4. Account Responsibilities</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials,
              including your API key. You are responsible for all activity that occurs under your
              account. Notify us immediately at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
                {CONTACT_EMAIL}
              </a>{" "}
              if you suspect unauthorised access.
            </p>
            <p>
              You may not share your account or API key with others or use the Service on behalf of
              third parties without our prior written consent.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">5. Subscription Plans</h2>
            <h3 className="font-medium">5.1 Free Plan</h3>
            <p>
              Free accounts may store up to 200 combined transaction and income entries. Once this
              limit is reached, new entries cannot be added until existing entries are deleted or
              you upgrade to a premium plan.
            </p>
            <h3 className="font-medium">5.2 Premium Plan</h3>
            <p>
              Premium accounts have no entry limit. Pricing and payment terms for premium subscriptions
              will be communicated separately at the time of purchase.
            </p>
            <h3 className="font-medium">5.3 Changes to Plans</h3>
            <p>
              We reserve the right to modify plan limits or introduce new plans at any time. We will
              provide reasonable notice of any material changes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">6. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Use the Service for any unlawful purpose.</li>
              <li>Attempt to gain unauthorised access to any part of the Service or its infrastructure.</li>
              <li>Interfere with or disrupt the Service or servers or networks connected to it.</li>
              <li>Reverse-engineer, decompile, or attempt to extract the source code of the Service.</li>
              <li>Use automated tools to scrape or abuse the API beyond normal personal use.</li>
              <li>Submit false, misleading, or malicious data through the ingest API.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">7. API Usage</h2>
            <p>
              The ingest API is provided for personal automation (e.g. forwarding bank notifications).
              It is subject to rate limits to ensure fair use. Excessive or abusive API usage may
              result in temporary or permanent suspension of API access or your account.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">8. Your Data</h2>
            <p>
              You retain full ownership of all financial data you enter into the Service. We do not
              claim any rights over your data. You are solely responsible for the accuracy of your
              data. We provide the Service as a tool; financial decisions based on data in the Service
              are your own responsibility.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">9. No Financial Advice</h2>
            <p>
              {APP_NAME} is a data organisation and visualisation tool only. Nothing in the Service
              constitutes financial, investment, tax, or legal advice. Always consult a qualified
              professional for advice specific to your situation.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">10. Intellectual Property</h2>
            <p>
              The Service, including its design, code, and content (excluding your data), is owned
              by us and protected by applicable intellectual property laws. You may not copy,
              redistribute, or create derivative works from any part of the Service without our
              express written permission.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">11. Disclaimers</h2>
            <p>
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTY OF ANY KIND,
              EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY,
              FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
            <p>
              We do not warrant that the Service will be uninterrupted, error-free, or that data
              will never be lost. You are responsible for maintaining backups of any important data.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">12. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, WE SHALL NOT BE LIABLE FOR ANY
              INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS
              OF DATA, REVENUE, OR PROFITS, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE
              SERVICE, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">13. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your access to the Service at any time
              for violation of these Terms or for any other reason at our discretion. You may
              terminate your account at any time by contacting us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">14. Changes to Terms</h2>
            <p>
              We may update these Terms at any time. We will update the effective date at the top
              of this page. Your continued use of the Service after changes constitutes acceptance
              of the revised Terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">15. Contact</h2>
            <p>
              For questions about these Terms, contact us at:{" "}
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
