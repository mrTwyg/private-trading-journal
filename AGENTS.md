<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Saved journal data is irreplaceable

- The real SQLite database is outside the repository at `%APPDATA%\Trading Journal\trading-journal.sqlite`. Never reset, replace, delete, or seed it as part of an update or test. Only the running journal may write real entries through its normal owner-process operations.
- Before any local update or launch that could migrate data, check for running journal instances, create a fresh timestamped backup outside the checkout, and verify its SHA-256. Retain older backups. Do not close an unfinished entry without the user's consent.
- Tests, smoke checks, deletion tests and preview builds must use isolated temporary databases or explicit copies. Never point test code at the real database. Isolate the Codex inbox as well so a preview cannot consume real imports.
- Database migrations must be additive/versioned, back up before mutation, and be tested on a copy with all existing rows and screenshots preserved. Multi-account saves must be atomic: all destinations save or none do, including on failed persistence. Editing a copy must not alter its source or other accounts.
- Do not print private trade content or commit databases, screenshots, backups or machine-specific paths. A local backup is not protection from disk loss; recommend a separate user-controlled backup location without uploading anything automatically.
- After journal changes, refresh the desktop local build from verified merged main. If the PR is unmerged and the user wants to test, provide a clearly labelled preview using a database copy; keep the normal main shortcut intact and explain that preview changes do not sync back.
