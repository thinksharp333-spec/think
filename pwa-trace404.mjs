import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:3001';

const browser = await chromium.launch({
    executablePath: path.join(__dirname, 'browsers/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
    headless: true, args: ['--no-sandbox']
});
const context = await browser.newContext({ serviceWorkers: 'allow' });
await context.addCookies([{ name: 'user_session', value: 'test', domain: 'localhost', path: '/' }]);
const page = await context.newPage();

const failed404 = [];
page.on('response', resp => {
    if (resp.status() === 404) failed404.push({ url: resp.url(), page: page.url() });
});
const consoleErrors = [];
page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push({ text: msg.text().slice(0, 200), page: page.url() });
});

const pages = ['/', '/dashboard', '/login', '/read/561'];
for (const p of pages) {
    console.log(`Testing ${p}...`);
    await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));
}

console.log('\n404 responses:');
failed404.forEach(r => console.log('  ', r.url.slice(0, 120), 'on page', r.page));
console.log('\nConsole errors:');
consoleErrors.forEach(r => console.log('  ', r.text.slice(0, 150)));
await browser.close();
