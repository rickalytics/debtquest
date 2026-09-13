# DebtQuest iOS release handoff

Prepared September 13, 2026. This branch prepares the app; it is not a signed or approved App Store release. No production Supabase settings/data have been changed by this work.

## Build on the Mac mini

1. Install Node 22+ and Xcode 26+ with its command-line tools. Confirm the Mac supports the required macOS version. Check Apple's current SDK submission requirement before archiving.
2. Check out this branch and run `npm ci`.
3. Copy `.env.ios.example` to `.env.ios.local`. Choose the intended release mode explicitly:
   - `local`: independent device-only tracker, no login, no automatic cross-device sync. Existing PWA data moves by JSON export/import.
   - `cloud`: use the SAME Supabase project as the existing PWA, and supply its URL and public anon/publishable key. This preserves access to existing cloud accounts. The service-role key must never go in the app or any VITE variable.
4. Set a monitored `VITE_SUPPORT_EMAIL` in both the iOS environment and the existing web deployment environment. The bundled pages have a public GitHub support fallback for development, but release-check requires a private support contact.
5. Run `npm test`, `npm run ios:sync`, `npm run release:check`, then `npm run ios:open`.
6. In Xcode select the App target and your Apple team under Signing & Capabilities. The proposed bundle ID is `com.rickalytics.debtquest`; confirm it is available and correct before creating the App Store Connect record. Keep capacitor.config.json and the Xcode target in sync if changing it.
7. Run on an iPhone. The target is iPhone-only, portrait, iOS 15.4+. Test iPad compatibility mode too. Local browser mobile emulation does not replace this step.
8. Set the version/build number (currently 1.0.0 / 1), choose a generic iOS device, Product → Archive, then Validate App and Distribute App through Organizer. No signing keys belong in git.

`npm run ios:sync` bundles all web assets and fonts and regenerates the privacy manifest for the selected mode. The native build does not register the PWA service worker or load a remote app URL. Run this command after every app change. Native updates are distributed as new App Store builds.

## Cloud-only deployment gate

A cloud build must not be submitted before completing these steps:

- Verify the existing `supabase/schema.sql` table, own-user RLS policies, and `ON DELETE CASCADE` foreign key. Do not blindly re-run CREATE POLICY statements on an existing project.
- Deploy `supabase/functions/delete-account` to that project using the Supabase CLI: `supabase functions deploy delete-account --project-ref YOUR_PROJECT_REF`. The checked-in function config disables gateway JWT verification because the handler validates the caller itself using `auth.getUser(token)` before any action. It also verifies the password. Never remove these checks.
- The service-role key is used only inside the Edge Function runtime. Supabase provides the SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY environment values there.
- Test account creation with email confirmation enabled, email delivery, sign-in after confirmation, and account recovery using the configured Supabase email flow. Recovery UX is still the existing email-provider flow; there is no dedicated in-app password-reset screen in this change.
- With a NEW disposable account, verify deletion removes both the auth user and the corresponding debtquest_data row. Verify missing/invalid tokens and wrong passwords cannot delete records; verify a supplied third-party user ID is ignored.
- Verify two different users cannot read or change each other's records. Test two devices on the same account: after one saves, the stale device must reject its change and prompt for reload. Cloud mode has no offline write queue or live multi-user merge.
- Review provider log/backup retention and update the privacy policy if needed. The manifest and App Store disclosures must reflect the actual shipped mode and providers.

The existing PWA should be updated to the same conflict-protected save implementation before advertising safe multi-device use. An older PWA client can still perform unconditional writes. Coordinate rollout and ask existing users to close/reopen their PWA after the update.

## Required hands-on acceptance checks

Use fictional records and disposable accounts only.

- [ ] Cold launch works; notch/status bar/home indicator and keyboard do not cover controls.
- [ ] Add a debt; log a payment; reject negative/over-balance payments; navigate every tab; verify balances against inputs.
- [ ] Force quit and relaunch; install an update over the existing build; confirm payments and rewards persist.
- [ ] Export through the native share sheet to Files; import into a clean install; compare balances/payment history. Cancel sharing and importing safely.
- [ ] Import an old unversioned PWA backup, cancel replacement, reject malformed files, and confirm current data survives.
- [ ] Airplane mode: local editing works; cloud load/save failures show an error without wiping data or falsely reporting success.
- [ ] Cloud sign-in/out, confirmation emails, deletion success/failure, RLS isolation, and stale-device writes tested against the intended backend.
- [ ] Privacy/support open from both login and Settings; support inbox works; hosted pages are reachable without login.
- [ ] Larger text, VoiceOver essentials, reduced motion, small iPhone, and iPad compatibility mode checked.
- [ ] Xcode archive validation/privacy report and TestFlight smoke pass.

## App Store Connect

- Create the app record under the intended individual/organization account and matching bundle ID.
- Use LISTING.md for draft metadata and reviewer notes. Capture real iOS screenshots after final device QA; do not submit browser mockups as final store screenshots.
- Publish this branch's privacy.html and support.html on the EXISTING web host as part of the reviewed web deployment. Enter their actual public HTTPS URLs in App Store Connect. This branch has not deployed those pages.
- Complete age-rating questionnaire honestly for the shipped features and user-entered reward content. The preloaded suggestive reward wording has been replaced with an ordinary quality-time reward for new profiles; existing saved custom content is preserved.
- Complete app privacy using PRIVACY.md. Answer encryption/export questions for the final build; Info.plist currently declares no non-exempt encryption because the app uses platform/HTTPS encryption, without custom cryptography. Reassess if dependencies or features change.
- Supply reviewer contact information and a working demo account for cloud mode; ensure the backend stays available. Local mode needs no login.
- Choose price and territories. This preparation contains no paid subscription, ad, or in-app purchase implementation. A free first release is assumed in the draft listing.
- If distributing in EU territories as a trader, complete Apple's trader-status requirements and contact verification in App Store Connect.

## Sources

- https://capacitorjs.com/docs/getting-started/environment-setup
- https://capacitorjs.com/docs/ios/deploying-to-app-store
- https://capacitorjs.com/docs/apis/filesystem
- https://developer.apple.com/app-store/review/guidelines/
- https://developer.apple.com/news/upcoming-requirements/
- https://developer.apple.com/support/offering-account-deletion-in-your-app/
