import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Firm, Setup, Tag, TradingAccount } from "@/lib/types"
import { accountColors } from "@/components/journal/shared"
import { DeleteAccountDialog } from "@/components/journal/delete-account-dialog"

export function OrganiseView({
  accounts,
  setups,
  tags,
  firms,
  onAdd,
  onDelete,
  onManageAccounts,
  onDeleteAccount,
  onAddFirm,
  onDeleteFirm,
  onUpdateAccount,
}: {
  accounts: TradingAccount[]
  setups: Setup[]
  tags: Tag[]
  firms: Firm[]
  onAdd: (input: { type: "setup" | "tag"; name: string }) => Promise<void>
  onDelete: (input: { type: "setup" | "tag"; id: string }) => Promise<void>
  onManageAccounts: () => void
  onDeleteAccount: (input: { account: TradingAccount; confirmationName: string }) => Promise<void>
  onAddFirm: (name: string) => Promise<void>
  onDeleteFirm: (id: string) => Promise<void>
  onUpdateAccount: (account: TradingAccount) => Promise<void>
}) {
  const [setupName, setSetupName] = useState("")
  const [tagName, setTagName] = useState("")
  const [firmName, setFirmName] = useState("")
  const [deletingAccount, setDeletingAccount] = useState<TradingAccount | null>(null)
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="panel p-5 lg:col-span-2">
        <h2 className="font-semibold">Trading accounts</h2>
        <p className="mt-1 text-sm text-muted-foreground">Keep each account on its own calendar.</p>
        <Button className="mt-5" onClick={onManageAccounts}>
          Manage accounts
        </Button>
        <div className="mt-5 space-y-2">
          {accounts.map((account) => (
            <AccountRow
              key={account.id}
              account={account}
              onSave={onUpdateAccount}
              onDelete={() => setDeletingAccount(account)}
            />
          ))}
        </div>
      </section>
      <section className="panel p-5 lg:col-span-2">
        <h2 className="font-semibold">Prop firms</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          These choices appear in the account form. Removing a choice keeps your existing account
          history.
        </p>
        <form
          className="mt-5 flex gap-2"
          onSubmit={async (event) => {
            event.preventDefault()
            try {
              await onAddFirm(firmName.trim())
              setFirmName("")
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not add firm.")
            }
          }}
        >
          <Input
            value={firmName}
            onChange={(event) => setFirmName(event.target.value)}
            aria-label="New prop firm name"
            placeholder="New prop firm"
            required
            maxLength={100}
          />
          <Button type="submit">Add firm</Button>
        </form>
        <div className="mt-5 space-y-2">
          {firms.map((firm) => (
            <div key={firm.id} className="organise-row">
              <span>{firm.name}</span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${firm.name} from firm choices`}
                onClick={() =>
                  void onDeleteFirm(firm.id).catch((error) =>
                    toast.error(error instanceof Error ? error.message : "Could not remove firm."),
                  )
                }
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      </section>
      <section className="panel p-5">
        <h2 className="font-semibold">Setups</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Name the patterns you deliberately trade.
        </p>
        <form
          className="mt-5 flex gap-2"
          onSubmit={async (event) => {
            event.preventDefault()
            if (setupName.trim()) {
              await onAdd({ type: "setup", name: setupName.trim() })
              setSetupName("")
            }
          }}
        >
          <Input
            value={setupName}
            onChange={(event) => setSetupName(event.target.value)}
            placeholder="New setup"
            aria-label="New setup name"
          />
          <Button type="submit" size="icon" aria-label="Add setup">
            <Plus />
          </Button>
        </form>
        <div className="mt-5 space-y-2">
          {setups.map((setup) => (
            <div key={setup.id} className="organise-row">
              <span>{setup.name}</span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onDelete({ type: "setup", id: setup.id })}
                aria-label={`Delete ${setup.name}`}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      </section>
      <section className="panel p-5">
        <h2 className="font-semibold">Tags</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Track emotions, mistakes and conditions.
        </p>
        <form
          className="mt-5 flex gap-2"
          onSubmit={async (event) => {
            event.preventDefault()
            if (tagName.trim()) {
              await onAdd({ type: "tag", name: tagName.trim() })
              setTagName("")
            }
          }}
        >
          <Input
            value={tagName}
            onChange={(event) => setTagName(event.target.value)}
            placeholder="New tag"
            aria-label="New tag name"
          />
          <Button type="submit" size="icon" aria-label="Add tag">
            <Plus />
          </Button>
        </form>
        <div className="mt-5 space-y-2">
          {tags.map((tag) => (
            <div key={tag.id} className="organise-row">
              <span className="flex items-center gap-2">
                <span className="status-pip bg-[var(--accent-cyan)]" />
                {tag.name}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onDelete({ type: "tag", id: tag.id })}
                aria-label={`Delete ${tag.name}`}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      </section>
      <DeleteAccountDialog
        account={deletingAccount}
        onClose={() => setDeletingAccount(null)}
        onConfirm={onDeleteAccount}
      />
    </div>
  )
}

function AccountRow({
  account,
  onSave,
  onDelete,
}: {
  account: TradingAccount
  onSave: (account: TradingAccount) => Promise<void>
  onDelete: () => void
}) {
  const [name, setName] = useState(account.name)
  const [color, setColor] = useState(account.color)
  return (
    <div className="organise-row flex-wrap">
      <span className="status-pip" style={{ background: accountColors[color] }} />
      <Input
        className="min-w-44 flex-1"
        value={name}
        onChange={(event) => setName(event.target.value)}
        aria-label={`${account.name} account name`}
      />
      <Select aria-label={`${account.name} colour`} value={color} onValueChange={setColor}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.keys(accountColors).map((option) => (
            <SelectItem key={option} value={option}>
              <span className="capitalize">{option}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="outline" onClick={() => void onSave({ ...account, name, color })}>
        Save
      </Button>
      <Button
        variant="ghost"
        onClick={() => void onSave({ ...account, name, color, archived: !account.archived })}
      >
        {account.archived ? "Restore" : "Archive"}
      </Button>
      <Button variant="destructive" onClick={onDelete}>
        Delete
      </Button>
    </div>
  )
}
