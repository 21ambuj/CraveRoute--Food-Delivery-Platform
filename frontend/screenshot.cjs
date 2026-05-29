const puppeteer = require('puppeteer');
async function run() {
    const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1280, height: 800 } });
    const page = await browser.newPage();
    await page.goto('http://localhost:5173/login');
    await page.type('input[type="email"]', 'v2@t.com');
    await page.type('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 5000));
    await page.screenshot({ path: 'screenshot.png' });
    await browser.close();
}
run().catch(console.error);
