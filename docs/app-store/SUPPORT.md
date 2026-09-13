# DebtQuest privacy and support handoff

Prepared September 13, 2026. The customer pages and email-link configuration are implemented. No mailbox, production service, automatic reply, moderator, or public release has been activated by this work.

## Finish the contact setup

1. Choose an inbox Rick controls and will monitor. A dedicated alias forwarding to an existing mailbox is sufficient if sending replies from the alias also works. No particular domain or address has been assumed.
2. Set `VITE_SUPPORT_EMAIL` to that single address in both the existing web host's environment and `.env.ios.local`. This address is public by design; never put a password or server secret in it.
3. Build the website and run `npm run ios:sync`. The pages contain the contact address and topic-specific `mailto:` links in their HTML, with no sign-in or JavaScript dependency. In an unconfigured preview, a launch notice replaces the links; no public issue tracker is offered for private concerns.
4. Follow `PRIVACY.md` to confirm the operator, provider terms, retention settings, and the final disclosures. The current policy identifies Rick Griffith, matching the existing policy. Update both pages if a different entity will operate the app.
5. Verify the links open correctly on iPhone and desktop, then perform a real send/reply check with the chosen mailbox. Do this only after the inbox is chosen; automated page checks do not prove delivery or monitoring.
6. Publish through the existing reviewed deployment workflow. Use the final production HTTPS `/privacy.html` and `/support.html` URLs in App Store Connect. A branch preview is for review, not the final listing.

`npm run release:check` now inspects the actual bundled HTML for a complete page and the currently configured address. Changing an environment value without rebuilding is insufficient.

The current feature-branch preview redirects anonymous visitors to Vercel sign-in. It is suitable for the owner's review, but not for App Store privacy/support fields. Verify the final production pages from a signed-out browser before submission; a successful deployment status alone does not prove public access.

## Support workflow

Assign a named primary operator and a backup before a connected public launch. As an internal starting target, check the private inbox and the in-app report queue every day. The public pages do not promise a response deadline that has not been staffed.

| Incoming issue         | First action                                                                                       | Information to request                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Sign-in/recovery       | Check delivery configuration, time, and account state; direct the user to the newest recovery link | Account email, approximate request time, error text; never their password or link                        |
| Save/import problem    | Establish account vs sample/local mode and whether a newer device has saved                        | Steps, app/device version, redacted error; never request a full backup as the default                    |
| Invitation             | Check expiry, revocation, capacity, and account restrictions                                       | Circle name and timing; treat an active invitation as private access material                            |
| Privacy/access request | Verify control of the account before disclosure, minimize the reply to that person's data          | Account email and scope of the request; do not disclose other members' financial or reporter information |
| Deletion failure       | Offer recovery if needed; verify ownership before an operator-assisted deletion                    | Account email, time, error; explain owned-circle deletion first                                          |
| Safety or abuse        | Review relevant reported activity/profile privately, consider suspension or removal                | Report/circle reference, category, relevant redacted evidence                                            |

Record the request date, category, action, and resolution in a restricted location with a defined retention policy. Keep account data out of GitHub issues, commits, screenshots used for marketing, and public chat. Do not send unsolicited messages to circle members as a support step.

The in-app report button stores a row in `dq_reports`. **It does not send an email notification.** Check the private queue directly using the procedure in [SOCIAL.md](../SOCIAL.md), or separately implement a secure notification workflow before relying on alerts. Status updates are internal; the app does not currently notify reporters of a resolution.

For urgent safety concerns, prioritize appropriate review and action. The public page directs immediate danger to local emergency services; the mailbox is not an emergency channel. For suspected unauthorized disclosure, stop unnecessary access, preserve only relevant evidence securely, and determine required notifications for the affected jurisdictions.

## Privacy requests and cleanup

- Self-service export covers the private tracker only. An access request for other information may need operator retrieval of the user's circle activity or support records, with other people's information appropriately excluded.
- Self-service deletion is the default. Do not request passwords by email, disable verification, or delete an account based only on a claimed address. Use an established ownership-verification process for assisted requests.
- A successful deletion removes active account data. Confirm the specific request completed before telling the user it did. Explain remaining separately retained reports, correspondence, logs, backups, and copies the user exported.
- Choose and document retention periods for closed correspondence, resolved reports, and operator copies before launch. The policy uses purpose-based criteria because the live service settings have not yet been confirmed. There is no implemented timed cleanup job for reports.
- Maintain a restricted minimal deletion log for the period needed to reapply deletions after a backup restoration. Check for post-backup deletion requests before making restored data available. Do not put deleted financial payloads in that log.
- Review provider access and retention whenever an email service, SDK, log drain, analytics integration, or hosting plan changes. Update the public policy and App Store disclosures before collecting new data.

## Suggested reply text

These are operator drafts, not messages that have been sent or an enabled autoresponder.

**General acknowledgment**

Thanks for contacting DebtQuest. We received your message. Please share the steps that led to the issue, your app and device versions, and any error text if they were not already included. Please keep passwords, sign-in links, full backups, and private financial information out of email.

**Privacy request acknowledgment**

We received your DebtQuest privacy request. Before sharing or changing account information, we may need to confirm that the account belongs to you. Please reply from the email used for your DebtQuest account and tell us which information your request concerns. We will not ask you to email your password.

**Deletion confirmation — only after verifying completion**

Your DebtQuest cloud account has been deleted from the active service. Separately retained support or safety records and provider backups or logs are handled as described in our privacy policy. Files you exported and copies held by others are not removed by account deletion. Reply if you also want us to review support correspondence associated with your account.

**Safety report acknowledgment**

We received your concern and will review the relevant activity privately. You can block the member or leave the circle in Settings while the concern is reviewed. Please avoid sending other people's financial information. If there is immediate danger, contact local emergency services.

## Review links

- Customer policy: repository root `privacy.html`
- Customer help center: repository root `support.html`
- App Store answers and provider inventory: [PRIVACY.md](PRIVACY.md)
- Connected report handling and acceptance checks: [SOCIAL.md](../SOCIAL.md)
- Final release sequence: [RELEASE.md](RELEASE.md)

The public policy and support process address Apple's requirements for privacy explanations, account deletion, and reporting/blocking in social apps. They still depend on the real service operating as described. [Privacy and data-use guidelines](https://developer.apple.com/app-store/review/guidelines/#privacy), [user-generated content guidelines](https://developer.apple.com/app-store/review/guidelines/#user-generated-content), [account deletion guidance](https://developer.apple.com/support/offering-account-deletion-in-your-app/).
