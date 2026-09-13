const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL;
export function LegalLinks() {
  return (
    <nav className="legal-links" aria-label="Help and privacy">
      <a href="/privacy.html">Privacy policy</a>
      <a href="/support.html">Help & support</a>
    </nav>
  );
}
export default function Legal({ page }) {
  return (
    <main className="legal-page">
      <a href="/">← Back to DebtQuest</a>
      {page === "privacy" ? (
        <>
          <h1>Privacy policy</h1>
          <p>DebtQuest · Effective September 13, 2026</p>
          <h2>Information you enter</h2>
          <p>
            DebtQuest is a debt payoff tracker maintained by Rick Griffith. You
            may enter debt names, balances, interest rates, payments, private
            notes, names, goals, and personal rewards. DebtQuest does not
            connect to your bank, move money, or request bank login credentials.
          </p>
          <h2>Device-only mode and sample journeys</h2>
          <p>
            In device-only mode, your records stay in the app on your device.
            Removing the app or clearing storage can remove them. Keep an
            exported backup to restore them later. The sample journey uses
            fictional people and balances in separate browser storage. Sample
            actions do not post to a real circle or change your real tracker.
          </p>
          <h2>Cloud accounts</h2>
          <p>
            When cloud mode is enabled, Supabase provides authentication and
            storage. Your email, account identifier, and saved records are
            processed there to operate your account and make it available on
            other devices. Passwords are handled by Supabase authentication.
            Service providers may process connection information such as IP
            addresses and operational logs to deliver and protect the service.
          </p>
          <h2>Private circles</h2>
          <p>
            Circles are available in connected builds. Joining a circle shares
            your display name and the fact that you joined. Members can see
            check-ins and payment wins that you explicitly share. Shared payment
            wins show your overall payoff percentage. Payment amounts are
            excluded unless you turn on “Include payment amounts” and choose to
            share the payment. Your account names, starting and remaining
            balances, and private notes are not included in circle posts.
            Reactions identify the member who gave them.
          </p>
          <p>
            Anyone with an active invitation link can join until it expires or
            the circle is full. Share links only with people you trust. You can
            revoke invitation links in Settings. Creating a new invitation
            replaces your previous link for that circle. Other members may keep
            their own copies of information you shared; DebtQuest cannot erase
            screenshots or exported copies held by others.
          </p>
          <h2>Safety and reports</h2>
          <p>
            You can report activity or a member’s display name and block a
            member. Blocking hides member names, activity, and reactions between
            you and that member in the app. Reports are private and include the
            reporter’s account, reported member or activity, reason, time, and
            review status. Authorized operators can access reports to
            investigate concerns. Basic name filters and predefined circle names
            limit shared text; there is no free-form group chat.
          </p>
          <h2>Sharing and tracking</h2>
          <p>
            DebtQuest does not include advertising or analytics SDKs, sell
            personal information, or use it for cross-app advertising tracking.
            Information is shared with the service providers needed to run cloud
            features when enabled. A backup is shared only when you export it;
            the destination you select controls that copy.
          </p>
          <h2>Retention and deletion</h2>
          <p>
            Private records remain until you reset the tracker, remove local
            storage, or delete the cloud account. Settings → Reset private
            tracker clears your tracker while retaining your login and circle
            posts. Use “Remove my shared activity” to remove your own posts and
            reactions from a circle. Leaving a circle removes your membership,
            posts, reactions, and invitations; an owner who leaves passes
            ownership to another member.
          </p>
          <p>
            Settings → Delete cloud account deletes your login, private tracker,
            memberships, posts, reactions, invitations, blocks, and reports you
            submitted. Circles you own are removed for all members, so leave
            first if you want another member to keep the circle. Reports made by
            others may remain with deleted identifiers removed. Provider backups
            and operational logs may persist under the provider’s retention
            schedules. The activity screen shows recent posts; older posts
            remain stored until removed by the actions above.
          </p>
          <h2>Your choices</h2>
          <p>
            Export a backup, edit or remove debts from Journey, control future
            sharing in Settings, block or report members, leave circles, or
            delete your account. Turning off sharing affects future posts;
            remove previous shared activity separately. Use a device passcode
            and keep backups somewhere you trust.
          </p>
          <h2>Contact</h2>
          <p>
            For privacy questions, use the contact option on our{" "}
            <a href="/support.html">support page</a>.
          </p>
        </>
      ) : (
        <>
          <h1>DebtQuest support</h1>
          <p>A little help for your next chapter.</p>
          <h2>Your first steps</h2>
          <p>
            Tell us your name and what you’re making room for. Add a debt from
            Today or Journey. Log payments you’ve already made, check in with
            future you, and use the payoff slider to explore how an extra
            monthly payment changes your estimate.
          </p>
          <h2>Bring your people</h2>
          <p>
            In a connected build, open Circle to create a circle for two or up
            to eight friends. Share an invitation privately. A new invitation
            replaces your previous invitation for that circle and expires in
            seven days. Open an invitation in your browser, sign in, and join;
            or paste the link into Circle → Join a circle in the iPhone app.
            Universal links that automatically open the installed app are not
            enabled in this build.
          </p>
          <h2>Sharing and safety</h2>
          <p>
            Your debt names, balances, and private notes stay private. A shared
            payment includes your overall payoff percentage, with the amount
            included only if you opt in. Choose the menu beside a win, or tap a
            member, to report or block. Unblock people, revoke invitations,
            remove your shared activity, or leave a circle in Settings.
          </p>
          <h2>Your points and rewards</h2>
          <p>
            A daily check-in earns 25 XP. The first logged payment for each
            payment date earns 50 XP, regardless of amount. Your first
            encouragement each day earns 15 XP. Repeating an action on that date
            does not award more points. Spending points on a personal reward
            does not reduce your lifetime level. Rewards are personal plans, not
            products or cash prizes. There is no penalty for missing a day.
          </p>
          <h2>Move your existing progress</h2>
          <p>
            In the existing app, open Settings → Export Backup. Save the JSON
            file to Files. In the new app, choose Settings → Import backup.
            Import replaces your private tracker after confirmation. It does not
            restore circle memberships or shared posts. Safari and the installed
            app have separate local storage. For cloud accounts using the same
            Supabase project, sign in with your existing account.
          </p>
          <h2>Cloud data and password recovery</h2>
          <p>
            Cloud mode needs a connection. Reload before editing on another
            device; simultaneous edits do not merge, and stale saves are
            rejected. Failed saves leave previous records intact. Use “Forgot
            your password?” on the sign-in screen to request an email link, open
            it in your browser, and choose a new password.
          </p>
          <h2>Account deletion</h2>
          <p>
            Open Settings → Delete cloud account, enter your password, and type
            DELETE. Export first if you need a copy. Circles you own are also
            removed for everyone; leave them first if you want to pass ownership
            to another member.
          </p>
          <h2>How calculations work</h2>
          <p>
            Payment entries reduce the tracked balance by the entered amount. If
            interest or fees changed your balance, enter the actual new
            statement balance when logging a payment. Projections assume monthly
            interest, fixed APRs, no new charges, and a constant total payment
            budget that rolls into remaining debts. They are illustrations and
            may differ from lender statements.
          </p>
          <h2>Contact support</h2>
          {supportEmail ? (
            <p>
              <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
            </p>
          ) : (
            <p>
              <a href="https://github.com/rickalytics/debtquest/issues">
                Report a problem on GitHub
              </a>
              . Issues are public. Do not include balances, passwords, backups,
              email addresses, or other personal details. Use the in-app report
              control for private circle concerns.
            </p>
          )}
        </>
      )}
      <LegalLinks />
    </main>
  );
}
