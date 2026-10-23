# Developer guide

[← Back to the README](../README.md)

The app uses Electron, a statically exported Next.js interface, and SQLite through `sql.js`. The renderer has no direct Node.js/database access; operations go through the preload bridge.

## Protect existing data first

**Source checkouts do not contain the normal live database.** Different checkouts can open the same Windows account's journal.

Before running changed database code:

1. Read the repository's [saved-data rules](../AGENTS.md#saved-journal-data-is-irreplaceable).
2. Back up through Settings to somewhere outside the checkout.
3. Close every journal instance; do not discard unfinished input.
4. Run tests against isolated databases. Test migrations on a copy and verify all existing rows/screenshots survive.

Never reset, seed, delete, or replace the user's database to test a feature. An isolated preview must clearly identify its separate database and Codex inbox; do not silently replace an everyday launcher with it.

## Build and run

Requirements: **Windows 10 or newer**, **Node.js 22.13 or newer**, and npm.

From the repository folder:

```powershell
npm ci
npm test
npm run build
npm run desktop
```

The desktop command opens the journal for the current Windows account. Confirm the path in Settings before entering real data.

| Command                   | Purpose                                                          |
| ------------------------- | ---------------------------------------------------------------- |
| `npm run dev`             | Browser-only UI development; no private desktop database access. |
| `npm run build`           | Build the static frontend used by Electron.                      |
| `npm run desktop`         | Start Electron with the built frontend and local database.       |
| `npm test`                | Run regression tests using isolated databases.                   |
| `npm run lint`            | Check source with ESLint.                                        |
| `npm run format`          | Apply Prettier formatting.                                       |
| `npm run format:check`    | Check formatting without changing files.                         |
| `npm run package:windows` | Build the installer and portable app into `release/`.            |

`npm run dev` is not the full desktop app. Build and launch Electron to test desktop functionality. If a machine has a Turbopack-specific build failure, `npx next build --webpack` is an alternative production build; inspect the error before switching tools.

## Update a local source build

Back up the journal and close the app first. From a **clean checkout on `main`**:

```powershell
git pull --ff-only
npm ci
npm run build
npm run desktop
```

Stop if Git reports uncommitted changes or divergence. Preserve the changes instead of resetting them.

After source edits, rebuild and reopen Electron; no installer is needed. Use the same Windows account to retain the existing data location. Point shortcuts at the intended checkout, not an old installed or portable copy. Changing a shortcut does not update an already running app.

## Source map

| Path                                        | Responsibility                                               |
| ------------------------------------------- | ------------------------------------------------------------ |
| `app/journal-app.tsx`                       | Desktop connection, loading, and errors.                     |
| `components/journal/journal-workspace.tsx`  | Shared state and screen wiring.                              |
| `components/journal/`                       | Calendar, trades, forms, settings, inbox, shell, and sheets. |
| `components/accounts-view.tsx`              | Purchases, balances, and evaluation-to-live transitions.     |
| `components/ui/`                            | Shared accessible controls.                                  |
| `lib/`                                      | Types, trade calculations, and formatting.                   |
| `electron/main.cjs`, `electron/preload.cjs` | Desktop startup and IPC bridge.                              |
| `electron/database.cjs`                     | Persistence and versioned migrations.                        |
| `codex-skill/`                              | Optional bundled Codex logging helper.                       |
| `tests/`                                    | Regression tests.                                            |
| `.github/workflows/quality.yml`             | PR formatting, tests, lint, and build checks.                |

Run Prettier before committing. The style uses two spaces, double quotes, no semicolons, and a preferred 100-character width. Editors can use `.prettierrc.json` and `.editorconfig`; generated files, release output, and journal data are excluded from formatting.

## Windows releases

1. Update `package.json` and `package-lock.json` to the new version on the feature branch. `npm version <version> --no-git-tag-version` updates both without creating a tag.
2. Run formatting checks, tests, lint, and a production build.
3. Merge the reviewed PR when approved.
4. Check the **Release Windows app** workflow; merging does not mean downloads are already available.

Pushes to `main` and manual dispatch check the package version and release assets. When required downloads are missing, the workflow tests/builds and publishes the versioned installer and portable executable.

Publishing is skipped when the release already has both uploaded downloads. Retrying an existing tag builds its original tagged source. Use a fresh version for changed source rather than replacing an old tag.

Local packaging uses `--publish never`: it creates files without publishing to GitHub.

### Before distributing

Use a test Windows account or machine—not the live journal—to check:

- Install and launch.
- Create, edit, copy, and delete trades; attach and replace screenshots.
- Multi-account saves and independent copied entries.
- Backup and restore, including screenshots.
- Offline operation.

Scan files with the recipient's normal security tools. For wider distribution, sign the Windows installer; an unsigned build may trigger SmartScreen.
