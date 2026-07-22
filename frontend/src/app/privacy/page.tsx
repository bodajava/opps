export const metadata = {
  title: "Privacy Policy - opps",
  description: "opps privacy policy. Learn how we collect, use, and protect your personal information.",
}

function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-muted-foreground">Last updated: January 2026</p>

      <div className="prose prose-sm mt-8 max-w-none space-y-6 text-muted-foreground">
        <section>
          <h2 className="text-xl font-semibold text-foreground">1. Introduction</h2>
          <p>
            opps (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This
            Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit
            our website and use our services.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">2. Information We Collect</h2>
          <p>We may collect the following types of information:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Personal Information:</strong> Name, email address, phone number, delivery address.</li>
            <li><strong>Payment Information:</strong> Payment details are processed securely by our payment partners. We do not store full payment card information.</li>
            <li><strong>Order History:</strong> Information about your purchases and preferences.</li>
            <li><strong>Usage Data:</strong> Information about how you interact with our website.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">3. How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Process and deliver your orders</li>
            <li>Communicate with you about your orders</li>
            <li>Send promotional offers (with your consent)</li>
            <li>Improve our products and services</li>
            <li>Comply with legal obligations</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">4. Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your personal information
            against unauthorized access, alteration, disclosure, or destruction.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">5. Third-Party Services</h2>
          <p>
            We may share your information with trusted third parties who assist us in operating our website,
            processing payments, and delivering orders. These partners are bound by confidentiality agreements.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">6. Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Delete your data (subject to legal requirements)</li>
            <li>Object to processing of your data</li>
            <li>Data portability</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">7. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at{" "}
            <a href="mailto:privacy@opps-cookies.com" className="text-primary hover:underline">
              privacy@opps-cookies.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  )
}

export default PrivacyPage
