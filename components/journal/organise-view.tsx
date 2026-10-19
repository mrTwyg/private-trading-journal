import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Setup, Tag, TradingAccount } from "@/lib/types"
import { accountColors } from "@/components/journal/shared"

export function OrganiseView({
  accounts,
  setups,
  tags,
  onAdd,
  onDelete,
  onAddAccount,
  onUpdateAccount,
}: {
  accounts: TradingAccount[]
  setups: Setup[]
  tags: Tag[]
  onAdd: (type: "setup" | "tag", name: string) => Promise<void>
  onDelete: (type: "setup" | "tag", id: string) => Promise<void>
  onAddAccount: (name: string, color: string) => Promise<void>
  onUpdateAccount: (account: TradingAccount) => Promise<void>
}) {
  const [setupName, setSetupName] = useState("")
  const [tagName, setTagName] = useState("")
  const [accountName, setAccountName] = useState("")
  const [accountColor, setAccountColor] = useState("cyan")
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="panel p-5 lg:col-span-2">
        <h2 className="font-semibold">Trading accounts</h2>
        <p className="mt-1 text-sm text-muted-foreground">Keep each account on its own calendar.</p>
        <form
          className="mt-5 flex flex-wrap gap-2"
          onSubmit={async (event) => {
            event.preventDefault()
            if (accountName.trim()) {
              await onAddAccount(accountName.trim(), accountColor)
              setAccountName("")
            }
          }}
        >
          <Input
            className="min-w-52 flex-1"
            value={accountName}
            onChange={(event) => setAccountName(event.target.value)}
            placeholder="New account name"
            aria-label="New account name"
          />
          <Select aria-label="Account colour" value={accountColor} onValueChange={setAccountColor}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(accountColors).map((color) => (
                <SelectItem key={color} value={color}>
                  <span className="capitalize">{color}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit">
            <Plus /> Add account
          </Button>
        </form>
        <div className="mt-5 space-y-2">
          {accounts.map((account) => (
            <AccountRow key={account.id} account={account} onSave={onUpdateAccount} />
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
              await onAdd("setup", setupName.trim())
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
                onClick={() => onDelete("setup", setup.id)}
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
              await onAdd("tag", tagName.trim())
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
                onClick={() => onDelete("tag", tag.id)}
                aria-label={`Delete ${tag.name}`}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function AccountRow({
  account,
  onSave,
}: {
  account: TradingAccount
  onSave: (account: TradingAccount) => Promise<void>
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
    </div>
  )
}
