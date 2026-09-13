import { describe, it, expect } from 'vitest';
import { parseBackup, serializeBackup } from '../src/backup.js';
const legacy = {
 accounts: [{id:'a',name:'Car',type:'auto',originalBalance:10000,currentBalance:9000,interestRate:5,minimumPayment:300,dueDate:1,isPaidOff:false,emoji:'🚗',color:'#123456',createdAt:'2026-09-01'}],
 payments:[{id:'p',accountId:'a',paymentDate:'2026-09-01',amountPaid:1000,balanceBefore:10000,balanceAfter:9000}],xp:100,streak:1,
};
describe('backup migration', () => {
 it('restores old PWA exports with missing optional defaults', () => { const d=parseBackup(JSON.stringify(legacy)); expect(d.accounts[0].currentBalance).toBe(9000); expect(d.rewards).toEqual([]); expect(d.profile.name1).toBe('Player 1'); });
 it('round trips versioned backups without losing payments', () => { expect(parseBackup(serializeBackup(legacy)).payments).toEqual(legacy.payments); });
 it.each([null, {}, {accounts:{},payments:[]}, {...legacy, accounts:[{...legacy.accounts[0],currentBalance:-1}]}, {...legacy, accounts:[...legacy.accounts,...legacy.accounts]}, {...legacy,xp:'100'}, {...legacy,profile:{name1:{},name2:'P2'}}, {format:'debtquest',version:99,data:legacy}])('rejects malformed or unsupported data', bad => { expect(()=>parseBackup(JSON.stringify(bad))).toThrow(); });
 it('rejects oversized input', () => expect(()=>parseBackup(' '.repeat(10*1024*1024+1))).toThrow(/10 MB/));
});
