# User guide

[← Back to the README](../README.md)

Jump to: [Installation](#installation-and-taskbar) · [Trades](#log-and-copy-trades) · [Accounts](#track-prop-firm-accounts) · [Codex](#optional-codex-helper) · [Backups](#backups-and-recovery) · [Troubleshooting](#troubleshooting)

## Installation and taskbar

Download from the project's [latest release](https://github.com/mrTwyg/private-trading-journal/releases/latest), then choose:

| File                                         | Use it when…                                                              |
| -------------------------------------------- | ------------------------------------------------------------------------- |
| `Trading-Journal-Setup-<version>-x64.exe`    | You want an installer, desktop shortcut, and Start menu entry.            |
| `Trading-Journal-Portable-<version>-x64.exe` | You want to run without installing. Data still lives in Windows app-data. |

The installer and portable app use the same journal under the same Windows account. Avoid running multiple copies at once.

### Pin to the taskbar

1. Open Trading Journal.
2. Right-click its running taskbar icon.
3. Select **Pin to taskbar**.

If an old pin opens the wrong version, unpin it and pin the running version you want. The installer does not silently change pinned apps.

### SmartScreen warning

An unsigned build may show **Windows protected your PC**. Only use **More info → Run anyway** if you trust the build's source. Check the publisher details; an expected filename is not proof of safety. Do not bypass warnings for unknown downloads.

## Log and copy trades

### Add a trade

1. Choose **Log trade**. Opening it from a calendar day prefills that day.
2. Select the account or accounts that took the trade.
3. Enter the date/time, instrument, direction, and setup.
4. Enter risk, outcome, and monetary result.
5. Add notes, tags, and an optional screenshot.
6. Check the details and save.

Instruments are **NQ, ES, MNQ, and MES**. Risk must be greater than zero. The app calculates signed P&L and R-multiple.

- **Win:** positive P&L.
- **Loss:** amount lost equals risk; changing risk updates the loss.
- **Breakeven:** zero P&L.

Notes support formatting. Screenshots must be JPEG, PNG, or WebP, at most 10 MB. Choose a file or paste an image into the form with **Ctrl+V**. Open a saved chart to enlarge it.

### Same trade, several accounts

Tick every account with the **same risk and monetary result**, then choose **Save to N accounts**.

Each account gets an independent entry and screenshot. The whole batch saves or none of it does if validation or persistence fails. Editing or deleting one saved copy affects only that entry.

Only active accounts can receive new trades. A batch must use one currency; there is no currency conversion.

### Copy with different amounts

1. Open an existing trade and choose **Copy to accounts**.
2. Select destination accounts.
3. Change risk, result, or any other details that differ.
4. Save.

The form prefills the original date/time, symbol, setup, tags, notes, and screenshot. Opening or cancelling it creates nothing. Saving copies never edits the source.

Editing an existing trade stays a single-entry operation. Deleting a trade is permanent; recovery requires an earlier backup.

## Track prop-firm accounts

Open **Accounts → Add account**. Enter name, firm, status, size, opening balance, initial purchase price, purchase date, and optional discount code in the same form.

Each purchased account is separate, even from the same firm. Use **Group by firm** to group them. Manage firm choices under **Setups & tags → Prop firms**; removing a choice does not change historical accounts.

### Purchases and balances

- Tracking amounts are **USD**, shown with a `$` prefix.
- Initial purchase is the final amount paid after discounts.
- Opening balance is the full balance, such as `$50,000`, not profit alone.
- Current balance = opening balance + USD trade results from the chosen start time + adjustments.
- **Payout / adjustment** records withdrawals (negative) or credits (positive), without changing trade P&L. Correct a mistake with another adjustment.

Choose a start time after trades already included in the opening balance to avoid counting them twice. Editing, deleting, copying, or moving trades recalculates affected balances.

### Existing accounts after an update

Accounts without tracking details appear under **Not tracked**. Choose **Enable tracking**, enter the current opening balance, and set the start time carefully.

Older trades, screenshots, currencies, settings, and assignments stay saved. New trades on tracked accounts use USD; historical currencies are not converted. Calendars separate currencies when necessary.

### Move to Live

Choose **Move to Live** on an evaluation and confirm the new starting balance.

The evaluation becomes **Passed**, keeping its trades and purchase cost. A linked **Original name — Live** account starts fresh, with no trades and zero additional purchase cost.

Passed, Blown, and Closed accounts appear in **History** and cannot receive new trades. Correct Blown or Closed status using **Edit tracking** if needed.

### Mark an account blown

When saving to one tracked account, select **This trade blew the account** and confirm. Status changes only if saving succeeds. The option is hidden for multi-account saves.

Deleting that trade later recalculates balance but does not reopen the account; correct its status separately.

### Archive versus delete

- **Archive** keeps the account and its history; you can restore it.
- **Delete account** permanently removes its trades, screenshots, tracking details, and adjustments. Type its exact name to confirm. Back up first.

Delete is available in Accounts and beside an account in Setups & tags. Linked evaluation/live accounts keep their own history. Drafts keep their content but need a new account assignment.

## Optional Codex helper

The journal needs no AI service. This optional helper lets Codex prepare entries from dictated details and screenshots.

1. Open **Settings → Codex helper → Enable Codex helper** and confirm.
2. Restart Codex once to discover the installed skill.
3. Give Codex the trade details and identify the account.
4. Attach a screenshot or supply a local JPEG, PNG, or WebP file.

Example:

> Log an MNQ long for my evaluation account today. I risked $250 and won $500. The setup was a London low sweep, bullish SMT, then a one-minute inverse FVG. Use the attached screenshot.

Complete entries save automatically. Missing or uncertain required facts become **Inbox** drafts, which do not affect calendars or performance figures. Ambiguous accounts also require review.

Codex may tidy wording and tags, but must not invent date, symbol, direction, risk, outcome, or result. Check imported entries.

### Local handoff

Codex writes a package into a local inbox; only the journal writes journal records. If the journal is closed, packages wait until it next opens.

Use **Settings → Open inbox folder** to find the exact path. Normally:

```text
C:\Users\YOUR-NAME\Documents\Codex\Trading Journal Inbox
```

Disabling the helper removes the installed skill, not journal data or existing inbox files. Reinstall it after an update that changes its account-handling instructions.

## Appearance

Open **Settings → Appearance**. Changes preview immediately; choose **Save appearance** to keep them.

Choose Midnight, Obsidian, Violet Horizon, or Light Alloy. Adjust accent, density, corners, typography, motion, and glow. Outcomes use text/icons as well as colour.

## Backups and recovery

### Find your data

The exact path appears at the bottom of **Settings**. Normally:

```text
C:\Users\YOUR-NAME\AppData\Roaming\Trading Journal\trading-journal.sqlite
```

This file contains the complete journal, including screenshots. Changes save immediately. Do not edit, rename, move, or replace the live file while the app is open.

### Make a backup

1. Open **Settings → Back up journal**.
2. Save outside the source/project folder, in a private location.
3. Keep another copy on a separate device or trusted private backup service.

Back up regularly and before updating, reinstalling, restoring, or changing computers. Keep older copies; there is no automatic rolling backup history or cloud recovery.

Certain upgrades make a one-time recovery copy beside the database:

- Account tracking: `trading-journal.sqlite.before-account-tracker-v5.bak`.
- Account management: `trading-journal.sqlite.before-account-management-v6.bak`.

Keep these files. They are pre-upgrade snapshots, not backups of later entries or undo buttons. Do not use an older app to open an upgraded database.

### Restore

**Restoring replaces the current journal.**

1. Back up the current journal if it contains anything you may need.
2. Choose **Settings → Restore backup** and select a journal `.sqlite` backup.
3. Check saved trades, screenshots, and settings.

The app validates the backup before replacing the current database. Restoring an old backup also rolls back newer entries, unless you preserved them in another backup.

### Move computers

1. Back up on the old computer and copy the file privately to the new one.
2. Install Trading Journal on the new computer.
3. Restore through Settings.
4. Check trades and screenshots before deleting anything from the old computer.

### Separate test copies

An isolated preview may use a copy of your data and a separate Codex inbox. Its entries do **not** sync to the normal journal. Check the storage path and preview warning before using an unfamiliar shortcut for real entries.

## Troubleshooting

| Problem                  | First check                                                                                                                  |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Empty journal            | Compare the Windows account and storage path in Settings. Do not delete or overwrite either data folder while investigating. |
| Wrong app opens          | Check the desktop shortcut; an old taskbar pin may launch another version.                                                   |
| Screenshot rejected      | Use JPEG, PNG, or WebP, at most 10 MB. Resize a large image first.                                                           |
| App will not start       | Protect the database before reinstalling or changing files. Restart Windows and retry; reinstalling is not a backup.         |
| Wrong backup restored    | Restore the correct backup if available. Preserve the current journal first if it has unique entries.                        |
| Trade deleted by mistake | An earlier backup can recover it, but restores the entire journal to that earlier state.                                     |

## Privacy and security

- The journal and inbox work locally. Sending text/images to Codex uses your Codex account and its processing settings; that part is not offline AI.
- There is no app password. Someone using your unlocked Windows account may access the journal.
- The app does not encrypt its database or backups. Use a strong Windows password and device encryption/BitLocker where appropriate.
- Backups are as sensitive as the live journal. Do not send one with the installer unless you intend to share it.
- Two people on separate computers have separate journals. There is no sharing or automatic synchronisation.

This app records trades. It does not place orders, verify broker statements, calculate tax, or provide financial advice.
