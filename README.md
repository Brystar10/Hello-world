# Personal Shift Calendar PWA

A personal, installable shift-calendar web app. Built with plain HTML, CSS, and JavaScript.

## Features in this first version
- Monthly calendar and selected-day shift details
- Add, edit, and delete shifts
- Overnight shifts (end time earlier than start time means next day)
- Generate recurring shifts on chosen weekdays for a date range
- Bulk-add shifts to multiple dates
- Default shift start/end times and label
- Local browser storage
- Export/import JSON backup
- PWA manifest, app icons, service worker for offline app shell

## Important data note
The schedule is saved in the browser's local storage on this device. It does not automatically sync between devices. Avoid clearing Safari website data unless you have exported a backup. Export a backup occasionally.

## Test locally on Windows
A service worker and installable PWA require HTTPS or localhost. To preview:
1. Install Python if needed.
2. Open PowerShell in this folder.
3. Run `py -m http.server 8000`
4. On the PC, visit `http://localhost:8000`.

For iPhone testing, localhost on the PC is not the same as the iPhone. Host the folder over HTTPS using one of the options below.

## Easiest hosting path: GitHub Pages
1. Create/sign in to a GitHub account.
2. Create a new public repository (or use a private hosting option if preferred).
3. Upload all files in this folder to the repository root.
4. In repository Settings > Pages, enable deployment from the main branch and root folder.
5. Wait for GitHub to provide an HTTPS site URL.
6. Open that URL on the iPhone in Safari.
7. Tap Share > Add to Home Screen. If shown, enable “Open as Web App”, then tap Add.

GitHub Pages hosting requires a GitHub account and is public-site hosting for a public repository. Do not put sensitive personal data in the source files. The actual shift entries are stored locally in the browser and are not committed to the repository.

## Schedule generation notes
The recurring generator supports selected weekdays, not a complex rotating cycle yet. For the initial schedule, choose Mon–Thu if that matches your actual 4 × 10-hour week, set the correct times, choose the date range, and generate. The known work date 2026-10-26 is prefilled as the starting date.
