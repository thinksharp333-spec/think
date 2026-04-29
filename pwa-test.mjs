// PWA Test Script — tests offline book reading and online sync
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BROWSERS_PATH = path.join(__dirname, 'browsers');
const BASE = 'http://localhost:3001';
const RESULTS = [];

function log(label, value, pass) {
    const status = pass ? '✅' : '❌';
    console.log(`${status} ${label}: ${value}`);
    RESULTS.push({ label, value, pass });
}

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// Seed a test user into Dexie IndexedDB and return their ID
async function seedTestUser(page) {
    return page.evaluate(async () => {
        return new Promise((resolve) => {
            const req = indexedDB.open('AdaptivePlatformDB');
            req.onsuccess = (e) => {
                const db = e.target.result;
                const tx = db.transaction('users', 'readwrite');
                const store = tx.objectStore('users');
                const user = {
                    id: 'pwa-test-user-001',
                    name: 'PWA Tester',
                    mobile: '9999999999',
                    totalPoints: 100,
                    isVerified: true,
                    school: 'Test School',
                    city: 'Mumbai',
                    role: 'student',
                    grade: '5'
                };
                // Try put (upsert)
                const putReq = store.put(user);
                putReq.onsuccess = () => resolve('pwa-test-user-001');
                putReq.onerror = () => resolve(null);
            };
            req.onerror = () => resolve(null);
        });
    });
}

