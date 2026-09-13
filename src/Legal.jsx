const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL;

export function LegalLinks() {
  return <nav className="legal-links" aria-label="Help and privacy"><a href="/privacy.html">Privacy policy</a><a href="/support.html">Help & support</a></nav>;
}

export default function Legal({ page }) {
  return <main className="legal-page">
    <a href="/">← Back to DebtQuest</a>
    {page === 'privacy' ? <>
      <h1>Privacy policy</h1><p>DebtQuest · Effective September 13, 2026</p>
      <h2>Information you enter</h2><p>DebtQuest is a debt payoff tracker maintained by Rick Griffith. You may enter debt names, balances, interest rates, payments, notes, player names, and custom rewards. DebtQuest does not connect to your bank, move money, or request bank login credentials.</p>
      <h2>Device-only mode</h2><p>In device-only mode, your records are stored in the app on your device. They are not sent to a DebtQuest server. Removing the app or clearing its storage can remove these records. Keep an exported backup if you want to restore them later.</p>
      <h2>Cloud accounts</h2><p>In cloud mode, Supabase provides authentication and storage. Your email address, account identifier, and the records you save are processed there to operate your account and make your records available when you sign in on another device. Passwords are handled by Supabase authentication. Service providers may process connection information such as IP addresses and operational logs to deliver and protect the service.</p>
      <h2>Sharing and tracking</h2><p>DebtQuest does not include advertising or analytics SDKs, sell your personal information, or use it for cross-app advertising tracking. Information is shared with the service providers needed to run cloud features when enabled. A backup is shared only when you choose to export it; the destination you select then controls that copy.</p>
      <h2>Retention and deletion</h2><p>Device records remain until you reset them or remove app storage. In cloud mode, Settings → Delete cloud account lets you delete your login and associated active records. Settings → Reset All Data clears your tracker records while retaining your login. Provider backups and operational logs may persist under the provider’s retention schedules. Copies you exported or shared are not removed by deleting your account.</p>
      <h2>Your choices</h2><p>You can export your records, correct or delete debts in Settings, reset the tracker, or delete your cloud account. Use a device passcode and keep exported backups somewhere you trust.</p>
      <h2>Contact</h2><p>For privacy questions or requests, use the contact option on our <a href="/support.html">support page</a>. This policy will be updated when data practices change.</p>
    </> : <>
      <h1>DebtQuest support</h1><p>Track the progress you make toward paying off debt.</p>
      <h2>Move from the home-screen app</h2><p>In the existing app, open Settings → Export Backup. Save the JSON file to Files. In the App Store app, open Settings → Import Backup and choose that file. Import replaces the destination account’s tracker data after confirmation. Safari and the installed app have separate local storage.</p>
      <h2>Cloud data</h2><p>If both apps use the same cloud service, sign in with your existing email and password. Reload before editing on another device. Cloud mode needs an internet connection; failed saves leave your previous saved records intact. It does not merge simultaneous edits from multiple devices.</p>
      <h2>Account deletion</h2><p>In cloud mode, go to Settings → Delete cloud account, enter your password, and type DELETE. Deletion is permanent. Export first if you want to retain your records.</p>
      <h2>How calculations work</h2><p>Payment entries reduce the tracked balance by the entered amount. DebtQuest does not reconcile lender interest or fees automatically. Projections use entered rates and payments to estimate future balances; actual results may differ. XP and rewards are motivational features with no monetary value.</p>
      <h2>Contact support</h2>{supportEmail ? <p><a href={`mailto:${supportEmail}`}>{supportEmail}</a></p> : <p><a href="https://github.com/rickalytics/debtquest/issues">Report a problem on GitHub</a>. GitHub issues are public. Do not include balances, passwords, backup files, email addresses, or other personal details.</p>}
    </>}
    <LegalLinks />
  </main>;
}
