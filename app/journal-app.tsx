"use client"

import { useEffect, useState } from "react"
import { HardDrive } from "lucide-react"
import { I18nProvider } from "react-aria-components/I18nProvider"
import type { JournalBootstrap } from "@/lib/types"
import { JournalWorkspace } from "@/components/journal/journal-workspace"

export function JournalApp() {
  const [initial, setInitial] = useState<JournalBootstrap | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!window.journalApi) {
      Promise.resolve().then(() =>
        setError(
          "Open Trading Journal from the installed desktop app. The browser preview cannot access your private database.",
        ),
      )
      return
    }
    window.journalApi
      .load()
      .then(setInitial)
      .catch((loadError) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not open the local journal database.",
        )
      })
  }, [])

  if (error)
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6 text-foreground">
        <div className="panel max-w-lg p-6">
          <HardDrive className="size-8 text-[var(--accent-cyan)]" />
          <h1 className="mt-4 text-xl font-semibold">Desktop app required</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  if (!initial || !window.journalApi)
    return (
      <div className="grid min-h-screen place-items-center bg-background text-foreground">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="status-pip animate-pulse bg-[var(--accent-cyan)]" /> Opening your private
          journal…
        </div>
      </div>
    )
  return (
    <I18nProvider locale="en-GB">
      <JournalWorkspace initial={initial} api={window.journalApi} />
    </I18nProvider>
  )
}
