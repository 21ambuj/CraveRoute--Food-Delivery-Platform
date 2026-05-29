const puppeteer = require('puppeteer');
async function run() {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
    
    console.log('Navigating to login...');
    await page.goto('http://localhost:5173/login');
    
    console.log('Typing credentials...');
    await page.type('input[type="email"]', 'v2@t.com');
    await page.type('input[type="password"]', 'password');
    
    console.log('Clicking submit...');
    await page.click('button[type="submit"]');
    
    console.log('Waiting for navigation...');
    // We wait for 3 seconds to see if it redirects to /vendor and crashes
    await new Promise(r => setTimeout(r, 3000));
    
    console.log('Current URL:', page.url());
    
    await browser.close();
}
run().catch(console.error);
