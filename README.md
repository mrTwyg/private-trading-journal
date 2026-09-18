# Trading Journal

A private trading journal that runs entirely on your Windows computer.

It does not need an online account, a broker connection, Supabase, or a monthly subscription. Your trades, notes, settings, tags, and screenshots are kept in one local SQLite database on your computer.

## The short version

If someone sent you this app:

1. Download **Trading-Journal-Setup-1.2.0-x64.exe**.
2. Open it and follow the installation steps.
3. Start **Trading Journal** from the desktop shortcut or Start menu.
4. Open **Settings** and change the display name, currency, and timezone.
5. Use **Log trade** to add your first trade.
6. Use **Settings → Back up journal** regularly.

Each person installs their own copy. The two copies are completely separate: neither person can see or change the other person's journal.

## Pinning it to the Windows taskbar

After installing the app:

1. Open **Trading Journal**.
2. Find its icon on the taskbar.
3. Right-click the icon.
4. Select **Pin to taskbar**.

You can also open the Start menu, search for **Trading Journal**, right-click it, and choose **Pin to taskbar**. Windows requires you to make this choice yourself; the installer does not silently change your pinned apps.

## Which file should I use?

A packaged release normally contains two Windows programs:

- **Trading-Journal-Setup-1.2.0-x64.exe:** use this for the normal setup experience, desktop shortcut, and Start menu entry.
- **Trading-Journal-Portable-1.2.0-x64.exe:** use this if you want to open the app without installing it. Your journal is still stored in your Windows app-data folder—not inside the portable program itself.

The installer and portable program use the same journal data when they are run under the same Windows account.

## Windows may show a warning

This is a privately built app and is not digitally signed. Windows SmartScreen may show **Windows protected your PC**.

Only continue if you received the file directly from someone you trust and the filename is the one you expected. Select **More info**, check the publisher information, and then select **Run anyway**.

Do not bypass the warning for a copy downloaded from an unknown website or sent by an unknown person.

## What the app can do

- Show trades in separate week and month calendars.
- Show daily, weekly, and monthly profit or loss.
- Record the instrument, direction, setup, risk, outcome, result, and R-multiple.
- Choose the instrument from NQ, ES, MNQ, or MES.
- Keep full-loss entries consistent: selecting Loss automatically makes the amount lost equal the risk amount.
- Store formatted thought-process notes.
- Attach one JPEG, PNG, or WebP screenshot up to 10 MB to a trade.
- Paste a chart screenshot directly into the trade form with **Ctrl+V** instead of browsing for a file.
- Create reusable setups and tags.
- Search trades and filter them by outcome.
- Edit, duplicate, and delete trades.
- Back up and restore the entire journal.
- Accept dictated and screenshot-supported trade entries from Codex through an optional local helper.
- Customise the interface with four themes, five accent choices, comfortable or compact density, three corner styles, clean or technical type, motion preferences, and glow intensity.

## Changing the journal appearance

Open **Settings → Appearance**. Theme changes preview immediately; select **Save appearance** to keep them after closing the app.

The four visual systems are:

- **Midnight:** the original cyan glass and deep navy design.
- **Obsidian:** black and graphite with signal-green details.
- **Violet Horizon:** indigo surfaces with ultraviolet accents.
- **Light Alloy:** a bright technical workspace for daylight use.

Success, loss, and breakeven states continue to use text and icons as well as colour. Reduced Motion can follow Windows or be forced on inside the journal.

## Logging trades with Codex

This is optional and is intended for the computer where you use Codex.

1. Open **Settings** in Trading Journal.
2. Under **Codex helper**, select **Enable Codex helper** and confirm.
3. Restart Codex once so it can discover the new local skill.
4. In Codex, say something like: **“Log this trade. MNQ long today, risked £250, won £500. London low sweep, bullish SMT, then a one-minute inverse FVG.”**
5. Attach or name a local JPEG, PNG, or WebP chart screenshot if you want it stored with the trade.

Complete entries are added automatically. If a required fact is missing or uncertain, the entry appears under **Inbox** as a draft. Drafts never affect the calendar, trade count, P&L, win rate, or R totals.

Codex is allowed to tidy setup wording, notes, and tags. It is not allowed to guess the date, symbol, direction, risk, outcome, or monetary result. Check imported trades just as you would check a manually entered trade.

The helper does not write directly to the SQLite database. It places a versioned file in:

```text
C:\Users\YOUR-NAME\Documents\Codex\Trading Journal Inbox
```

Trading Journal validates that file and remains the only program that writes journal records. If the journal is closed, the entry waits in the inbox and is processed the next time the app opens.

Use **Settings → Open inbox folder** to inspect the local files. **Disable helper** removes the installed Codex skill but does not delete journal data or existing inbox files.

