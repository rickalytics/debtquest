# DebtQuest App Store privacy worksheet

Prepared September 13, 2026 from the release branch's source, schema, and deletion function. This is the proposed declaration for the **connected social release**, not a submitted declaration. Confirm the final services and archive before copying answers into App Store Connect.

## Proposed answers

| App Store question                            | Prepared answer                                                                              |
| --------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Does the app or its partners collect data?    | Yes for the connected app. Account records and circle activity are stored off device.        |
| Is data used to track users?                  | No in this implementation. Confirm provider settings and the final SDK inventory.            |
| Is collected account data linked to the user? | Yes. It is associated with an account, email, or circle identity.                            |
| Purpose for the data below                    | App Functionality: accounts, saved progress, social features, support, and abuse prevention. |
| Advertising, marketing, analytics purposes    | None in the current implementation. There is no analytics or advertising SDK.                |

| Apple data type                       | DebtQuest information                                                                                           | Linked to user | Tracking |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------- | -------- |
| Contact Info → Name                   | Profile and circle display names                                                                                | Yes            | No       |
| Contact Info → Email Address          | Authentication and support contact                                                                              | Yes            | No       |
| Identifiers → User ID                 | Supabase account ID, circle membership associations                                                             | Yes            | No       |
| Financial Info → Other Financial Info | Manual balances, APRs, minimums, payment records, optional shared payment amounts                               | Yes            | No       |
| User Content → Other User Content     | Goals, private notes, reward plans, structured shared activity                                                  | Yes            | No       |
| User Content → Customer Support       | In-app member/activity reports and support correspondence                                                       | Yes            | No       |
| User Content → Gameplay Content       | Saved XP, levels, milestones, weekly chest claims, companion looks, and reward progress in the gamified journey | Yes            | No       |
| Usage Data → Product Interaction      | Check-ins, payment-win sharing, and encouragement events                                                        | Yes            | No       |

Customer Support is included conservatively rather than relying on Apple's optional-disclosure exception. Gameplay Content is included for saved game-like progress; Product Interaction covers actions. The cloud privacy-manifest generator includes both. These are classification judgments based on the app's behavior, not an Apple ruling.

No bank or card credentials, credit score, contacts, location permission, photo library, microphone, advertising identifier, or purchases are requested. Manual payment records belong under financial information; the app does not process a lender payment. Preset cheers and check-ins are not a private messaging feature. Do not claim that free-form notes could never contain additional information a user chooses to enter.

Apple requires disclosures to include relevant third-party collection and web-view traffic. Data stored solely on device is treated differently from data retained off device. A local-only binary does not justify “Data Not Collected” for an app whose supported experience also collects cloud data. [Apple's definitions, types, optional-disclosure criteria, and additional guidance](https://developer.apple.com/app-store/app-privacy-details/).

## Provider facts that still need confirmation

Source inspection cannot establish the live project's plan, region, log settings, email vendors, access lists, or backup schedules. Complete this inventory from the actual accounts before public launch; do not invent a deletion deadline or describe retained logs as transient.

| Service              | Verified from the project                                                               | Owner must confirm                                                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Supabase             | Account authentication, private JSON tracker, circle tables, reports, deletion function | Project/region, plan, log fields and retention, database/PITR and manual backup retention, authorized access, processor terms            |
| Vercel               | Existing website and preview host; app has no Vercel analytics SDK                      | Production domain, request/security logs and retention, whether dashboard analytics/integrations/log drains are enabled, processor terms |
| Authentication email | Confirmation and recovery use Supabase Auth                                             | Actual SMTP vendor, message/link logging, retention, delivery test, processor terms                                                      |
| Support email        | Build-time private mail links; no embedded help-desk SDK                                | Monitored address, mailbox provider, who has access, correspondence retention and deletion procedure                                     |
| Operator copies      | No production operational inventory is available here                                   | Any database exports, incident evidence, spreadsheets, or external issue systems; access and retention for each                          |

Supabase log retention depends on the project plan; backup availability also varies. Verify the selected configuration and any extra copies. [Supabase logs](https://supabase.com/docs/guides/observability/logs), [database backups](https://supabase.com/docs/guides/platform/backups). Inspect the actual Vercel logging configuration as well. [Vercel logs](https://vercel.com/docs/logs/runtime).

For retained IP addresses, device/browser details, or error logs, classify the data according to its **actual use** (for example, diagnostics for operational troubleshooting). Confirm whether it is linked to a user; do not assume anonymous. Add the applicable types to this worksheet and `scripts/ios-privacy.mjs` after that review. Do not select location just because a request contains an IP address; check whether location is actually derived or retained.

## Retention and deletion: source evidence

| Information                         | Actual behavior                                                                                                                                                                                                            |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Private tracker                     | No inactivity purge. Reset replaces the payload; account deletion cascades the account's row.                                                                                                                              |
| Social profile/memberships/activity | Account deletion cascades; removing shared activity deletes authored posts and reactions; leaving also removes membership/invitations.                                                                                     |
| Owned circles                       | Account deletion removes them for every member. Leaving first transfers ownership when another member remains.                                                                                                             |
| Invitations                         | Expire after seven days; a new link replaces that member's old link. Expiry alone is not a scheduled database purge.                                                                                                       |
| Reports                             | Deleting the reporter cascades their reports. Deleting reported users or events clears those references in others' retained reports. Reporter identifiers can remain. No automatic time-based report purge is implemented. |
| Older activity                      | Feed limits are display/query limits, not deletion.                                                                                                                                                                        |
| Support correspondence              | Separate mailbox, not removed by the in-app account-deletion function. Operator must handle requests and retention.                                                                                                        |
| Backups/logs                        | Not erased by a row deletion. Verify provider expiration, manual copies, and the deletion-reapplication process after a restore.                                                                                           |
| User exports                        | Readable JSON; native temporary share file is removed on completion on a best-effort basis. Copies saved elsewhere remain with the chosen destination.                                                                     |

Evidence: `src/db.js`, `src/native.js`, `src/lib/social.js`, `supabase/schema.sql`, `supabase/migrations/202609130001_private_circles.sql`, and `supabase/functions/delete-account/index.ts`.

## Public URLs and final review

| App Store field                | URL to use after production publication          |
| ------------------------------ | ------------------------------------------------ |
| Privacy Policy URL             | Final HTTPS app origin + `/privacy.html`         |
| Support URL                    | Final HTTPS app origin + `/support.html`         |
| Privacy Choices URL (optional) | Final HTTPS app origin + `/privacy.html#choices` |

The HTML pages are the authoritative customer-facing copy, with one source for web and iOS. Contact links are inserted at build time from `VITE_SUPPORT_EMAIL`; the raw source has contact markers, not an invented inbox. The support page contains deletion instructions, reporting guidance, and FAQs. Both pages work without account access or JavaScript. Existing Vercel rewrites preserve real static files before the app fallback.

Before publishing: confirm Rick Griffith is the correct operator/seller identity, verify the private contact, adopt the support process, confirm provider protections and retention, and review the actual launch territories. The children paragraph says the app is not directed to children under 13; it is not an age-verification system or a substitute for the App Store age questionnaire. No universal legal-compliance claim is made by this worksheet.

Apple requires accessible policy links, an explanation of data use and retention, and appropriate protection by third parties. [Review guideline 5.1.1](https://developer.apple.com/app-store/review/guidelines/#privacy). Review the complete archive privacy report, including transitive SDKs, and rebuild after any disclosure change. File Timestamp reason C617.1 remains declared for the user-initiated backup flow. The manifest does not submit App Store privacy answers automatically.
