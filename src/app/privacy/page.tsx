import Link from "next/link";

export const metadata = { title: "Privacy Policy — CareScot" };

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-muted/30 py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="rounded-md border-2 border-destructive bg-destructive/5 px-5 py-4">
          <p className="text-sm font-semibold text-destructive">
            Draft — not yet reviewed by a solicitor
          </p>
          <p className="text-sm text-destructive/90 mt-1">
            This page is a starting-point draft, not finished legal text. It
            must be reviewed by a solicitor qualified in UK data protection
            law, and the placeholder details below (company name, registered
            address, ICO registration number, contact details) filled in with
            real values, before this is shown to real customers.
          </p>
        </div>

        <div className="rounded-xl border bg-background p-8 space-y-8">
          <div>
            <h1 className="text-2xl font-semibold">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground mt-1">Last updated: [DATE]</p>
          </div>

          <Section title="1. Who we are">
            <p>
              CareScot (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is provided by{" "}
              <Placeholder>[LEGAL ENTITY NAME]</Placeholder>, a company
              registered in Scotland under company number{" "}
              <Placeholder>[COMPANY NUMBER]</Placeholder>, registered office{" "}
              <Placeholder>[REGISTERED ADDRESS]</Placeholder>. We are
              registered with the Information Commissioner&apos;s Office (ICO)
              under registration number{" "}
              <Placeholder>[ICO REGISTRATION NUMBER]</Placeholder>.
            </p>
            <p>
              CareScot is used by UK care providers (&ldquo;customers&rdquo;,
              &ldquo;organisations&rdquo;) to manage records for the people
              they support and the staff who support them. For each
              customer&apos;s data, that customer is the data controller and
              we act as their data processor, except where stated otherwise
              below.
            </p>
          </Section>

          <Section title="2. What data we process">
            <p>On behalf of our customers, CareScot processes:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Service user (client) data:</strong> name, date of
                birth, CHI number, contact and address details, next of kin
                and emergency contacts, GP and healthcare professional
                details, communication/cultural/dietary needs, care and
                support plans, risk assessments, consent records, health
                records, medication records, incident and safeguarding
                records, complaints, and visit/care records. This includes
                special category data under UK GDPR Article 9 (health data,
                and potentially data revealing racial/ethnic origin,
                religious beliefs, or similar, where recorded as part of
                cultural or dietary care needs).
              </li>
              <li>
                <strong>Staff data:</strong> name, contact details, employment
                and role information, PVG/SSSC registration and training
                records, health declarations, supervision, appraisal, and
                disciplinary records, absence records.
              </li>
              <li>
                <strong>User account data:</strong> login email, password
                (stored as a salted hash, never in plain text), role, login
                timestamps.
              </li>
              <li>
                <strong>Billing data:</strong> organisation billing contact
                details and subscription/seat information. Card payment
                details are collected and processed directly by Stripe — we
                do not store full card numbers.
              </li>
            </ul>
          </Section>

          <Section title="3. Our lawful basis for processing">
            <p>
              Where we act as a data processor for a customer, that customer
              determines the lawful basis for processing their service
              users&apos; and staff&apos;s data — typically a combination of
              contract necessity, legal obligation (e.g. Care Inspectorate
              regulatory requirements), and, for special category health
              data, the conditions in UK GDPR Article 9(2)(h) (health or
              social care) and Schedule 1 of the Data Protection Act 2018.
            </p>
            <p>
              For our own processing (billing, account administration,
              service communications), our lawful basis is performance of our
              contract with the customer organisation and our legitimate
              interest in operating and improving the service.
            </p>
          </Section>

          <Section title="4. Who we share data with">
            <p>
              We use the following sub-processors, each bound by a data
              processing agreement:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Amazon Web Services (AWS)</strong> — application
                hosting and database storage.{" "}
                <Placeholder>[Confirm AWS region/data residency]</Placeholder>
              </li>
              <li>
                <strong>Stripe</strong> — subscription billing and payment
                processing.
              </li>
              <li>
                <strong>Sentry</strong> — error monitoring, to help us detect
                and fix bugs. Error reports may incidentally include
                fragments of data present at the point of failure.
              </li>
            </ul>
            <p>
              We do not sell personal data, and do not share it with any
              other third party except where required by law or with the
              customer organisation&apos;s instruction.
            </p>
          </Section>

          <Section title="5. International transfers">
            <p>
              <Placeholder>
                [Confirm whether any sub-processor transfers data outside the
                UK/EEA, and if so, what safeguard applies — e.g. UK
                International Data Transfer Agreement, adequacy decision.]
              </Placeholder>
            </p>
          </Section>

          <Section title="6. How long we keep data">
            <p>
              Retention periods for service user and staff records are set by
              the customer organisation in line with Care Inspectorate and
              other applicable regulatory retention requirements — typically
              several years after a service user is discharged or a staff
              member leaves. <Placeholder>[Confirm exact retention schedule]</Placeholder>.
              Account and billing data is retained for the duration of the
              subscription plus a period required for tax/accounting records.
            </p>
          </Section>

          <Section title="7. Your rights">
            <p>
              Subject to applicable exemptions, individuals have the right
              to: access their data; have inaccurate data corrected; request
              erasure; restrict or object to processing; and data
              portability. For service users and staff, these requests
              should ordinarily be directed to the care organisation
              (data controller) they are supported by or employed by, who can
              action an export or erasure request directly within CareScot.
            </p>
          </Section>

          <Section title="8. Security">
            <p>
              We apply technical and organisational measures appropriate to
              the sensitivity of the data we process, including encryption in
              transit, access controls scoped to each organisation&apos;s own
              data, audit logging of record changes, and rate limiting on
              authentication.
            </p>
          </Section>

          <Section title="9. Contact us">
            <p>
              Questions about this policy or how your data is handled:{" "}
              <Placeholder>[CONTACT EMAIL]</Placeholder>. You also have the
              right to lodge a complaint with the{" "}
              <Placeholder>Information Commissioner&apos;s Office (ico.org.uk)</Placeholder>.
            </p>
          </Section>

          <Section title="10. Changes to this policy">
            <p>
              We may update this policy from time to time. Material changes
              will be notified to customer organisations in advance.
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
