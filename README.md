# Card Expense Tracker

Offline Windows desktop app for tracking day-to-day expenses across multiple cards.

## What it does

- Fast expense entry with amount, card, date, category, and note.
- Quick buttons for common spending such as Fuel and Meals.
- First-run setup with a short introduction, currency selection, Sri Lankan bank card selection, and opening balances.
- Built-in bank badges for HNB, Commercial Bank, Sampath, People's Bank, BOC, NTB / Amex, DFCC, Seylan, NDB, and Pan Asia.
- Card-level accounting: income adds to the selected card balance and expenses subtract from that card balance.
- Monthly spending summary, salary/budget tracking, category totals, and available balance.
- Search and filter transactions by card, category, and text.
- Repeat common transactions and delete mistakes quickly.
- Export the current monthly view as CSV.
- Export a full JSON backup.
- Stores data locally on the computer. No browser, login, or server is required in the desktop build.

## Run From Source

```powershell
npm install
npm run desktop
```

## Create Windows Installer

```powershell
npm run dist
```

The installer is written to:

```text
release/Card Expense Tracker Setup 1.0.0.exe
```

The unpacked app executable is:

```text
release/win-unpacked/Card Expense Tracker.exe
```

## Local Data

The desktop app stores data in Electron's application data folder as `expense-data.json`. The app shows the exact data file path at the bottom of the window.

Use the Backup button regularly if you want a copy on another drive.

## Online Updates

This app includes Electron auto-update support through `electron-updater`.

Before publishing to customers:

1. Create a GitHub repository for releases.
2. In `package.json`, replace:

```json
"owner": "YOUR_GITHUB_USERNAME",
"repo": "card-expense-tracker"
```

with your real GitHub owner and repo.

3. Build the installer:

```powershell
npm run dist
```

4. Upload these generated files from `release/` to a GitHub Release:

```text
Card Expense Tracker Setup 1.0.0.exe
Card Expense Tracker Setup 1.0.0.exe.blockmap
latest.yml
```

5. For the next version, update `version` in `package.json`, for example from `1.0.0` to `1.0.1`, rebuild, and upload the new release files.

Installed apps will check for updates on startup. Users can also press `Check updates` in the app header. When a new version is available, the app shows an update button, downloads the update, and then offers `Restart to update`.

For commercial distribution, use a Windows code-signing certificate so customers do not see SmartScreen trust warnings.
