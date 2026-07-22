"use client"

import { useEffect, useState, Suspense, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"
import { toast } from "sonner"
import { checkUnsubscribeToken, unsubscribe } from "@/lib/api/unsubscribe"

type PageState =
  | { status: "loading" }
  | { status: "confirm"; email: string; token: string }
  | { status: "success" }
  | { status: "error"; message: string }

function UnsubscribeForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [state, setState] = useState<PageState>(() => {
    if (!token) return { status: "error", message: "Invalid unsubscribe link" }
    return { status: "loading" }
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!token) return

    checkUnsubscribeToken(token)
      .then((res) => {
        setState({ status: "confirm", email: res.data.email, token })
      })
      .catch(() => {
        setState({
          status: "error",
          message:
            "This unsubscribe link is invalid or has expired. Please contact support if you need help.",
        })
      })
  }, [token])

  const handleUnsubscribe = useCallback(async () => {
    if (state.status !== "confirm") return
    setIsSubmitting(true)
    try {
      await unsubscribe(state.token)
      setState({ status: "success" })
      toast.success("Successfully unsubscribed")
    } catch {
      setState({ status: "error", message: "Something went wrong. Please try again." })
    } finally {
      setIsSubmitting(false)
    }
  }, [state])

  if (state.status === "loading") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (state.status === "error") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <XCircle className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold">Invalid Link</h1>
        <p className="mt-2 text-muted-foreground">{state.message}</p>
      </div>
    )
  }

  if (state.status === "success") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold">Unsubscribed</h1>
        <p className="mt-2 text-muted-foreground">
          You have been unsubscribed. You will still receive transactional emails.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Unsubscribe from Marketing Emails</h1>
      <p className="mt-2 text-muted-foreground">
        You are unsubscribing <strong>{state.email}</strong> from marketing emails.
      </p>
      <Button
        onClick={handleUnsubscribe}
        className="mt-8 w-full"
        disabled={isSubmitting}
        variant="destructive"
      >
        {isSubmitting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : null}
        Confirm Unsubscribe
      </Button>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense>
      <UnsubscribeForm />
    </Suspense>
  )
}