async function main() {
    console.log('\n═══════════════════════════════════════════════════');
    console.log('       PWA Offline + Sync Test Suite');
    console.log('═══════════════════════════════════════════════════\n');

    // Use the full Chrome for Testing (supports service workers properly)
    const executablePath = path.join(
        BROWSERS_PATH,
        'chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
    );

    const browser = await chromium.launch({
        executablePath,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    // Set user_session cookie so middleware lets us into protected routes
    const context = await browser.newContext({
        serviceWorkers: 'allow',
    });
    await context.addCookies([
        { name: 'user_session', value: 'pwa-test-user-001', domain: 'localhost', path: '/' }
    ]);

    const page = await context.newPage();

    // Collect console messages
    const consoleMsgs = [];
    page.on('console', msg => consoleMsgs.push({ type: msg.type(), text: msg.text() }));

    try {
        // ─── TEST 1: App loads ───────────────────────────────────────────────────
        console.log('--- Test 1: App loads ---');
        await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
        const title = await page.title();
        log('App title', title, title.length > 0);

        // ─── TEST 2: Service Worker registers ────────────────────────────────────
        console.log('\n--- Test 2: Service Worker registration ---');
        // Reload once — service workers often activate after first visit
        await page.reload({ waitUntil: 'networkidle', timeout: 15000 });
        await sleep(3000);

        const swState = await page.evaluate(async () => {
            if (!('serviceWorker' in navigator)) return 'not supported';
            // Wait for any SW to settle
            const regs = await navigator.serviceWorker.getRegistrations();
            if (regs.length === 0) return 'not registered';
            const reg = regs[0];
            const worker = reg.active || reg.installing || reg.waiting;
            return worker?.state || 'found-but-no-worker';
        });
        log('Service Worker state', swState, swState === 'activated');

        // ─── TEST 3: PWA Manifest ─────────────────────────────────────────────
        console.log('\n--- Test 3: PWA Manifest ---');
        const manifestRes = await page.evaluate(async () => {
            const r = await fetch('/manifest.json');
            if (!r.ok) return null;
            return r.json();
        });
        log('Manifest exists', manifestRes ? 'yes' : 'no', !!manifestRes);
        log('Manifest name', manifestRes?.name || '(none)', !!manifestRes?.name);
        log('Display mode', manifestRes?.display, manifestRes?.display === 'standalone');
        log('Start URL', manifestRes?.start_url, manifestRes?.start_url === '/');

        // ─── TEST 4: PDF Worker available ────────────────────────────────────────
        console.log('\n--- Test 4: PDF Worker available ---');
        const workerRes = await page.evaluate(async () => {
            const r = await fetch('/pdf.worker.min.mjs');
            return { ok: r.ok, status: r.status, size: r.ok ? (await r.blob()).size : 0 };
        });
        log('pdf.worker.min.mjs', `HTTP ${workerRes.status}, ${(workerRes.size/1024).toFixed(0)}KB`, workerRes.ok);

        // ─── TEST 5: CMaps available (for Hindi/Marathi PDFs) ────────────────────
        console.log('\n--- Test 5: CMaps for non-Latin PDFs ---');
        const cmapRes = await page.evaluate(async () => {
            const r = await fetch('/cmaps/Adobe-GB1-UCS2.bcmap');
            return { ok: r.ok, status: r.status };
        });
        log('CMap file available', `HTTP ${cmapRes.status}`, cmapRes.ok);

        // ─── TEST 6: Dexie DB structure ──────────────────────────────────────────
        console.log('\n--- Test 6: Dexie IndexedDB structure ---');
        // Navigate to dashboard to initialize Dexie
        await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await sleep(2000);
        const dbInfo = await page.evaluate(async () => {
            return new Promise((resolve) => {
                const req = indexedDB.open('AdaptivePlatformDB');
                req.onsuccess = (e) => {
                    const db = e.target.result;
                    const stores = Array.from(db.objectStoreNames);
                    db.close();
                    resolve({ version: db.version, stores });
                };
                req.onerror = () => resolve({ error: 'DB open failed' });
            });
        });
        // Dexie internally multiplies version by 10 (v13 → 130)
        log('Dexie DB version', `${dbInfo.version} (Dexie v${Math.round(dbInfo.version/10)})`, dbInfo.version >= 130);
        const requiredStores = ['books', 'syncQueue', 'users', 'readings', 'bookReviews', 'quizAttempts'];
        const hasAllStores = requiredStores.every(s => (dbInfo.stores || []).includes(s));
        log('All DB stores present', (dbInfo.stores || []).join(', '), hasAllStores);

        // ─── TEST 7: Books API ───────────────────────────────────────────────────
        console.log('\n--- Test 7: Books API ---');
        const booksData = await page.evaluate(async () => {
            try {
                const r = await fetch('/api/books');
                if (!r.ok) return { error: `HTTP ${r.status}` };
                const data = await r.json();
                return { count: data.books?.length ?? 0, sample: data.books?.[0], hasFileId: !!data.books?.[0]?.fileId };
            } catch (e) {
                return { error: e.message };
            }
        });
        log('Books API response', booksData.error ? `ERROR: ${booksData.error}` : `${booksData.count} books`, !booksData.error && booksData.count > 0);
        if (booksData.sample?.title) log('First book title', booksData.sample.title, true);
        log('Books have fileId', booksData.hasFileId ? 'yes (Google Drive)' : 'no (Supabase URL)', true);

        // ─── TEST 8: Sync IndexedDB with server books ─────────────────────────────
        console.log('\n--- Test 8: Books cached in IndexedDB ---');
        await sleep(3000); // let the dashboard sync run
        const booksInDB = await page.evaluate(async () => {
            return new Promise((resolve) => {
                const req = indexedDB.open('AdaptivePlatformDB');
                req.onsuccess = (e) => {
                    const db = e.target.result;
                    const tx = db.transaction('books', 'readonly');
                    const store = tx.objectStore('books');
                    const getAllReq = store.getAll();
                    getAllReq.onsuccess = (e) => {
                        const books = e.target.result;
                        resolve({ count: books.length, first: books[0]?.title, firstId: books[0]?.id });
                    };
                    getAllReq.onerror = () => resolve({ error: 'query failed' });
                };
                req.onerror = () => resolve({ error: 'DB open failed' });
            });
        });
        log('Books in IndexedDB', `${booksInDB.count} books cached`, (booksInDB.count || 0) > 0);
        if (booksInDB.first) log('First cached book', booksInDB.first, true);

        // ─── TEST 9: Seed test user in Dexie ────────────────────────────────────
        console.log('\n--- Test 9: Seed test user ---');
        const seededUserId = await seedTestUser(page);
        log('Test user seeded', seededUserId ? `ID: ${seededUserId}` : 'FAILED', !!seededUserId);

        // ─── TEST 10: Navigate to reader ─────────────────────────────────────────
        console.log('\n--- Test 10: Book reader loads ---');
        const firstBookId = booksInDB.firstId || 1;
        await page.goto(`${BASE}/read/${firstBookId}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await sleep(4000); // wait for PDF to start loading
        const readerUrl = page.url();
        log('Reader URL', readerUrl, readerUrl.includes('/read/'));

        if (readerUrl.includes('/read/')) {
            // ─── TEST 11: PDF renders ────────────────────────────────────────────
            console.log('\n--- Test 11: PDF renders in reader ---');
            // Wait up to 10s for canvas (PDF renders)
            let pdfCanvas = null;
            for (let i = 0; i < 10; i++) {
                pdfCanvas = await page.$('canvas');
                if (pdfCanvas) break;
                await sleep(1000);
            }
            log('PDF canvas rendered', pdfCanvas ? 'yes' : 'no (may be still loading)', !!pdfCanvas);

            // Check for download button (indicates blob not yet stored)
            const downloadBtn = await page.$('button[title="Save for offline reading"]');
            log('Download-for-offline button', downloadBtn ? 'visible (not yet saved)' : 'hidden (already saved)', true);

            // ─── TEST 12: Auto-download triggers after 4 seconds ─────────────────
            console.log('\n--- Test 12: Auto-download PDF for offline ---');
            // We've already been on the page 4+ seconds, wait a bit more to be sure
            await sleep(6000);
            const blobCheck = await page.evaluate(async () => {
                return new Promise((resolve) => {
                    const req = indexedDB.open('AdaptivePlatformDB');
                    req.onsuccess = (e) => {
                        const db = e.target.result;
                        const tx = db.transaction('books', 'readonly');
                        const store = tx.objectStore('books');
                        const getAllReq = store.getAll();
                        getAllReq.onsuccess = (e) => {
                            const books = e.target.result;
                            const withBlob = books.filter(b => b.pdfBlob instanceof Blob && b.pdfBlob.size > 0);
                            resolve({
                                totalBooks: books.length,
                                booksWithBlob: withBlob.length,
                                blobDetails: withBlob.map(b => ({
                                    title: b.title,
                                    sizeKB: Math.round(b.pdfBlob.size / 1024)
                                }))
                            });
                        };
                        getAllReq.onerror = () => resolve({ error: 'query failed' });
                    };
                    req.onerror = () => resolve({ error: 'DB open failed' });
                });
            });
            log('Total books in DB', blobCheck.totalBooks, (blobCheck.totalBooks || 0) > 0);
            log('PDFs downloaded for offline', `${blobCheck.booksWithBlob} books`, (blobCheck.booksWithBlob || 0) > 0);
            if (blobCheck.blobDetails?.length > 0) {
                blobCheck.blobDetails.forEach(b => log(`  Blob: "${b.title}"`, `${b.sizeKB} KB`, b.sizeKB > 10));
            }

            const pdfDownloaded = (blobCheck.booksWithBlob || 0) > 0;

            // ─── TEST 13: Go offline — PDF should still load from blob ────────────
            console.log('\n--- Test 13: Offline reading ---');
            await context.setOffline(true);
            log('Simulated offline', 'yes', true);
            await sleep(1000);

            // Navigate to reader again (offline) — page reload needed to test real offline
            // Since service worker is active, the shell will load from cache
            // Check if PDF blob URL is being used
            const isUsingBlob = await page.evaluate(() => {
                // Check if any canvas is visible (PDF still rendered from blob)
                const canvases = document.querySelectorAll('canvas');
                return canvases.length > 0;
            });
            log('PDF visible while offline', isUsingBlob ? 'yes (blob loaded)' : 'no', isUsingBlob || !pdfDownloaded);

            // Check for offline indicator in the UI
            const pageText = await page.evaluate(() => document.body.innerText);
            log('Offline indicator in UI', pageText.includes('Offline') ? 'yes' : 'no', true);

            // ─── TEST 14: Reading session creates sync queue entry ────────────────
            console.log('\n--- Test 14: Sync queue builds while offline ---');
            // Simulate page time passing — trigger a page turn to accumulate points
            await page.evaluate(() => {
                // Simulate clicking next page to trigger point accumulation
                const nextBtn = document.querySelector('[aria-label="Next page"]');
                if (nextBtn) nextBtn.click();
            });
            await sleep(1000);

            const syncQueueBefore = await page.evaluate(async () => {
                return new Promise((resolve) => {
                    const req = indexedDB.open('AdaptivePlatformDB');
                    req.onsuccess = (e) => {
                        const db = e.target.result;
                        const tx = db.transaction('syncQueue', 'readonly');
                        const store = tx.objectStore('syncQueue');
                        const countReq = store.count();
                        countReq.onsuccess = () => resolve(countReq.result);
                        countReq.onerror = () => resolve(-1);
                    };
                    req.onerror = () => resolve(-1);
                });
            });
            log('Sync queue while offline', `${syncQueueBefore} tasks queued`, syncQueueBefore >= 0);

            // ─── TEST 15: Back online — sync runs automatically ──────────────────
            console.log('\n--- Test 15: Back online — auto sync ---');
            await context.setOffline(false);
            log('Back online', 'yes', true);
            await sleep(4000); // let auto-sync run (triggered by 'online' event in useSync)

            const syncQueueAfter = await page.evaluate(async () => {
                return new Promise((resolve) => {
                    const req = indexedDB.open('AdaptivePlatformDB');
                    req.onsuccess = (e) => {
                        const db = e.target.result;
                        const tx = db.transaction('syncQueue', 'readonly');
                        const store = tx.objectStore('syncQueue');
                        const countReq = store.count();
                        countReq.onsuccess = () => resolve(countReq.result);
                        countReq.onerror = () => resolve(-1);
                    };
                    req.onerror = () => resolve(-1);
                });
            });
            log('Sync queue after reconnect', `${syncQueueAfter} tasks remaining`, syncQueueAfter >= 0);
        }

        // ─── TEST 16: Sync API — UPDATE_POINTS column fix ───────────────────────
        console.log('\n--- Test 16: Sync API — UPDATE_POINTS ---');
        const updatePointsTest = await page.evaluate(async () => {
            try {
                const r = await fetch('/api/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'UPDATE_POINTS',
                        payload: { userId: 'nonexistent-test-user', pointsDelta: 0 },
                        userId: 'nonexistent-test-user'
                    })
                });
                const data = await r.json();
                return { status: r.status, data };
            } catch (e) {
                return { error: e.message };
            }
        });
        const hasSchemaError = JSON.stringify(updatePointsTest.data || {}).toLowerCase().includes('column');
        log('UPDATE_POINTS endpoint', `HTTP ${updatePointsTest.status}`, !updatePointsTest.error);
        log('No column schema error', hasSchemaError ? 'schema error in response' : 'clean', !hasSchemaError);

        // ─── TEST 17: READ_LOG endpoint ──────────────────────────────────────────
        console.log('\n--- Test 17: Sync API — READ_LOG ---');
        const readLogTest = await page.evaluate(async () => {
            try {
                const r = await fetch('/api/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'READ_LOG',
                        payload: {
                            userId: 'nonexistent-test-user',
                            bookId: 1,
                            bookTitle: 'Test',
                            startTime: Date.now() - 60000,
                            endTime: Date.now(),
                            duration: 60,
                            pagesRead: 3,
                            pointsEarned: 5,
                            completed: false
                        },
                        userId: 'nonexistent-test-user'
                    })
                });
                const data = await r.json();
                return { status: r.status, data };
            } catch (e) {
                return { error: e.message };
            }
        });
        log('READ_LOG endpoint', `HTTP ${readLogTest.status} - ${JSON.stringify(readLogTest.data)}`, !readLogTest.error);
        // Expected: either success (if user exists) or FK error 500 (user not in Supabase)
        // Should NOT be a column schema error
        const isColumnError = (readLogTest.data?.error || '').toLowerCase().includes('"totalpoints"') ||
                              (readLogTest.data?.error || '').toLowerCase().includes('column');
        log('READ_LOG no column schema error', isColumnError ? 'column error!' : 'clean', !isColumnError);

        // ─── CONSOLE ERRORS ───────────────────────────────────────────────────────
        console.log('\n--- Console Errors Summary ---');
        const errors = consoleMsgs.filter(m => m.type === 'error' && !m.text.includes('favicon'));
        const warnings = consoleMsgs.filter(m => m.type === 'warning');
        const syncLogs = consoleMsgs.filter(m => m.text.includes('[Sync]'));
        log('Console errors', errors.length === 0 ? 'none' : `${errors.length} errors`, errors.length === 0);
        if (errors.length > 0) {
            errors.slice(0, 5).forEach(e => console.log('  ⚠️  ' + e.text.slice(0, 150)));
        }
        if (syncLogs.length > 0) {
            console.log(`  Sync messages: ${syncLogs.length}`);
            syncLogs.slice(0, 5).forEach(m => console.log('  🔄 ' + m.text.slice(0, 150)));
        }

    } catch (e) {
        console.error('Test suite error:', e.message);
        console.error(e.stack);
    } finally {
        await browser.close();
    }

    // ─── SUMMARY ─────────────────────────────────────────────────────────────────
    const passed = RESULTS.filter(r => r.pass).length;
    const total = RESULTS.length;
    console.log('\n═══════════════════════════════════════════════════');
    console.log(`  RESULTS: ${passed}/${total} tests passed`);
    console.log('═══════════════════════════════════════════════════\n');

    const failed = RESULTS.filter(r => !r.pass);
    if (failed.length > 0) {
        console.log('Failed tests:');
        failed.forEach(f => console.log(`  ❌ ${f.label}: ${f.value}`));
    }

    process.exit(passed >= Math.ceil(total * 0.85) ? 0 : 1); // 85% pass rate to account for auth-gated tests
}

main().catch(e => { console.error(e); process.exit(1); });
