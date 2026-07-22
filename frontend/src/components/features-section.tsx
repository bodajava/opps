import { SectionHeader } from "@/components/section-header"
import { Wheat, HeartHandshake, Truck, ShoppingCart } from "lucide-react"

const features = [
  {
    icon: Wheat,
    title: "Premium Ingredients",
    description:
      "We source the finest imported and local ingredients to create cookies that taste exceptional.",
  },
  {
    icon: HeartHandshake,
    title: "Handcrafted with Love",
    description:
      "Every cookie is carefully crafted by our skilled bakers, ensuring perfection in every bite.",
  },
  {
    icon: Truck,
    title: "Delivered Fresh",
    description:
      "We bake fresh and deliver straight to your door so you get the freshest cookies possible.",
  },
  {
    icon: ShoppingCart,
    title: "Easy Ordering",
    description:
      "Simple online ordering with multiple payment options and real-time order tracking.",
  },
]

function FeaturesSection() {
  return (
    <section className="bg-muted py-16">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeader
          title="Why Choose opps?"
          subtitle="We make cookie delivery simple and delightful"
          className="mb-12"
        />
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border bg-card p-6 text-center shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 font-semibold">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export { FeaturesSection }
