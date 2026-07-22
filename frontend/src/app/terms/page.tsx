export const metadata = {
  title: "Terms of Service - opps",
  description: "opps terms of service. Read the terms governing your use of our website and services.",
}

function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-muted-foreground">Last updated: January 2026</p>

      <div className="prose prose-sm mt-8 max-w-none space-y-6 text-muted-foreground">
        <section>
          <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
          <p>
            By accessing and using the opps website and services, you agree to be bound by these Terms of
            Service. If you do not agree with any part of these terms, you may not use our services.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">2. Description of Service</h2>
          <p>
            opps provides an online platform for ordering handcrafted premium cookies and related baked goods.
            We offer delivery services within specified areas in Egypt.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">3. Account Registration</h2>
          <p>
            You may be required to create an account to place orders. You are responsible for maintaining the
            confidentiality of your account credentials and for all activities under your account.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">4. Orders and Payment</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>All prices are in Egyptian Pounds (E£) and include applicable taxes.</li>
            <li>Payment is due at the time of ordering unless other arrangements are made.</li>
            <li>We reserve the right to cancel orders due to stock unavailability or pricing errors.</li>
            <li>Delivery fees are calculated based on the delivery location and order value.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">5. Delivery Policy</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Delivery areas and times are specified during checkout.</li>
            <li>We strive to deliver within the estimated timeframe but delays may occur.</li>
            <li>Orders are delivered to the address provided during checkout.</li>
            <li>We are not responsible for incorrect addresses provided by customers.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">6. Intellectual Property</h2>
          <p>
            All content on our website, including text, images, logos, and designs, is the property of opps
            and is protected by applicable intellectual property laws.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">7. Limitation of Liability</h2>
          <p>
            opps shall not be liable for any indirect, incidental, special, or consequential damages arising
            from your use of our services. Our total liability is limited to the amount paid for the order in
            question.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">8. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. Changes will be effective immediately upon
            posting on our website. Continued use of our services after changes constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">9. Contact</h2>
          <p>
            For questions about these terms, please contact us at{" "}
            <a href="mailto:legal@opps-cookies.com" className="text-primary hover:underline">
              legal@opps-cookies.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  )
}

export default TermsPage
