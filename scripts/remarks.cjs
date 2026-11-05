const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.env.BASE_URL || 'http://localhost:5173';
(async () => {
  const browser = await chromium.launch({headless:true, executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium', args:['--no-sandbox']});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1100}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://fonts.googleapis.com/**', route => route.abort());
    // HTTP preview hosts do not expose randomUUID. Exercise that browser API
    // availability on localhost as well so CI does not need a public HTTP host.
    await page.addInitScript(() => Object.defineProperty(window.crypto, 'randomUUID', {value:undefined, configurable:true}));
    await page.goto(`${base}/customers/u0`);
    await page.getByRole('button',{name:'Remarks',exact:true}).click();
    await page.getByLabel('Remark',{exact:true}).fill('Customer remark without secure context');
    await page.getByRole('button',{name:'Add remark',exact:true}).click();
    await page.getByRole('status').filter({hasText:'Remark added.'}).waitFor();
    await page.reload();
    await page.getByText('Customer remark without secure context',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Edit latest',exact:true}).click();
    await page.getByLabel('Remark',{exact:true}).fill('Edited customer remark');
    await page.getByRole('button',{name:'Save remark',exact:true}).click();
    await page.getByText('Edited customer remark',{exact:true}).waitFor();
    assert.equal(await page.getByText('Customer remark without secure context',{exact:true}).count(),0);
    console.log('PASS add, edit and reload without randomUUID');

    for (const [path,tab,marker] of [
      ['/collections',null,'Collection remark regression'],
      ['/handover-registration',null,'Handover remark regression'],
      ['/handover-registration','Registration','Registration remark regression'],
    ]) {
      await page.goto(base+path);
      if(tab) await page.getByRole('button',{name:tab,exact:true}).click();
      await page.getByLabel('Search list').fill('B-0902');
      const action = page.getByRole('button',{name:'+ Remark',exact:true});
      await action.focus();
      await page.keyboard.press('Enter');
      const dialog=page.getByRole('dialog');
      await dialog.getByLabel('Remark',{exact:true}).fill(marker);
      await dialog.getByRole('button',{name:'Add remark',exact:true}).click();
      await dialog.waitFor({state:'hidden'});
      assert.equal(new URL(page.url()).pathname,path,'keyboard remark action must not navigate to unit');
      await page.getByText(marker,{exact:true}).waitFor();
      await page.goto(`${base}/customers/u0`);
      await page.getByText(marker,{exact:true}).waitFor();
      await page.goto(`${base}/customers`);
      await page.getByLabel('Search list').fill('B-0902');
      await page.getByText(marker,{exact:true}).waitFor();
      console.log(`PASS ${marker}: inline save, consolidation and directory sync`);
    }
    await page.goto(`${base}/tickets/TK-1042`);
    await page.getByPlaceholder('Add external reply…').fill('Customer visible external reply');
    await page.getByRole('button',{name:'Send reply',exact:true}).click();
    await page.getByRole('button',{name:'Internal',exact:true}).last().click();
    await page.getByPlaceholder('Add internal reply…').fill('Private ticket remark regression');
    await page.getByRole('button',{name:'Send reply',exact:true}).click();
    await page.goto(`${base}/customers/u0`);
    await page.getByText('Private ticket remark regression',{exact:true}).waitFor();
    assert.equal(await page.getByText('Customer visible external reply',{exact:true}).count(),0);
    console.log('PASS internal ticket consolidation; external replies stay separate');
    assert.deepEqual(errors,[]);
    console.log('PASS no browser exceptions');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
