// Accept existing unversioned PWA exports as well as new versioned backups.
export function parseBackup(text) {
  if (text.length > 10 * 1024 * 1024) throw new Error('Backup exceeds the 10 MB limit.');
  const raw = JSON.parse(text);
  if (raw?.format && (raw.format !== 'debtquest' || raw.version !== 1)) {
    throw new Error('This backup version is not supported.');
  }
  return validateData(raw?.format === 'debtquest' ? raw.data : raw);
}

export function validateData(raw) {
  const fail = () => { throw new Error('Invalid DebtQuest backup. Your existing data has not been replaced.'); };
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const str = value => typeof value === 'string' && value.length <= 10000;
  const num = value => Number.isFinite(value) && value >= 0 && value <= 1e12;
  if (!object(raw) || !Array.isArray(raw.accounts) || !Array.isArray(raw.payments)) fail();
  const data = structuredClone(raw);
  for (const key of ['accounts', 'payments', 'rewards', 'redeemedRewards']) {
    data[key] ??= [];
    if (!Array.isArray(data[key]) || data[key].length > 50000) fail();
    const ids = new Set();
    for (const row of data[key]) {
      if (!object(row) || !str(row.id) || !row.id || ids.has(row.id)) fail();
      ids.add(row.id);
    }
  }
  for (const a of data.accounts) {
    if (!str(a.name) || !str(a.type) || typeof a.isPaidOff !== 'boolean') fail();
    for (const k of ['originalBalance', 'currentBalance', 'interestRate', 'minimumPayment']) if (!num(a[k])) fail();
    if (!Number.isInteger(a.dueDate) || a.dueDate < 1 || a.dueDate > 31) fail();
    for (const k of ['emoji', 'color', 'createdAt']) if (!str(a[k])) fail();
  }
  for (const p of data.payments) {
    if (!str(p.accountId) || !str(p.paymentDate) || !/^\d{4}-\d{2}-\d{2}$/.test(p.paymentDate)) fail();
    for (const k of ['amountPaid', 'balanceBefore', 'balanceAfter']) if (!num(p[k])) fail();
    if (p.note !== undefined && !str(p.note)) fail();
  }
  for (const r of [...data.rewards, ...data.redeemedRewards]) {
    if (!str(r.name) || !str(r.emoji) || !num(r.cost)) fail();
    if (r.desc !== undefined && !str(r.desc)) fail();
  }
  data.xp ??= 0;
  data.streak ??= 0;
  if (!num(data.xp) || !Number.isInteger(data.streak) || !num(data.streak)) fail();
  data.achievements ??= [];
  if (!Array.isArray(data.achievements) || !data.achievements.every(str)) fail();
  data.profile ??= { name1: 'Player 1', name2: 'Player 2' };
  if (!object(data.profile) || !str(data.profile.name1) || !str(data.profile.name2)) fail();
  if (data.lastPaymentMonth != null && (typeof data.lastPaymentMonth !== 'string' || !/^\d{4}-\d{2}$/.test(data.lastPaymentMonth))) fail();
  return data;
}

export function serializeBackup(data) {
  return JSON.stringify({ format: 'debtquest', version: 1, exportedAt: new Date().toISOString(), data }, null, 2);
}
