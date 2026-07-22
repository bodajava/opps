import { SectionHeader } from "@/components/section-header"
import { ClipboardList, Heart, Cookie, Sparkles } from "lucide-react"

const steps = [
  {
    icon: ClipboardList,
    title: "Choose Cookies",
    description: "Browse our selection of handcrafted premium cookies and pick your favorites.",
  },
  {
    icon: Heart,
    title: "Place Order",
    description: "Add to cart, choose your delivery details, and place your order.",
  },
  {
    icon: Cookie,
    title: "We Bake",
    description: "Our bakers prepare your cookies fresh with premium ingredients.",
  },
  {
    icon: Sparkles,
    title: "Enjoy",
    description: "Get your cookies delivered fresh to your doorstep. Enjoy!",
  },
]

function OrderSteps() {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeader
          title="How It Works"
          subtitle="Fresh cookies in 4 simple steps"
          className="mb-12"
        />
        <div className="grid gap-8 md:grid-cols-4">
          {steps.map((step, i) => (
            <div key={step.title} className="relative text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <step.icon className="h-7 w-7 text-primary" />
              </div>
              <div className="mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {i + 1}
              </div>
              <h3 className="mt-2 font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export { OrderSteps }
