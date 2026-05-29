const puppeteer = require('puppeteer');
async function run() {
    const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1280, height: 800 } });
    const page = await browser.newPage();
    page.on('console', msg => {
        if (msg.type() === 'error') console.log('PAGE ERROR LOG:', msg.text());
    });
    page.on('pageerror', err => console.log('PAGE EXCEPTION:', err.toString()));
    
    await page.goto('http://localhost:5173/login');
    await page.type('input[type="email"]', 'v2@t.com');
    await page.type('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    
    // Wait for the Launch Profile form
    await page.waitForSelector('input[required]', { timeout: 10000 });
    
    console.log('Filling out Launch Profile form...');
    const inputs = await page.$$('input[required]');
    if (inputs.length >= 2) {
        await inputs[0].type('My Test Restaurant');
        await inputs[1].type('123 Test St');
    }
    
    const textarea = await page.$('textarea');
    if (textarea) await textarea.type('A great place to test code.');
    
    await page.click('button[type="submit"]');
    
    console.log('Submitted. Waiting 3 seconds for crash...');
    await new Promise(r => setTimeout(r, 3000));
    
    await page.screenshot({ path: 'crash.png' });
    console.log('Done.');
    await browser.close();
}
run().catch(console.error);
