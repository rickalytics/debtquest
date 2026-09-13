import { test, expect } from '@playwright/test';

test('debt entry, payment, durable reload, backup and privacy on mobile',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 await page.getByRole('button',{name:'+ Add',exact:true}).first().click();
 await page.getByLabel('Account Name').fill('Test Car');
 await page.getByLabel('Original Balance').fill('10000');
 await page.getByLabel('Current Balance').fill('9000');
 await page.getByLabel('Interest Rate %').fill('5');
 await page.getByLabel('Min Payment').fill('300');
 await page.getByRole('button',{name:/Add to Quest/i}).last().click();
 await expect(page.getByRole('button',{name:/Test Car/})).toBeVisible();
 await page.reload();
 await page.getByRole('button',{name:/Test Car/}).click();
 await page.getByRole('button',{name:/Log Payment/}).click();
 await page.getByLabel('Amount Paid').fill('500');
 await page.getByRole('button',{name:/Log Payment/}).last().click();
 await expect(page.getByLabel('Amount Paid')).not.toBeVisible();
 await page.reload();
 await expect(page.getByRole('button',{name:/Test Car/})).toContainText('$8,500');
 await page.getByRole('button',{name:/Settings/}).click();
 const download=page.waitForEvent('download');
 await page.getByRole('button',{name:/Export Backup/}).click();
 expect((await download).suggestedFilename()).toMatch(/debtquest-backup.*json/);
 await page.getByRole('link',{name:'Privacy policy'}).click();
 await expect(page.getByRole('heading',{name:'Privacy policy',exact:true})).toBeVisible();
 await page.getByRole('link',{name:'Help & support'}).click();
 await expect(page.getByRole('heading',{name:'DebtQuest support'})).toBeVisible();
 expect(errors).toEqual([]);
});

test('malformed import cannot replace saved data',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:/Settings/}).click();
 const picker=page.waitForEvent('filechooser');
 await page.getByRole('button',{name:/Import Backup/}).click();
 await (await picker).setFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"accounts":{},"payments":[]}')});
 await expect(page.getByText(/Invalid DebtQuest backup/)).toBeVisible();
 await page.reload();
 await expect(page.getByRole('button',{name:/Settings/})).toBeVisible();
});
