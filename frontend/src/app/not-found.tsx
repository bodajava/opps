import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Cookie } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="px-4 text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
          <Cookie className="h-12 w-12 text-muted-foreground" />
        </div>
        <h1 className="text-6xl font-bold tracking-tight text-foreground">404</h1>
        <p className="mt-2 text-xl font-semibold text-foreground">Oops! Page not found</p>
        <p className="mt-2 text-muted-foreground">
          Looks like this cookie crumbled. The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Button asChild>
            <Link href="/">Go Home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/products">Browse Products</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
