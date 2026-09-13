# Private circles: deploy and operate

The social UI and RPC migration are implemented and tested locally. This change does not apply a migration to the production Supabase project. The interactive `?demo=1` preview uses fictional records in separate localStorage and never initializes Supabase or opens the real IndexedDB tracker.

## Activate real circles

1. Back up the existing project and verify `supabase/schema.sql` is already applied. Its own-user RLS policies must remain in place. Do not rerun existing CREATE POLICY statements blindly.
2. Apply `supabase/migrations/202609130001_private_circles.sql` once to that same project in the SQL editor, or use an appropriately baselined Supabase migration workflow. The migration is transactional. It creates separate `dq_*` tables and authenticated RPC functions; it does not change existing private tracker rows.
3. Deploy and test the existing `delete-account` Edge Function. It requires caller token validation and current-password verification; no service key goes into the frontend.
4. Configure the web deployment and `.env.ios.local` with `VITE_DATA_MODE=cloud`, the project's public URL/key, a monitored `VITE_SUPPORT_EMAIL`, and the canonical HTTPS `VITE_PUBLIC_APP_URL`.
5. Add the canonical web URL to Supabase Auth's allowed redirect URLs and Site URL. Enable confirmation emails and verify production SMTP. Password recovery opens that website and provides a new-password screen. Invitation links work on the web; paste the link into the native app to join there. Automatic universal links require a future associated-domain setup.
6. Deploy the reviewed web branch, rebuild iOS, and exercise the acceptance checks below using two disposable accounts. Do not advertise real circles from a device-only build.

## What is private and what is shared

- Private tracker: debt names, balances, APRs, minimum payments, notes, rewards and XP stay in the authenticated user's existing JSON record (or local device in local mode).
- Circle: display name, membership, deliberately shared check-ins, payment progress percentage, and reactions. A payment amount is included only when the author opts in. The server finds the payment in that author's saved payload; arbitrary other-user payment IDs and client-computed amounts are not trusted.
- Joining shares a predefined joined event. Circle names are selected from four phrases. First names permit letters, spaces, apostrophes, and hyphens with a server-side denylist. There is no group chat, photo upload, or public financial leaderboard.
- Anyone holding an unexpired bearer invitation can join up to the circle capacity. Tokens use two random UUIDs and only their SHA-256 hashes are stored. New invitations revoke that creator's previous link in the circle. Owners can revoke all links; members can revoke their own. Couples allow 2 members, friends 8, and one account can belong to at most 5 circles.
- Leaving removes that user's posts, reactions and invites. Owners who leave transfer ownership. Deleting an owner account deletes the circles they still own; the deletion screen explains this. Other members' private tracker data is never affected.
- A win can be shared once per source per circle. Resharing cannot silently reveal its previously hidden amount. Remove shared activity to delete previous disclosures. The feed is capped at 500 recent events across circles; weekly check-in calculation has its own bounded 14-day dataset.

## Moderation is an operational release requirement

Assign a real operator and a monitored private support inbox before a public social launch. The code queues reports; it does not employ a moderator or automatically resolve reports. Name filters are a starting filter, not a guarantee that all offensive names will be caught. Review and extend them before beta and when patterns are reported.

Use the Supabase dashboard with a privileged operator account. Never grant client roles direct access to these tables, never put a service key in the app, and never export reporter identities to a public issue.

```sql
-- Private operator queue. Review regularly and respond through the support process.
select id, reporter_id, reported_user, event_id, member_report, category, status, created_at
from public.dq_reports where status in ('open','reviewing') order by created_at;

-- Inspect the reported display name; do not retrieve private financial payloads by default.
select user_id, display_name, suspended from public.dq_profiles where user_id = 'REPORTED_UUID';

-- As warranted, pause social access and hide that profile's activity.
update public.dq_profiles set suspended = true where user_id = 'REPORTED_UUID';
-- Correct an offensive name or delete a reported event as warranted.
-- Record resolution only after investigation.
update public.dq_reports set status = 'resolved' where id = 'REPORT_UUID';
```

Member/activity reports and blocks are available in the circle UI. Blocks hide both parties' names, posts, and reactions from one another. Reports remain private. Authenticated users cannot directly query or mutate any social table or internal helper. Access goes through membership-scoped SECURITY DEFINER functions with empty search paths and explicit execute grants. Existing tracker RLS remains separate.

## Connected acceptance checks

- Two fresh accounts can create, invite, join, check in, share a payment and cheer; use a third nonmember to verify isolation.
- Verify expired/revoked invites fail, a couple's third member cannot join, and concurrent final-slot joins respect capacity.
- Confirm the other member never receives the debt name, balances or note. Opt into a new payment's amount and confirm that only that amount is disclosed.
- Report both a win and a member with no posts. Inspect the private queue and test the operator response. Block/unblock in both directions.
- Remove shared activity, leave as owner, and delete disposable accounts. Check cleanup and ownership behavior.
- Test the actual confirmation and password-recovery emails, live Supabase schema cache, multi-device stale saves, native share sheet, and weak-network error messages. Local PGlite tests exercise real PostgreSQL permissions and RPC logic; they do not substitute for these live checks or validate real email delivery.

## Product loop

Today → one useful action → immediate progress → optional shared win → encouragement → return tomorrow. Check-in 25 XP/day; first payment per payment date 50 XP; first encouragement per day 15 XP. Payment size never changes the award. Levels use lifetime XP; rewards use spendable XP. No purchases, paid contests, cash value, or streak-loss penalties.

The beta should validate whether pairs return for their second and fourth weekly check-in, whether invitations turn into active circles, and whether sharing feels comfortable. Downloads and retention are outcomes to measure, not guarantees. There is no analytics SDK in this release; obtain appropriate consent and update disclosures before adding instrumentation.
