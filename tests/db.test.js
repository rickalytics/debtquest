import 'fake-indexeddb/auto';
import { beforeEach, it, expect, vi } from 'vitest';
vi.mock('../src/supabaseClient.js', () => ({isSupabaseConfigured:false,supabase:null}));
const { default:db, initDB, loadAllData, saveAllData } = await import('../src/db.js');
beforeEach(async()=>{await db.delete();await db.open();await initDB();});
it('persists balances and clears removed records atomically',async()=>{
 const d=await loadAllData();d.accounts=[{id:'a',currentBalance:100}];d.payments=[{id:'p',accountId:'a',amountPaid:50}];await saveAllData(d);
 expect((await loadAllData()).accounts[0].currentBalance).toBe(100);
 await saveAllData({...d,accounts:[],payments:[]});expect((await loadAllData()).payments).toEqual([]);
});
it('rolls back all stores on an invalid write',async()=>{
 const before=await loadAllData();
 await expect(saveAllData({...before,xp:999,accounts:[{missingId:true}]})).rejects.toThrow();
 expect((await loadAllData()).xp).toBe(before.xp);
 expect((await loadAllData()).rewards).toEqual(before.rewards);
});
