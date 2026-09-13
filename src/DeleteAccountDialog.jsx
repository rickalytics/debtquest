import { useState } from 'react';
import { deleteCloudAccount } from './db.js';

export default function DeleteAccountDialog({ onClose, onDeleted }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault();
    if (confirmation !== 'DELETE' || !password || busy) return;
    setBusy(true);
    setError('');
    try { await deleteCloudAccount(password); onDeleted(); }
    catch (e) { setError(e.message); setBusy(false); }
  }
  return <div className="account-dialog-backdrop">
    <form className="account-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-title" onSubmit={submit}>
      <h2 id="delete-title">Delete cloud account?</h2>
      <p>This permanently deletes your login and cloud debt records, payments, progress, and rewards. Other devices using this account will lose access. Export a backup first if you want to keep a copy.</p>
      <label>Current password<input autoFocus type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} disabled={busy} required /></label>
      <label>Type DELETE to confirm<input value={confirmation} onChange={e => setConfirmation(e.target.value)} autoCapitalize="characters" disabled={busy} required /></label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={busy || confirmation !== 'DELETE' || !password}>{busy ? 'Deleting…' : 'Permanently delete account'}</button>
      <button type="button" disabled={busy} onClick={onClose}>Cancel</button>
    </form>
  </div>;
}
