# DebtQuest

A little closer. Together.

A private, social debt payoff journey for individuals, couples, and friends. React + Vite PWA, with a Capacitor iPhone project.

## Web development

Use Node 22 or newer. Run `npm ci`, then `npm run dev`.

Copy `.env.example` to `.env.local` for optional cloud mode. Both public Supabase values are needed; otherwise the app stores records on this device with IndexedDB. The Supabase schema is in `supabase/schema.sql`. Cloud writes require a connection and reject stale updates from another current-version client.

`npm run build` produces the PWA plus public `/privacy.html` and `/support.html` pages. Set `VITE_SUPPORT_EMAIL` for the support contact. Fonts are bundled, with no runtime Google Fonts requests.

## Social experience and preview

Open `/?demo=1` to explore an interactive fictional journey. Sample changes are isolated from real tracker storage and cloud accounts. Today, Journey, Circle and Rewards provide daily check-ins, per-day XP, payoff comparisons, invitation-only circles, optional payment wins, encouragement, personal rewards and lifetime milestones.

For real circles, deploy the transactional migration and configure the live project using [SOCIAL.md](docs/SOCIAL.md). The code does not deploy Supabase automatically. Real reporting requires an assigned moderation operator and a monitored support inbox before public launch. Device-only builds remain useful private trackers.

## iOS

See [the complete release handoff](docs/app-store/RELEASE.md).

On a compatible Mac with Xcode 26+, copy `.env.ios.example` to `.env.ios.local`, explicitly choose local or cloud mode, then run:

```bash
npm ci
npm run ios:sync
npm run release:check
npm run ios:open
```

The native project uses Swift Package Manager. `ios:sync` builds bundled assets without the PWA service worker and generates the privacy manifest for the chosen mode. Apple signing, device QA, actual App Store screenshots and submission remain release steps. A cloud release also needs the checked-in account-deletion Edge Function deployed and tested.

## Backups and migration

Settings → Export Backup creates a versioned JSON backup. On iOS it opens the share sheet; choose Save to Files. Settings → Import Backup accepts both new exports and the original PWA's unversioned format, validates the data, and asks before replacing current records.

Local browser/PWA and native app storage are separate. Export/import explicitly to migrate local records. For existing cloud data, configure the same Supabase project and sign in with the existing account. Login does not automatically upload local records into a different cloud account.

## Verification

```bash
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

The iOS readiness workflow also compiles an unsigned simulator build on macOS. It does not deploy or publish the app. Reproducible artwork is generated from `assets/app-icon.svg` with `npm run icons`.

See [draft store copy](docs/app-store/LISTING.md) and [privacy worksheet](docs/app-store/PRIVACY.md).
