"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SectionHeader } from "@/components/section-header"
import { toast } from "sonner"
import { Mail } from "lucide-react"

function NewsletterSection() {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setIsSubmitting(true)
    setTimeout(() => {
      toast.success("Thanks for subscribing! We'll keep you posted.")
      setEmail("")
      setIsSubmitting(false)
    }, 1000)
  }

  return (
    <section className="bg-primary py-16">
      <div className="mx-auto max-w-6xl px-4 text-center">
        <SectionHeader
          title="Stay in the Loop"
          subtitle="Subscribe for exclusive flavors, discounts, and cookie news."
          className="mb-8 justify-center text-primary-foreground"
        />
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-md gap-3"
        >
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-foreground/60" />
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border-primary-foreground/20 bg-primary-foreground/10 pl-9 text-primary-foreground placeholder:text-primary-foreground/60 focus-visible:ring-primary-foreground/30"
            />
          </div>
          <Button
            type="submit"
            variant="secondary"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Subscribing..." : "Subscribe"}
          </Button>
        </form>
      </div>
    </section>
  )
}

export { NewsletterSection }
