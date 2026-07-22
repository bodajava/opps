export const metadata = {
  title: "Returns & Refunds - opps",
  description: "opps returns and refunds policy. Learn about our return process and conditions.",
}

function ReturnsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-4xl font-bold tracking-tight">Returns &amp; Refunds</h1>
      <p className="mt-2 text-muted-foreground">Last updated: January 2026</p>

      <div className="prose prose-sm mt-8 max-w-none space-y-6 text-muted-foreground">
        <section>
          <h2 className="text-xl font-semibold text-foreground">1. Our Policy</h2>
          <p>
            At opps, we take pride in the quality of our handcrafted cookies. Because our products are
            freshly baked food items, we generally do not accept returns. However, we stand behind our
            products and want you to be completely satisfied with your order.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">2. Quality Issues</h2>
          <p>
            If you receive an order that is damaged, incorrect, or does not meet our quality standards, please
            contact us within 24 hours of delivery. We will:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Investigate the issue promptly</li>
            <li>Offer a replacement or refund for affected items</li>
            <li>Provide a credit for future orders where applicable</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">3. Order Cancellations</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Orders can be cancelled within 1 hour of placement for a full refund.</li>
            <li>After 1 hour, if baking has commenced, cancellations may not be possible.</li>
            <li>To cancel, please contact us via phone or email with your order number.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">4. Refund Process</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Approved refunds will be processed within 5-7 business days.</li>
            <li>Refunds are issued to the original payment method.</li>
            <li>Cash on Delivery orders will be refunded via bank transfer or wallet credit.</li>
            <li>You will receive a confirmation email once the refund is processed.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">5. Non-Returnable Items</h2>
          <p>
            Due to the perishable nature of our products, the following items cannot be returned:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Opened or partially consumed products</li>
            <li>Items purchased more than 24 hours ago</li>
            <li>Custom or special order items</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">6. Contact for Returns</h2>
          <p>
            For any return or refund requests, please reach out to us at{" "}
            <a href="mailto:returns@opps-cookies.com" className="text-primary hover:underline">
              returns@opps-cookies.com
            </a>{" "}
            or call us at +20 100 000 0000. Please have your order number ready.
          </p>
        </section>
      </div>
    </div>
  )
}

export default ReturnsPage
