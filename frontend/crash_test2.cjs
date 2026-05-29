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
    await page.evaluate(() => {
        const btns = document.querySelectorAll('button[type="submit"]');
        btns[0].click();
    });
    
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    console.log('Navigated to:', page.url());
    
    // Fill the form using evaluate
    await page.evaluate(() => {
        const inputs = document.querySelectorAll('form input[type="text"]');
        if (inputs.length >= 2) {
            inputs[0].value = 'My Rest';
            inputs[1].value = '123 St';
            inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
            inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        const textareas = document.querySelectorAll('form textarea');
        if (textareas.length > 0) {
            textareas[0].value = 'Desc';
            textareas[0].dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        const btn = document.querySelector('form button[type="submit"]');
        if (btn) btn.click();
    });
    
    console.log('Submitted launch profile. Waiting 3s...');
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: 'crash2.png' });
    console.log('Done.');
    await browser.close();
}
run().catch(console.error);
