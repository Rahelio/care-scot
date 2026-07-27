import Link from "next/link";

export const metadata = { title: "Terms of Service — CareScot" };

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-muted/30 py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="rounded-md border-2 border-destructive bg-destructive/5 px-5 py-4">
          <p className="text-sm font-semibold text-destructive">
            Draft — not yet reviewed by a solicitor
          </p>
          <p className="text-sm text-destructive/90 mt-1">
            This page is a starting-point draft, not finished legal text. It
            must be reviewed by a solicitor before this is shown to real
            customers, and the pricing/placeholder details below filled in
            with real values.
          </p>
        </div>

        <div className="rounded-xl border bg-background p-8 space-y-8">
          <div>
            <h1 className="text-2xl font-semibold">Terms of Service</h1>
            <p className="text-sm text-muted-foreground mt-1">Last updated: [DATE]</p>
          </div>

          <Section title="1. Acceptance of these terms">
            <p>
              By creating an organisation account on CareScot, you agree to
              these terms on behalf of the organisation you represent. If you
              do not have authority to agree on your organisation&apos;s
              behalf, do not create an account.
            </p>
          </Section>

          <Section title="2. The service">
            <p>
              CareScot is a care management system for UK care providers,
              covering client records, staff records, incidents, medication,
              rota, and compliance tracking. We provide the service on an
              &ldquo;as available&rdquo; basis and may update or change
              features from time to time.
            </p>
          </Section>

          <Section title="3. Accounts and seats">
            <p>
              Each organisation account includes 5 user seats at no charge.
              Additional seats are billed per block of 5, at the price shown
              at checkout (<Placeholder>[real pricing set in Stripe]</Placeholder>),
              billed monthly or annually as selected. You&apos;re responsible
              for keeping your account credentials secure and for all
              activity under your organisation&apos;s account.
            </p>
          </Section>

          <Section title="4. Your responsibilities as data controller">
            <p>
              For the service user and staff data you enter into CareScot,
              your organisation is the data controller and we act as your
              data processor under a data processing agreement{" "}
              <Placeholder>[link to DPA]</Placeholder>. You are responsible
              for having a lawful basis to process that data, for the
              accuracy of what you enter, and for responding to data subject
              rights requests (which CareScot&apos;s export/erasure tools are
              designed to help you action).
            </p>
          </Section>

          <Section title="5. Acceptable use">
            <p>
              You agree not to use CareScot to store data you&apos;re not
              legally entitled to process, to attempt to access another
              organisation&apos;s data, to interfere with the service&apos;s
              operation, or to use the service for any unlawful purpose.
            </p>
          </Section>

          <Section title="6. Payment and cancellation">
            <p>
              Subscription fees are billed in advance via Stripe. You may
              cancel at any time from your billing settings; access continues
              until the end of the current billing period.{" "}
              <Placeholder>[Confirm refund policy]</Placeholder>.
            </p>
          </Section>

          <Section title="7. Availability and liability">
            <p>
              We aim for high availability but do not guarantee the service
              will be uninterrupted or error-free.{" "}
              <Placeholder>
                [Standard liability limitation clause — needs solicitor
                drafting, especially given the safeguarding/regulatory
                context of the data involved.]
              </Placeholder>
            </p>
          </Section>

          <Section title="8. Termination">
            <p>
              We may suspend or terminate an account for material breach of
              these terms, non-payment, or unlawful use. On termination, you
              may request an export of your data within{" "}
              <Placeholder>[X days]</Placeholder> before it is deleted in
              line with our data retention schedule.
            </p>
          </Section>

          <Section title="9. Governing law">
            <p>
              These terms are governed by the laws of Scotland, and the
              Scottish courts have exclusive jurisdiction over any dispute.
            </p>
          </Section>

          <Section title="10. Contact">
            <p>
              Questions about these terms: <Placeholder>[CONTACT EMAIL]</Placeholder>.
            </p>
          </Section>
        </div>

        <div className="text-center">
          <Link href="/login" className="text-sm text-muted-foreground hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="text-sm text-muted-foreground space-y-2 leading-relaxed">
        {children}
      </div>
    </section>
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300 px-1 rounded">
      {children}
    </span>
  );
}
