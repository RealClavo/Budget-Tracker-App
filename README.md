# CashControl

CashControl is a professional, installable Progressive Web App for tracking income, expenses, monthly budget goals, spending statistics, and vacation currency conversions. The app is local-first, works offline after the first visit, stores data in LocalStorage, and ships as static files from the `/docs` folder for GitHub Pages.

## Features

- Dashboard with total income, expenses, current balance, remaining monthly budget, progress, recent transactions, and online/offline state.
- Add income or expense transactions with validation for date, type, category, description, amount, and currency.
- Overview with filters for today, this week, this month, all transactions, income, expenses, and category.
- Delete one transaction or clear all transactions after confirmation.
- Budget calculator for monthly income, fixed costs, savings goal, planned spending, weekly limit, daily limit, and savings percentage.
- Statistics page with category spending totals, income versus expenses, average daily spending, highest spending category, and pure CSS charts.
- Currency converter using the free Frankfurter API with cached fallback rates for offline use.
- Dutch and English language switch, with Dutch as the default.
- Dark and light theme switch with saved preference.
- PWA manifest, icons, service worker, offline app shell, and install support.

## Tech Stack

- HTML, CSS, JavaScript
- Node.js, Express, EJS
- LocalStorage
- Service Worker and Web App Manifest
- GitHub Pages static hosting from `/docs`

## Install Locally

```bash
npm install
```

## Run Dev Server

```bash
npm run dev
```

Open `http://localhost:3000`.

## Build Static GitHub Pages Version

```bash
npm run build
```

The build renders EJS pages and copies public assets into `/docs`.

## Preview Static Build

```bash
npm run preview
```

Open `http://localhost:4173`.

## PWA Testing

1. Run `npm run build`.
2. Run `npm run preview`.
3. Open DevTools, then the Application tab.
4. Confirm `manifest.json` loads and the service worker is registered.
5. Reload once so the app shell is cached.
6. Switch DevTools Network to Offline.
7. Reload and confirm the cached pages, CSS, JS, i18n files, icons, and manifest still load.

## LocalStorage Usage

CashControl stores app data locally in the browser. No sensitive personal data, tokens, API keys, or credentials are stored.

- `cashcontrol.transactions`: all income and expense records.
- `cashcontrol.settings`: default currency and monthly budget goal.
- `cashcontrol.budget`: calculator values.
- `cashcontrol.language`: selected language.
- `cashcontrol.theme`: selected theme.
- `cashcontrol.cachedRates`: last successful currency rates.

Transaction shape:

```json
{
  "id": "crypto-random-id-or-timestamp-id",
  "date": "YYYY-MM-DD",
  "type": "income",
  "category": "Salaris",
  "description": "Monthly pay",
  "amount": 1200,
  "currency": "EUR",
  "createdAt": "2026-06-08T09:00:00.000Z"
}
```

## Currency Converter

The converter uses the free Frankfurter API:

```text
https://api.frankfurter.dev/v2/rates?base=EUR&quotes=USD
```

The app builds the request with `encodeURIComponent`, uses no API key, and caches successful rates in LocalStorage. When offline and a cached rate exists, it shows:

```text
Offline modus: laatste opgeslagen wisselkoers wordt gebruikt.
```

## Security Notes

- No secrets, API keys, tokens, `.env` files, or credentials are committed.
- User-created transaction fields are rendered with `textContent`.
- Forms validate required values and positive amounts.
- Description input is sanitized and limited to 80 characters.
- LocalStorage JSON parsing is wrapped in safe helpers and recovers from corrupted data.
- The service worker avoids caching failed API responses.

## GitHub Pages Deployment

1. Run `npm run build`.
2. Commit the updated `/docs` folder.
3. Push to the `main` branch.
4. In GitHub repository settings, set Pages source to `Deploy from a branch`.
5. Select branch `main` and folder `/docs`.
6. The app is served at:

```text
https://realclavo.github.io/Budget-Tracker-App/
```

## School Checklist

- Responsive mobile-first layout: yes
- `manifest.json`: yes
- Service worker: yes
- LocalStorage: yes
- Create/Read/Delete transactions: yes
- Filters for day/week/month: yes
- NL/EN switch: yes
- Git commits: yes
- GitHub Pages deployment from `/docs`: yes
