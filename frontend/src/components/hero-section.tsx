import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-background">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-4 py-16 md:flex-row md:py-24">
        <div className="flex-1 space-y-6">
          <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
            Freshly Baked Cookies,
            <br />
            Delivered to Your Door
          </h1>
          <p className="max-w-lg text-lg text-muted-foreground">
            Handcrafted premium cookies made with love in Egypt. Every batch baked fresh, every
            order delivered with care.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button asChild size="lg">
              <Link href="/products">
                Shop Now
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/products?category=cookie-boxes">Explore Boxes</Link>
            </Button>
          </div>
        </div>
        <div className="relative flex-1">
          <div className="relative mx-auto aspect-square w-full max-w-md">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-accent">
              <Image
                src="/placeholder-cookie.svg"
                alt="Premium cookies"
                width={320}
                height={320}
                className="object-contain"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export { HeroSection }
