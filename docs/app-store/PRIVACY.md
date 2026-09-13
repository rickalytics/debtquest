# Privacy submission worksheet

This is a preparation worksheet, not a completed App Store declaration. Confirm the actual native build, web version, service-provider logs, and final dependencies. Apple asks for comprehensive app-level disclosures across supported platforms.

| Data                        | Device-only build                             | Cloud build                                                                     | Purpose / tracking                                        |
| --------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Email address               | Not sent by the app                           | Supabase login/account                                                          | App functionality; linked to user; no tracking            |
| Name/display names          | Local                                         | Stored if entered                                                               | App functionality; linked to user; no tracking            |
| User identifier             | None sent                                     | Supabase account ID                                                             | App functionality; linked to user; no tracking            |
| Other financial information | Balances, rates, payment entries remain local | Stored in account payload                                                       | App functionality; linked to user; no tracking            |
| Other user content          | Notes/rewards remain local                    | Private notes/rewards, shared activity, reactions and safety reports if entered | App functionality; linked to user; no tracking            |
| Product interaction data    | Daily check-ins stay local                    | Check-ins, payment-win sharing and reactions tied to account                    | App functionality; linked to user; no tracking            |
| Provider operational logs   | No cloud requests in explicit local mode      | Review Supabase/hosting logs and retention                                      | Verify applicable disclosure; no advertising SDK included |

The native privacy manifest is generated from the selected iOS build mode. It includes File Timestamp reason C617.1 for user-initiated backup files in the app sandbox. Review the archive's complete privacy report, including transitive SDKs, in Xcode.

A pure device-only app may qualify for "Data Not Collected" if neither this app nor its third-party partners collects data under Apple's definitions. Do not select that for an app that also collects cloud account data on a supported platform. Exported copies are handed to a destination only at the user's request.

Privacy policy is bundled and also built as /privacy.html. The policy and support page need real public HTTPS hosting for the App Store fields. Supply a monitored support email and verify it before publishing. User financial information must never be pasted into public GitHub issues.

Sources:

- https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/
- https://developer.apple.com/app-store/app-privacy-details/
- https://capacitorjs.com/docs/ios/privacy-manifest

Private-circle disclosure and moderation requirements are in [SOCIAL.md](../SOCIAL.md). Review whether engagement events fall under Product Interaction in the final App Store questionnaire. The cloud manifest includes ProductInteraction for check-ins and reactions; it is not used for advertising.
