import { useState } from "react"
import { Check, Download, HardDrive, Sparkles, FolderOpen, RotateCcw, Upload } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { CodexIntegrationStatus, Profile } from "@/lib/types"
import { Field } from "@/components/journal/shared"

const themeOptions = [
  {
    id: "midnight",
    name: "Midnight",
    description: "Cyan glass and deep navy",
    swatches: ["#080c11", "#17212d", "#5ce1e6"],
  },
  {
    id: "obsidian",
    name: "Obsidian",
    description: "Black, graphite and signal green",
    swatches: ["#050807", "#14201b", "#53e3a6"],
  },
  {
    id: "violet",
    name: "Violet Horizon",
    description: "Deep indigo and ultraviolet",
    swatches: ["#090815", "#211d38", "#a99cff"],
  },
  {
    id: "alloy",
    name: "Light Alloy",
    description: "Bright technical workspace",
    swatches: ["#edf2f7", "#ffffff", "#126e82"],
  },
] as const

const accentOptions = [
  { id: "theme", name: "Theme", color: "linear-gradient(135deg,#5ce1e6,#a99cff)" },
  { id: "cyan", name: "Cyan", color: "#5ce1e6" },
  { id: "emerald", name: "Emerald", color: "#53e3a6" },
  { id: "violet", name: "Violet", color: "#a99cff" },
  { id: "amber", name: "Amber", color: "#f3bb55" },
] as const

