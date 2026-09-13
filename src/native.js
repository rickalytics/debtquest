import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { serializeBackup } from './backup.js';

export async function exportBackup(data) {
  const text = serializeBackup(data);
  const filename = `debtquest-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  if (Capacitor.isNativePlatform()) {
    // Cache contains only this temporary export; clear it even if sharing is cancelled.
    const file = await Filesystem.writeFile({ path: filename, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
    try {
      await Share.share({ title: 'DebtQuest backup', files: [file.uri] });
    } finally {
      await Filesystem.deleteFile({ path: filename, directory: Directory.Cache }).catch(() => {});
    }
    return;
  }
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
