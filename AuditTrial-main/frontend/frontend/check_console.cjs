const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    page.on('console', msg => {
        if (msg.type() === 'error') console.error('BROWSER ERROR:', msg.text());
    });
    
    page.on('pageerror', error => {
        console.error('PAGE ERROR:', error.message);
    });

    try {
        await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 10000 });
        console.log('Page loaded successfully');
    } catch (e) {
        console.error('Failed to load page:', e.message);
    }

    await browser.close();
})();