export function SettingsView({
  profile,
  setProfile,
  onSave,
  onBackup,
  onRestore,
  dataLocation,
  codexStatus,
  onEnableCodex,
  onDisableCodex,
  onOpenInbox,
}: {
  profile: Profile
  setProfile: React.Dispatch<React.SetStateAction<Profile>>
  onSave: () => Promise<void>
  onBackup: () => Promise<void>
  onRestore: () => Promise<void>
  dataLocation: string
  codexStatus: CodexIntegrationStatus | null
  onEnableCodex: () => Promise<void>
  onDisableCodex: () => Promise<void>
  onOpenInbox: () => Promise<void>
}) {
  const [saved, setSaved] = useState(false)
  const [confirmEnable, setConfirmEnable] = useState(false)
  const [helperBusy, setHelperBusy] = useState(false)
  return (
    <div className="max-w-2xl space-y-5">
      <section className="panel p-6">
        <h2 className="font-semibold">Profile preferences</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          New trades inherit these defaults. Historical currencies never change.
        </p>
        <form
          className="mt-6 space-y-5"
          onSubmit={async (event) => {
            event.preventDefault()
            try {
              await onSave()
              setSaved(true)
              setTimeout(() => setSaved(false), 1800)
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not save settings.")
            }
          }}
        >
          <Field label="Display name" htmlFor="display-name">
            <Input
              id="display-name"
              value={profile.displayName}
              onChange={(event) => setProfile({ ...profile, displayName: event.target.value })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Default currency" htmlFor="currency">
              <Select
                aria-label="Default currency"
                value={profile.defaultCurrency}
                onValueChange={(value) => setProfile({ ...profile, defaultCurrency: value })}
              >
                <SelectTrigger id="currency" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["GBP", "USD", "EUR", "CAD", "AUD"].map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Timezone" htmlFor="timezone">
              <Input
                id="timezone"
                value={profile.timezone}
                onChange={(event) => setProfile({ ...profile, timezone: event.target.value })}
              />
            </Field>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit">Save settings</Button>
            {saved && (
              <span role="status" className="flex items-center gap-1 text-sm text-[var(--success)]">
                <Check className="size-4" /> Saved
              </span>
            )}
          </div>
        </form>
        <div className="mt-8 border-t border-border pt-6">
          <h3 className="font-semibold">Backup and restore</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            A backup contains every trade, note, setup, tag, preference, and screenshot.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" onClick={onBackup}>
              <Download /> Back up journal
            </Button>
            <Button variant="outline" onClick={onRestore}>
              <Upload /> Restore backup
            </Button>
          </div>
          <div className="mt-5 rounded-lg border border-border bg-[var(--surface-2)] p-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <HardDrive className="size-4 text-[var(--accent-cyan)]" /> Stored only on this
              computer
            </p>
            <p className="mt-1 break-all text-xs text-muted-foreground">
              {dataLocation || "Your private app data folder"}
            </p>
          </div>
        </div>
      </section>
      <section className="panel p-6">
        <h2 className="font-semibold">Appearance</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Choose a visual system, then tune how dense and animated the journal feels. Changes
          preview immediately.
        </p>
        <fieldset className="mt-5">
          <legend className="detail-label mb-3">Visual theme</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {themeOptions.map((theme) => (
              <button
                key={theme.id}
                type="button"
                aria-pressed={profile.theme === theme.id}
                onClick={() => setProfile({ ...profile, theme: theme.id })}
                className={cn("theme-choice", profile.theme === theme.id && "theme-choice-active")}
              >
                <span className="theme-swatches" aria-hidden="true">
                  {theme.swatches.map((color) => (
                    <span key={color} style={{ background: color }} />
                  ))}
                </span>
                <span>
                  <strong>{theme.name}</strong>
                  <small>{theme.description}</small>
                </span>
                {profile.theme === theme.id && <Check className="ml-auto size-4" />}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="mt-5">
          <legend className="detail-label mb-3">Accent colour</legend>
          <div className="flex flex-wrap gap-2">
            {accentOptions.map((accent) => (
              <button
                key={accent.id}
                type="button"
                aria-pressed={profile.accent === accent.id}
                onClick={() => setProfile({ ...profile, accent: accent.id })}
                className={cn(
                  "accent-choice",
                  profile.accent === accent.id && "accent-choice-active",
                )}
              >
                <span style={{ background: accent.color }} aria-hidden="true" />
                {accent.name}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Information density" htmlFor="density">
            <Select
              aria-label="Information density"
              value={profile.density}
              onValueChange={(value) =>
                setProfile({ ...profile, density: value as Profile["density"] })
              }
            >
              <SelectTrigger id="density" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="comfortable">Comfortable</SelectItem>
                <SelectItem value="compact">Compact</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Corner style" htmlFor="corners">
            <Select
              aria-label="Corner style"
              value={profile.corners}
              onValueChange={(value) =>
                setProfile({ ...profile, corners: value as Profile["corners"] })
              }
            >
              <SelectTrigger id="corners" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rounded">Rounded</SelectItem>
                <SelectItem value="soft">Extra soft</SelectItem>
                <SelectItem value="sharp">Technical</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Interface type" htmlFor="font-mode">
            <Select
              aria-label="Interface type"
              value={profile.fontMode}
              onValueChange={(value) =>
                setProfile({ ...profile, fontMode: value as Profile["fontMode"] })
              }
            >
              <SelectTrigger id="font-mode" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="clean">Clean sans</SelectItem>
                <SelectItem value="technical">Technical mono</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Interface motion" htmlFor="motion">
            <Select
              aria-label="Interface motion"
              value={profile.motion}
              onValueChange={(value) =>
                setProfile({ ...profile, motion: value as Profile["motion"] })
              }
            >
              <SelectTrigger id="motion" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">Follow Windows</SelectItem>
                <SelectItem value="reduced">Reduced</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Glow intensity" htmlFor="glow">
            <Select
              aria-label="Glow intensity"
              value={profile.glow}
              onValueChange={(value) => setProfile({ ...profile, glow: value as Profile["glow"] })}
            >
              <SelectTrigger id="glow" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">Off</SelectItem>
                <SelectItem value="subtle">Subtle</SelectItem>
                <SelectItem value="bright">Bright</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <Button
            onClick={async () => {
              try {
                await onSave()
                setSaved(true)
                setTimeout(() => setSaved(false), 1800)
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not save appearance.")
              }
            }}
          >
            Save appearance
          </Button>
          {saved && (
            <span role="status" className="flex items-center gap-1 text-sm text-[var(--success)]">
              <Check className="size-4" /> Saved
            </span>
          )}
        </div>
      </section>
      <section className="panel p-6">
        <div className="flex items-start gap-3">
          <div className="trade-direction text-[var(--accent-cyan)]">
            <Sparkles />
          </div>
          <div>
            <h2 className="font-semibold">Codex helper</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Dictate a trade or attach a chart in Codex. Complete entries save automatically;
              uncertain ones wait safely in the Inbox.
            </p>
          </div>
        </div>
        <div className="mt-5 rounded-lg border border-border bg-[var(--surface-2)] p-4">
          <p className="text-sm font-medium">
            {codexStatus?.enabled ? "Enabled on this computer" : "Not enabled"}
          </p>
          <p className="mt-1 break-all text-xs text-muted-foreground">
            {codexStatus?.inboxPath || "The local inbox will be created under Documents\\Codex."}
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => setConfirmEnable(true)} disabled={helperBusy}>
            {codexStatus?.enabled ? (
              <>
                <RotateCcw /> Reinstall helper
              </>
            ) : (
              <>
                <Sparkles /> Enable Codex helper
              </>
            )}
          </Button>
          <Button variant="outline" onClick={() => void onOpenInbox()}>
            <FolderOpen /> Open inbox folder
          </Button>
          {codexStatus?.enabled && (
            <Button
              variant="ghost"
              onClick={async () => {
                setHelperBusy(true)
                try {
                  await onDisableCodex()
                } finally {
                  setHelperBusy(false)
                }
              }}
            >
              Disable helper
            </Button>
          )}
        </div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Enabling copies one local skill into Codex. It does not connect a broker or upload your
          journal. Restart Codex once after enabling.
        </p>
      </section>
      <Dialog open={confirmEnable} onOpenChange={setConfirmEnable}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {codexStatus?.enabled ? "Reinstall Codex helper?" : "Enable Codex helper?"}
            </DialogTitle>
            <DialogDescription>
              This installs the local trading-journal-log skill and creates a watched inbox in
              Documents\\Codex. The skill can prepare entries but cannot write directly to your
              journal database.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmEnable(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setHelperBusy(true)
                try {
                  await onEnableCodex()
                  setConfirmEnable(false)
                  toast.success("Codex helper enabled", {
                    description: "Restart Codex once before using it.",
                  })
                } catch (error) {
                  toast.error(
                    error instanceof Error ? error.message : "Could not enable the helper.",
                  )
                } finally {
                  setHelperBusy(false)
                }
              }}
            >
              {helperBusy ? "Installing…" : "Enable helper"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
