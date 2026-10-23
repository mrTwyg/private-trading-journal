import { useEffect, useRef } from "react"
import { Bold, Italic, Link2, List } from "lucide-react"
import { Button } from "@/components/ui/button"

export function RichTextEditor({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value)
      editorRef.current.innerHTML = value
  }, [value])

  const command = ({ name, commandValue }: { name: string; commandValue?: string }) => {
    editorRef.current?.focus()
    document.execCommand(name, false, commandValue)
    onChange(editorRef.current?.innerHTML ?? "")
  }

  return (
    <div className="overflow-hidden rounded-lg border border-input bg-[var(--surface-2)] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/20">
      <div
        className="flex items-center gap-1 border-b border-border p-1.5"
        aria-label="Note formatting controls"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => command({ name: "bold" })}
          aria-label="Bold"
        >
          <Bold />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => command({ name: "italic" })}
          aria-label="Italic"
        >
          <Italic />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => command({ name: "insertUnorderedList" })}
          aria-label="Bulleted list"
        >
          <List />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            const url = window.prompt("Paste a link")
            if (url) command({ name: "createLink", commandValue: url })
          }}
          aria-label="Add link"
        >
          <Link2 />
        </Button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label="Thought process"
        data-placeholder="Why did you take this trade? What did you notice?"
        className="rich-editor min-h-32 px-3 py-3 text-sm leading-6 outline-none"
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
      />
    </div>
  )
}