## Where is my journal stored?

The app shows the exact location at the bottom of **Settings**. On a normal Windows installation it will be similar to:

```text
C:\Users\YOUR-NAME\AppData\Roaming\Trading Journal\trading-journal.sqlite
```

That SQLite file contains the complete journal, including screenshots. The application saves changes immediately.

Do not edit, rename, move, or replace this live file while Trading Journal is open.

## Backing up your journal

A backup is important because the app deliberately has no cloud copy.

1. Open **Settings**.
2. Select **Back up journal**.
3. Choose a safe location and select **Save**.
4. Copy the resulting `.sqlite` file to another drive, an encrypted cloud folder, or other trusted storage.

A useful routine is to make a backup once a week and before updating, reinstalling, or changing computers.

The backup contains everything: trades, notes, settings, setups, tags, and screenshots. Treat it as private information.

## Restoring a backup

Restoring replaces the journal currently open in the app.

1. Back up the current journal first if it contains anything you may want later.
2. Open **Settings**.
3. Select **Restore backup**.
4. Choose a Trading Journal `.sqlite` backup.
5. Confirm that your trades and settings appear correctly.

The app checks that the selected file is a valid Trading Journal database before replacing the current journal.

## Moving to another computer

1. On the old computer, create a backup from **Settings**.
2. Copy the `.sqlite` backup to the new computer using a trusted method.
3. Install Trading Journal on the new computer.
4. Open **Settings → Restore backup** and choose the copied file.
5. Check several trades and screenshots before deleting anything from the old computer.

## Privacy and security: important limitations

- The journal and its inbox work offline and do not intentionally send your data anywhere. If you choose to dictate or attach an image to Codex, that content is processed according to your Codex account and app settings before the resulting entry is handed to the offline journal.
- There is no app password. Anyone who can use your unlocked Windows account may be able to open the journal.
- The SQLite database and backups are **not encrypted by this app**.
- Use a strong Windows password and enable device encryption or BitLocker if the journal is sensitive.
- Keep backups somewhere private. A backup has the same sensitive information as the live journal.
- There is no automatic synchronization or cloud recovery.

This is a personal journaling tool, not brokerage software. It does not place trades, calculate tax, verify broker statements, or provide financial advice.

## If two people want to use it

Install one copy on each person's computer. Each installation creates its own database automatically.

You do not need to create accounts or share a database. Sending the installer gives the other person the app, not access to your journal. Never send your `.sqlite` backup unless you intentionally want to give someone all of that journal's contents.

## Everyday troubleshooting

### The app opens with an empty journal

You may be using a different Windows account or computer, or the app may be looking at a new data folder. Open **Settings** and compare the displayed storage location with the one you used previously. If you have a backup, restore it.

### A screenshot will not attach

Use a JPEG, PNG, or WebP image no larger than 10 MB. Very large screenshots can be resized with the Windows Photos app before attaching them.

### The app will not start

Restart Windows and try again. If that does not help, reinstall the app. Reinstalling should not be treated as a backup: protect the `.sqlite` file first whenever possible.

### I restored the wrong backup

Restoring replaces the current journal. Restore a newer backup if you have one. The app does not keep automatic backup history.

### I deleted a trade by mistake

Trade deletion cannot be undone inside the app. You can restore an earlier backup, but doing so also returns the rest of the journal to the state it had when that backup was made.

## Updating the app

1. Create a fresh backup.
2. Close Trading Journal.
3. Install the newer version over the existing version.
4. Open the app and confirm that several trades and screenshots are present.

Do not delete the old installer or your latest backup until the updated app has been checked.

## For technical users and maintainers

The desktop app uses Electron, a statically exported Next.js interface, and SQLite through `sql.js`. The Electron renderer is isolated from Node.js; database operations are exposed through a narrow preload bridge.

Requirements for building from source:

- Windows 10 or newer
- Node.js 22 or newer
- npm

From the project folder:

```powershell
npm install
npm test
npm run package:windows
```

Finished Windows packages are written to `release/`.

Useful development commands:

```powershell
npm run dev
npm run build
npm run desktop
npm run lint
npm test
```

`npm run dev` shows only the browser interface. It cannot open the private SQLite database because database access is deliberately limited to the desktop application. To test the real local-storage flow, run `npm run build` followed by `npm run desktop`.

Before distributing a release:

1. Run the tests and production build.
2. Install the generated installer on a clean Windows user account or test machine.
3. Create, edit, duplicate, and delete a trade.
4. Attach and replace a screenshot.
5. Create a backup, add another trade, and restore the backup.
6. Confirm the app works with networking disabled.
7. Scan the installer with the normal security tools used by the recipients.

For wider public distribution, digitally sign the Windows installer. An unsigned private build will commonly trigger SmartScreen warnings.
