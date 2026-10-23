# Trading Journal

A private, offline trading journal for Windows. Record trades, review your calendar, and track prop-firm accounts without connecting a broker or paying a subscription.

Your trades, notes, settings, and screenshots stay on your computer. No online account or database setup is required.

**[Download the latest Windows release](https://github.com/mrTwyg/private-trading-journal/releases/latest)** · [User guide](docs/user-guide.md) · [Developer guide](docs/development.md)

## Install and start

1. Open the **latest Windows release** linked above.
2. Under **Assets**, download `Trading-Journal-Setup-<version>-x64.exe`. The version number changes with each release.
3. Open the installer and follow the steps.
4. Start **Trading Journal** from your desktop or Start menu.
5. Open **Settings** to choose your name, currency, and timezone.

You are ready to log your first trade.

**Prefer no installer?** Choose `Trading-Journal-Portable-<version>-x64.exe` instead. It still saves your journal in Windows app-data, not beside the executable.

**Windows warning?** Unsigned builds may trigger SmartScreen. Only continue if you trust the source; the filename alone does not prove a download is safe. [Installation and taskbar help →](docs/user-guide.md#installation-and-taskbar)

## Everyday use

| Where             | What you can do                                                           |
| ----------------- | ------------------------------------------------------------------------- |
| **Calendar**      | Review daily P&L and trade counts in week or month view.                  |
| **Log trade**     | Enter a trade and save it to one or several accounts.                     |
| **Trades**        | Search entries, review notes and charts, edit, or copy to other accounts. |
| **Accounts**      | Track purchases, balances, and evaluation/live status.                    |
| **Setups & tags** | Manage reusable setups, tags, and firm choices.                           |
| **Inbox**         | Review incomplete entries from the optional Codex helper.                 |
| **Settings**      | Change preferences, back up your journal, or restore a backup.            |

### Took the same trade on several accounts?

- **Same risk and result:** click **Log trade**, tick the accounts, and choose **Save to N accounts**.
- **Different amounts:** open a trade, choose **Copy to accounts**, then change the risk/result and select the destinations.

Each saved copy is independent. Opening or cancelling the copy form does not save anything. [Trade-entry instructions →](docs/user-guide.md#log-and-copy-trades)

## Protect your history

**Make a backup before updating, restoring, or changing computers.**

1. Open **Settings → Back up journal**.
2. Save the `.sqlite` backup somewhere private, outside the project folder.
3. Keep another copy on a separate drive or trusted private backup service.

The backup includes trades, notes, settings, tags, and screenshots. There is no automatic cloud recovery. A backup on the same disk will not protect against disk failure.

**Restore backup replaces the current journal.** Back up the current one first. [Backup and recovery instructions →](docs/user-guide.md#backups-and-recovery)

## Update the installed app

1. Make a fresh backup and close every Trading Journal window.
2. Download the newer **Setup** file from the releases page.
3. Run it over the existing installation.
4. Open the app and check several saved trades and screenshots.

Your journal is stored separately from the application. Do not delete its data folder or use an older app to open an upgraded database.

Running from source? Follow [update a local source build](docs/development.md#update-a-local-source-build). You do not need an installer after every source change.

## Share the app, not your journal

Send your friend the **release link or installer**. They install it on their own computer and get a separate, empty journal.

Do not send your `.sqlite` backup unless you intend to share its contents. Trading accounts inside the app are journal categories, not separate user logins.

## More help

- [Account balances, purchases, and moving to Live](docs/user-guide.md#track-prop-firm-accounts)
- [Log trades through the optional Codex helper](docs/user-guide.md#optional-codex-helper)
- [Themes and appearance](docs/user-guide.md#appearance)
- [Find your data or fix a problem](docs/user-guide.md#troubleshooting)
- [Privacy and security limitations](docs/user-guide.md#privacy-and-security)
- [Run, test, and package the app from source](docs/development.md)
