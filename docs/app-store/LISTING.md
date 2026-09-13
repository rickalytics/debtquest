# Draft App Store metadata

Name: DebtQuest

Subtitle: Make debt payoff a team quest

Primary category: Finance

Keywords: debt,payoff,tracker,budget,couples,progress,payments,goals,motivation

Promotional text:
Turn your debt payoff progress into a quest. Track balances, log payments, earn badges, and celebrate milestones together.

Description:
DebtQuest helps you stay engaged with your debt payoff plan.

• Track credit cards, auto loans, student loans, mortgages, and other debts.
• Log payments and see your remaining balances.
• Explore payoff projections using the rates and payments you enter.
• Earn XP, build payment streaks, and unlock achievement badges.
• Create personal rewards to celebrate progress.
• Export and import backups so you can keep a copy of your records.

Designed for individuals and couples who want a more motivating way to track their progress.

DebtQuest is a manual tracker. It does not connect to your bank, send payments, or provide lending services. Projections are estimates; your lender's statements remain the source of truth. XP and rewards have no cash value.

Mode-specific sentence (include only the one matching the final build):
- Device-only: Your tracker works offline and stores records on your device. Use exported backups to move to a new device.
- Cloud: Sign in to access the same records across your devices. Cloud mode requires an internet connection; reload before editing on another device.

## Screenshot capture plan

Capture actual release-candidate iOS UI with fictional data. Use App Store Connect's current required device dimensions. Avoid real personal balances or account names.

1. Home: a few fictional debts with visible payoff progress.
2. Debt detail: payment history and remaining balance.
3. Projections: payoff comparison with legible labels.
4. Badges: milestone achievements.
5. Rewards: default and fictional custom rewards.

## Reviewer notes

DebtQuest is a manual personal debt tracker with interactive debt entry, payment history, payoff projections, milestone badges, reward customization, and backup export/import. It does not initiate financial transactions or link bank accounts. XP cannot be bought, transferred, redeemed for money, or exchanged through this app.

For cloud mode, insert the disposable reviewer email/password in App Store Connect's private review fields, never in git. Account deletion: Settings → Delete cloud account → current password → type DELETE. Reviewer should use a separate disposable account to test deletion.

For device-only mode, no account is required. Add an account from Home, log a payment from its detail view, and explore Projections, Rewards and Badges. Settings provides backup export/import and data reset.

Native integration: the app bundles its UI for launch without fetching a website, supports device-local storage in local mode, and exports JSON backups through the iOS share sheet.

## Owner-supplied fields

Support email, public support and privacy URLs, reviewer contact details, copyright owner/seller identity, final territories and pricing. These are intentionally not fabricated.
