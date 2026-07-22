import { SectionHeader } from "@/components/section-header"
import { Heart, Target, Users, Sparkles } from "lucide-react"

export const metadata = {
  title: "About Us - opps",
  description: "Learn about opps, our story, mission, and values. Handcrafted premium cookies made with love.",
}

const values = [
  {
    icon: Heart,
    title: "Made with Love",
    description: "Every cookie is handcrafted with care by our skilled bakers who pour their passion into each batch.",
  },
  {
    icon: Target,
    title: "Premium Quality",
    description: "We source the finest ingredients from around the world to create cookies that taste exceptional.",
  },
  {
    icon: Users,
    title: "Customer First",
    description: "Your satisfaction is our top priority. From ordering to delivery, we ensure a delightful experience.",
  },
  {
    icon: Sparkles,
    title: "Constant Innovation",
    description: "We're always experimenting with new flavors and recipes to bring you exciting new treats.",
  },
]

function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <section className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Our Story</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          From a small home kitchen to your doorstep — a journey of passion for cookies.
        </p>
      </section>

      <section className="mt-16">
        <div className="prose prose-lg mx-auto max-w-none text-muted-foreground">
          <p>
            opps was born from a simple belief: that a cookie should be more than just a snack. It should be an
            experience. A moment of joy. A taste of something truly special.
          </p>
          <p>
            What started as a weekend baking hobby quickly turned into something bigger. Friends and family couldn&apos;t
            get enough of our cookies, and soon we were baking for events, gatherings, and special occasions.
          </p>
          <p>
            Today, opps is a premium cookie brand based in Cairo, Egypt. We specialize in handcrafted cookies made
            with the finest ingredients — imported chocolate, European butter, and locally sourced eggs and flour.
            Every batch is baked fresh to order and delivered straight to your door.
          </p>
        </div>
      </section>

      <section className="mt-16">
        <SectionHeader title="Our Mission" subtitle="What drives us every day" className="mb-8 justify-center text-center" />
        <div className="rounded-xl bg-primary/5 p-8 text-center">
          <p className="text-lg leading-relaxed text-muted-foreground">
            To bring joy to every moment with premium, handcrafted cookies made from the finest ingredients —
            delivered fresh, with love, right to your doorstep.
          </p>
        </div>
      </section>

      <section className="mt-16">
        <SectionHeader title="Our Values" subtitle="The principles that guide us" className="mb-8" />
        <div className="grid gap-6 sm:grid-cols-2">
          {values.map((value) => (
            <div key={value.title} className="rounded-xl border p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <value.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 font-semibold">{value.title}</h3>
              <p className="text-sm text-muted-foreground">{value.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <SectionHeader title="Meet the Team" subtitle="The people behind opps" className="mb-8" />
        <div className="grid gap-6 sm:grid-cols-3">
          {["Sarah", "Ahmed", "Mariam"].map((name, i) => (
            <div key={name} className="rounded-xl border p-6 text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                <span className="text-2xl font-bold text-muted-foreground/50">{name[0]}</span>
              </div>
              <h3 className="font-semibold">{name}</h3>
              <p className="text-sm text-muted-foreground">
                {["Head Baker & Founder", "Creative Pastry Chef", "Operations Manager"][i]}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          And many more talented bakers and support staff who make it all possible.
        </p>
      </section>
    </div>
  )
}

export default AboutPage
