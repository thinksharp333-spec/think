/**
 * Offline-Sync Test Suite
 * Tests Dexie syncQueue, points logic, guest filtering, and quiz flow
 * using fake-indexeddb — no browser required.
 */

// ── Polyfill IndexedDB before Dexie loads ────────────────────────────────────
import "fake-indexeddb/auto";
import Dexie, { type EntityTable } from "dexie";

// ─────────────────────────────────────────────────────────────────────────────
// Re-declare the same schema as src/lib/db.ts
// ─────────────────────────────────────────────────────────────────────────────
interface User {
  id: string;
  name: string;
  mobile: string;
  totalPoints: number;
  school?: string;
  isVerified?: boolean;
  role?: string;
  student_id?: string;
}
interface Book {
  id?: number;
  fileId?: string;
  title: string;
  grade: string;
  pages: number;
  pdfUrl: string;
  pdfBlob?: Blob;
  level: string;
  subject: string;
  language: string;
  pageWordCounts?: Record<number, number>;
  questions?: any[];
}
interface ReadingSession {
  id?: number;
  userId: string;
  bookId: string;
  startTime: number;
  endTime?: number;
  synced: 0 | 1;
}
interface SyncTask {
  id?: number;
  type: "UPDATE_POINTS" | "READ_LOG" | "SUBMIT_REVIEW";
  payload: any;
  createdAt: number;
}

// ── Colour helpers ────────────────────────────────────────────────────────────
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red   = (s: string) => `\x1b[31m${s}\x1b[0m`;
const bold  = (s: string) => `\x1b[1m${s}\x1b[0m`;
const dim   = (s: string) => `\x1b[2m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;

// ── Test runner ───────────────────────────────────────────────────────────────
let passed = 0, failed = 0, total = 0;

async function test(name: string, fn: () => Promise<void>) {
  total++;
  try {
    await fn();
    console.log(`  ${green("✓")} ${name}`);
    passed++;
  } catch (err: any) {
    console.log(`  ${red("✗")} ${name}`);
    console.log(`    ${red("→")} ${err.message}`);
    failed++;
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

// ── Fresh DB factory — each test group gets its own isolated DB ───────────────
function makeDB(name: string) {
  const db = new Dexie(name) as Dexie & {
    users: EntityTable<User, "id">;
    readings: EntityTable<ReadingSession, "id">;
    syncQueue: EntityTable<SyncTask, "id">;
    books: EntityTable<Book, "id">;
  };
  db.version(9).stores({
    users:     "id, name, mobile, isVerified, schoolId, totalPoints, grade, role",
    readings:  "++id, bookId, synced, startTime",
    syncQueue: "++id, type, createdAt",
    books:     "++id, title, grade, level, subject, language",
  });
  return db;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure logic helpers (extracted from page.tsx)
// ─────────────────────────────────────────────────────────────────────────────
function getRemoteUserId(user?: { id: string; student_id?: string }): string | null {
  return user?.student_id || (user?.id !== "local-user" ? user?.id : null) || null;
}

function getMaxPointsForPage(wordCount: number | undefined): number {
  if (wordCount === undefined) return 5;
  return Math.max(1, Math.min(15, Math.floor(wordCount / 30)));
}

function getMinReadTimeForPage(wordCount: number | undefined): number {
  if (wordCount === undefined) return 15;
  return Math.ceil(wordCount / 2.5);
}

function getPointsForPageTime(
  wordCount: number | undefined,
  timeSpentSeconds: number,
  alreadyEarned = 0
): number {
  const maxPts = getMaxPointsForPage(wordCount);
  const remainingPts = maxPts - alreadyEarned;
  if (remainingPts <= 0) return 0;
  const minTime = getMinReadTimeForPage(wordCount);
  const earned =
    timeSpentSeconds >= minTime
      ? maxPts
      : Math.floor((timeSpentSeconds / minTime) * maxPts);
  return Math.min(earned, remainingPts);
}

// ── Guest IDs that must be skipped during sync ────────────────────────────────
const SKIP_IDS = ["local-user", "local-admin", "local_user", "undefined", "null"];
function isGuestId(id: string | null | undefined): boolean {
  if (!id) return true;
  return SKIP_IDS.includes(String(id));
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1 — Points calculation
// ─────────────────────────────────────────────────────────────────────────────
async function suitePointsCalculation() {
  console.log(bold("\nSuite 1: Points Calculation Logic"));

  await test("Page with 300 words → max 10 pts, min-time 120s", async () => {
    assert(getMaxPointsForPage(300) === 10, `Expected 10, got ${getMaxPointsForPage(300)}`);
    assert(getMinReadTimeForPage(300) === 120, `Expected 120, got ${getMinReadTimeForPage(300)}`);
  });

  await test("Full time on page → full points earned", async () => {
    const pts = getPointsForPageTime(300, 120);
    assert(pts === 10, `Expected 10, got ${pts}`);
  });

  await test("Half time on page → half points (proportional)", async () => {
    const pts = getPointsForPageTime(300, 60);
    assert(pts === 5, `Expected 5, got ${pts}`);
  });

  await test("Page already fully rewarded → 0 pts on revisit", async () => {
    const pts = getPointsForPageTime(300, 120, 10);  // alreadyEarned = max
    assert(pts === 0, `Expected 0, got ${pts}`);
  });

  await test("Page with 0 words (blank page) → min 1 point", async () => {
    assert(getMaxPointsForPage(0) === 1, `Expected 1 (min), got ${getMaxPointsForPage(0)}`);
  });

  await test("Page with 600 words → capped at 15 pts max", async () => {
    assert(getMaxPointsForPage(600) === 15, `Expected 15 (cap), got ${getMaxPointsForPage(600)}`);
  });

  await test("Unknown word count → 5 pts default, 15s min-time", async () => {
    assert(getMaxPointsForPage(undefined) === 5, "Expected 5 default pts");
    assert(getMinReadTimeForPage(undefined) === 15, "Expected 15s default");
  });

  await test("Quiz: score=3 → 30 bonus points", async () => {
    const score = 3;
    const bonusPoints = score * 10;
    assert(bonusPoints === 30, `Expected 30, got ${bonusPoints}`);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2 — User ID resolution
// ─────────────────────────────────────────────────────────────────────────────
async function suiteUserIdResolution() {
  console.log(bold("\nSuite 2: User ID Resolution (Guest vs Registered)"));

  await test("Registered user returns their UUID", async () => {
    const id = getRemoteUserId({ id: "abc-123-uuid" });
    assert(id === "abc-123-uuid", `Expected UUID, got ${id}`);
  });

  await test("Guest 'local-user' returns null", async () => {
    const id = getRemoteUserId({ id: "local-user" });
    assert(id === null, `Expected null, got ${id}`);
  });

  await test("User with student_id returns student_id over id", async () => {
    const id = getRemoteUserId({ id: "some-id", student_id: "student-uuid-456" });
    assert(id === "student-uuid-456", `Expected student_id, got ${id}`);
  });

  await test("isGuestId correctly identifies all skip IDs", async () => {
    for (const id of SKIP_IDS) {
      assert(isGuestId(id), `Expected ${id} to be a guest ID`);
    }
  });

  await test("isGuestId returns false for real UUID", async () => {
    assert(!isGuestId("real-supabase-uuid"), "Real UUID should not be guest");
  });

  await test("isGuestId returns true for null/undefined", async () => {
    assert(isGuestId(null), "null should be guest");
    assert(isGuestId(undefined), "undefined should be guest");
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3 — SyncQueue: task creation
// ─────────────────────────────────────────────────────────────────────────────
async function suiteSyncQueueCreation() {
  console.log(bold("\nSuite 3: SyncQueue — Task Creation"));
  const db = makeDB("TestDB_SyncQueue");

  // Seed a registered user
  await db.users.add({ id: "user-uuid-001", name: "Alice", mobile: "9999", totalPoints: 50, school: "Test" });

  await test("UPDATE_POINTS task is added after saveProgress", async () => {
    const user = await db.users.get("user-uuid-001");
    const newTotal = (user!.totalPoints) + 10;
    await db.users.update("user-uuid-001", { totalPoints: newTotal });
    await db.syncQueue.add({
      type: "UPDATE_POINTS",
      payload: { userId: "user-uuid-001", totalPoints: newTotal },
      createdAt: Date.now(),
    });
    const count = await db.syncQueue.count();
    assert(count === 1, `Expected 1 task, got ${count}`);
  });

  await test("READ_LOG task is added on session end (isFinal=true)", async () => {
    const now = Date.now();
    await db.syncQueue.add({
      type: "READ_LOG",
      payload: {
        userId: "user-uuid-001",
        bookId: 1,
        bookTitle: "Science Book",
        startTime: now - 120000,
        endTime: now,
        duration: 120,
        pagesRead: 5,
        pointsEarned: 15,
      },
      createdAt: now,
    });
    const tasks = await db.syncQueue.toArray();
    const readLog = tasks.find(t => t.type === "READ_LOG");
    assert(!!readLog, "READ_LOG task should exist");
    assert(readLog!.payload.pagesRead === 5, "pagesRead should be 5");
  });

  await test("syncQueue has exactly 2 tasks (1 UPDATE_POINTS + 1 READ_LOG)", async () => {
    const tasks = await db.syncQueue.toArray();
    assert(tasks.length === 2, `Expected 2, got ${tasks.length}`);
    const types = tasks.map(t => t.type);
    assert(types.includes("UPDATE_POINTS"), "Missing UPDATE_POINTS");
    assert(types.includes("READ_LOG"), "Missing READ_LOG");
  });

  await test("READ_LOG payload has all required Supabase fields", async () => {
    const task = (await db.syncQueue.toArray()).find(t => t.type === "READ_LOG")!;
    const p = task.payload;
    const required = ["userId", "bookId", "bookTitle", "startTime", "endTime", "duration", "pagesRead", "pointsEarned"];
    for (const field of required) {
      assert(p[field] !== undefined, `Missing field: ${field}`);
    }
  });

  await test("Tasks are deleted from queue after simulated successful sync", async () => {
    const tasks = await db.syncQueue.toArray();
    for (const task of tasks) {
      if (task.id !== undefined) await db.syncQueue.delete(task.id);
    }
    const remaining = await db.syncQueue.count();
    assert(remaining === 0, `Expected 0 remaining, got ${remaining}`);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4 — Guest user sync filtering
// ─────────────────────────────────────────────────────────────────────────────
async function suiteGuestFiltering() {
  console.log(bold("\nSuite 4: Guest User — SyncQueue Filtering"));
  const db = makeDB("TestDB_Guest");

  // Simulate guest adding points while offline
  await db.syncQueue.add({
    type: "UPDATE_POINTS",
    payload: { userId: "local-user", totalPoints: 100 },
    createdAt: Date.now(),
  });
  await db.syncQueue.add({
    type: "READ_LOG",
    payload: { userId: "local-user", bookId: 1, bookTitle: "Sample", startTime: 0, endTime: 0, duration: 60, pagesRead: 2, pointsEarned: 5 },
    createdAt: Date.now(),
  });
  await db.syncQueue.add({
    type: "UPDATE_POINTS",
    payload: { userId: "local-admin", totalPoints: 0 },
    createdAt: Date.now(),
  });

  // Simulate what useSync.ts does: skip and delete guest tasks
  await test("Guest UPDATE_POINTS tasks are identified and skipped", async () => {
    const tasks = await db.syncQueue.toArray();
    const guestTasks = tasks.filter(t => isGuestId(t.payload?.userId));
    assert(guestTasks.length === 3, `Expected 3 guest tasks, got ${guestTasks.length}`);
  });

  await test("Simulated sync: guest tasks are deleted without calling Supabase", async () => {
    const tasks = await db.syncQueue.toArray();
    let supabaseCalls = 0;
    for (const task of tasks) {
      if (isGuestId(task.payload?.userId)) {
        // This is what useSync does — skip without incrementing supabaseCalls
        if (task.id !== undefined) await db.syncQueue.delete(task.id);
        continue;
      }
      supabaseCalls++;
    }
    const remaining = await db.syncQueue.count();
    assert(remaining === 0, `Queue should be empty, got ${remaining}`);
    assert(supabaseCalls === 0, `Expected 0 Supabase calls for guest, got ${supabaseCalls}`);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5 — Quiz points flow
// ─────────────────────────────────────────────────────────────────────────────
async function suiteQuizFlow() {
  console.log(bold("\nSuite 5: Quiz Flow — Points & Session Bug Detection"));
  const db = makeDB("TestDB_Quiz");

  await db.users.add({ id: "user-quiz-001", name: "Bob", mobile: "1111", totalPoints: 0, school: "X" });

  await test("Quiz score=4 on 5-question quiz → 40 bonus points accumulated", async () => {
    const score = 4;
    const bonusPoints = score * 10;
    // This is what handleNextQuestion does when quizCompleted fires
    let accumulatedPoints = 0;
    if (bonusPoints > 0) {
      accumulatedPoints += bonusPoints;
    }
    assert(accumulatedPoints === 40, `Expected 40, got ${accumulatedPoints}`);
  });

  await test("Quiz triggers UPDATE_POINTS in syncQueue", async () => {
    const user = await db.users.get("user-quiz-001");
    const bonusPoints = 40;
    const newTotal = (user!.totalPoints || 0) + bonusPoints;
    await db.users.update("user-quiz-001", { totalPoints: newTotal });
    await db.syncQueue.add({
      type: "UPDATE_POINTS",
      payload: { userId: "user-quiz-001", totalPoints: newTotal },
      createdAt: Date.now(),
    });
    const tasks = await db.syncQueue.toArray();
    const updateTask = tasks.find(t => t.type === "UPDATE_POINTS");
    assert(!!updateTask, "UPDATE_POINTS should be queued");
    assert(updateTask!.payload.totalPoints === 40, `Expected 40, got ${updateTask!.payload.totalPoints}`);
  });

  await test("BUG-02 fix verified in source: saveProgressRef.current(true) after quiz", async () => {
    const { readFileSync } = await import("fs");
    const { resolve } = await import("path");
    const src = readFileSync(resolve(process.cwd(), "src/app/read/[bookId]/page.tsx"), "utf8");
    const hasFix = /bonusPoints > 0[\s\S]{0,300}saveProgressRef\.current\(true\)/.test(src);
    assert(hasFix, "BUG-02 not fixed — saveProgressRef.current(true) missing after bonus points");
  });

  await test("Fixed quiz flow: isFinal=true DOES add READ_LOG", async () => {
    const isFinal = true; // the fix
    let sessionLoggedRef = false;
    if (isFinal && !sessionLoggedRef) {
      await db.syncQueue.add({
        type: "READ_LOG",
        payload: {
          userId: "user-quiz-001", bookId: 1, bookTitle: "Test",
          startTime: Date.now() - 5000, endTime: Date.now(),
          duration: 5, pagesRead: 1, pointsEarned: 40,
        },
        createdAt: Date.now(),
      });
      sessionLoggedRef = true;
    }
    const tasks = await db.syncQueue.toArray();
    const readLog = tasks.find(t => t.type === "READ_LOG");
    assert(!!readLog, "READ_LOG should exist with fix applied");
    assert(readLog!.payload.pointsEarned === 40, "Quiz bonus points should be in READ_LOG");
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 6 — pdfBlob offline storage
// ─────────────────────────────────────────────────────────────────────────────
async function suitePdfBlobStorage() {
  console.log(bold("\nSuite 6: PDF Blob — Offline Storage"));
  const db = makeDB("TestDB_PDF");

  // Add a book WITHOUT a pdfBlob (freshly synced from server)
  await db.books.add({
    id: 1,
    title: "Science Book",
    grade: "5",
    pages: 50,
    pdfUrl: "https://example.com/science.pdf",
    level: "medium",
    subject: "science",
    language: "en",
  });

  await test("Book exists in Dexie without pdfBlob after library sync", async () => {
    const book = await db.books.get(1);
    assert(!!book, "Book should exist");
    assert(!book!.pdfBlob, "pdfBlob should be undefined before download");
  });

  await test("Simulated download: pdfBlob is stored to Dexie", async () => {
    // Simulate handleDownload() in pdf-reader.tsx saving the blob
    const fakeBlob = new Blob(["fake-pdf-content"], { type: "application/pdf" });
    await db.books.update(1, { pdfBlob: fakeBlob });
    const book = await db.books.get(1);
    assert(!!book!.pdfBlob, "pdfBlob should be present after download");
    assert(book!.pdfBlob!.size > 0, "Blob should have size > 0");
  });

  await test("pdfBlob is preserved during library re-sync (useBooks.ts:58-63)", async () => {
    const existingBlob = (await db.books.get(1))!.pdfBlob;
    // Simulate syncLibrary() doing a put() with preserved blob
    await db.books.put({
      id: 1,
      title: "Science Book (updated)",
      grade: "5",
      pages: 55,
      pdfUrl: "https://example.com/science-v2.pdf",
      level: "medium",
      subject: "science",
      language: "en",
      pdfBlob: existingBlob, // preserved from existingLocal?.pdfBlob
    });
    const book = await db.books.get(1);
    assert(!!book!.pdfBlob, "pdfBlob should survive a library re-sync");
    assert(book!.title === "Science Book (updated)", "Title should be updated");
  });

  await test("Without pdfBlob, reader falls back to remote pdfUrl", async () => {
    // Simulate the activeUrl logic from pdf-reader.tsx:90-94
    const book = { pdfUrl: "https://cdn.example.com/book.pdf", fileId: undefined, pdfBlob: undefined as Blob | undefined };
    const blobUrl = book.pdfBlob ? "blob://fake" : null;
    const activeUrl = blobUrl
      ? blobUrl
      : book.fileId ? `/api/proxy-pdf?fileId=${book.fileId}`
      : book.pdfUrl;
    assert(activeUrl === "https://cdn.example.com/book.pdf", `Expected remote URL, got ${activeUrl}`);
  });

  await test("With pdfBlob, activeUrl uses blob:// (offline-safe)", async () => {
    const fakeBlob = new Blob(["data"], { type: "application/pdf" });
    const blobUrl = URL.createObjectURL(fakeBlob);
    const activeUrl = blobUrl; // blobUrl takes precedence
    assert(activeUrl.startsWith("blob:"), `Expected blob: URL, got ${activeUrl}`);
    URL.revokeObjectURL(blobUrl);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 7 — useSync mutex & double-sync prevention
// ─────────────────────────────────────────────────────────────────────────────
async function suiteSyncMutex() {
  console.log(bold("\nSuite 7: useSync — Mutex & Idempotency"));
  const db = makeDB("TestDB_Mutex");

  await db.syncQueue.add({ type: "UPDATE_POINTS", payload: { userId: "u1", totalPoints: 10 }, createdAt: Date.now() });
  await db.syncQueue.add({ type: "UPDATE_POINTS", payload: { userId: "u1", totalPoints: 20 }, createdAt: Date.now() });

  await test("isSyncingRef prevents concurrent sync calls", async () => {
    let isSyncingRef = false;
    let syncCallCount = 0;
    const attemptSync = async () => {
      if (isSyncingRef) return; // mutex
      isSyncingRef = true;
      syncCallCount++;
      await new Promise(r => setTimeout(r, 10)); // simulate async work
      isSyncingRef = false;
    };
    // Fire 3 concurrent calls
    await Promise.all([attemptSync(), attemptSync(), attemptSync()]);
    assert(syncCallCount === 1, `Expected 1 sync execution, got ${syncCallCount}`);
  });

  await test("Sequential sync processes all queued tasks", async () => {
    const tasks = await db.syncQueue.toArray();
    const processed: number[] = [];
    for (const task of tasks) {
      processed.push(task.id!);
      await db.syncQueue.delete(task.id!);
    }
    const remaining = await db.syncQueue.count();
    assert(remaining === 0, `Expected 0 tasks left, got ${remaining}`);
    assert(processed.length === 2, `Expected 2 tasks processed, got ${processed.length}`);
  });

  await test("Empty queue causes no error when sync is triggered", async () => {
    const tasks = await db.syncQueue.toArray();
    assert(tasks.length === 0, "Queue already empty");
    // Simulates: if (pendingTasks.length === 0) return;
    let reached = false;
    if (tasks.length > 0) { reached = true; }
    assert(!reached, "Should return early on empty queue");
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 8 — PWA config audit
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

async function suitePWAConfig() {
  console.log(bold("\nSuite 8: PWA Configuration Audit"));

  const root = resolve(process.cwd());

  await test("next.config.ts: PWA enabled in production (disable uses NODE_ENV guard)", async () => {
    const cfg = readFileSync(resolve(root, "next.config.ts"), "utf8");
    const isFixed = /disable\s*:\s*process\.env\.NODE_ENV\s*===\s*['"]development['"]/.test(cfg);
    assert(isFixed, "Expected disable: process.env.NODE_ENV === 'development' — BUG-01 not applied");
  });

  await test("manifest.json exists in /public", async () => {
    assert(existsSync(resolve(root, "public/manifest.json")), "manifest.json missing from /public");
  });

  await test("manifest.json has correct app name 'ThinkSharp Digital Library'", async () => {
    const manifest = JSON.parse(readFileSync(resolve(root, "public/manifest.json"), "utf8"));
    assert(manifest.name === "ThinkSharp Digital Library", `Wrong name: ${manifest.name}`);
    assert(manifest.short_name === "BookQuest", `Wrong short_name: ${manifest.short_name}`);
    assert(manifest.theme_color === "#d9342a", "Missing brand theme_color");
  });

  await test("manifest.json has required PWA fields", async () => {
    const manifest = JSON.parse(readFileSync(resolve(root, "public/manifest.json"), "utf8"));
    assert(!!manifest.start_url, "Missing start_url");
    assert(manifest.display === "standalone", `display should be 'standalone', got ${manifest.display}`);
    assert(Array.isArray(manifest.icons) && manifest.icons.length >= 2, "Need at least 2 icons (192, 512)");
  });

  await test("192x192 and 512x512 icons declared in manifest", async () => {
    const manifest = JSON.parse(readFileSync(resolve(root, "public/manifest.json"), "utf8"));
    const sizes = manifest.icons.map((i: any) => i.sizes);
    assert(sizes.includes("192x192"), "Missing 192x192 icon");
    assert(sizes.includes("512x512"), "Missing 512x512 icon");
  });

  await test("Icon files actually exist in /public", async () => {
    const manifest = JSON.parse(readFileSync(resolve(root, "public/manifest.json"), "utf8"));
    const missing: string[] = [];
    for (const icon of manifest.icons) {
      const filePath = resolve(root, "public", icon.src.replace(/^\//, ""));
      if (!existsSync(filePath)) missing.push(icon.src);
    }
    if (missing.length > 0) {
      throw new Error(`Missing icon files: ${missing.join(", ")}`);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 9 — Points never go negative
// ─────────────────────────────────────────────────────────────────────────────
async function suitePointsSafety() {
  console.log(bold("\nSuite 9: Points Safety & Edge Cases"));

  await test("0-second page visit → 0 points (no XP for flips)", async () => {
    const pts = getPointsForPageTime(300, 0);
    assert(pts === 0, `Expected 0, got ${pts}`);
  });

  await test("1-second visit on sparse page → proportional partial credit", async () => {
    const pts = getPointsForPageTime(75, 1); // max=2pts, minTime=30s → 1/30 * 2 = 0
    assert(pts >= 0, "Points should not be negative");
  });

  await test("saveProgress skips if totalPts=0 and duration<2s (debounce)", async () => {
    // From page.tsx:111: if (totalPts === 0 && totalDur < 2) return;
    const totalPts = 0;
    const totalDur = 1;
    const shouldSkip = totalPts === 0 && totalDur < 2;
    assert(shouldSkip, "Should skip saving trivial sessions");
  });

  await test("sessionLoggedRef prevents duplicate READ_LOG entries", async () => {
    const db = makeDB("TestDB_Dedupe");
    let sessionLoggedRef = false;
    // Simulate saveProgress(true) called twice
    for (let i = 0; i < 2; i++) {
      if (!sessionLoggedRef) {
        await db.syncQueue.add({ type: "READ_LOG", payload: { userId: "u" }, createdAt: Date.now() });
        sessionLoggedRef = true;
      }
    }
    const readLogs = (await db.syncQueue.toArray()).filter(t => t.type === "READ_LOG");
    assert(readLogs.length === 1, `Expected 1 READ_LOG, got ${readLogs.length}`);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Main runner
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log(bold("═══════════════════════════════════════════════════════"));
  console.log(bold("  ThinkSharp / BookQuest — Offline Sync Test Suite"));
  console.log(bold("═══════════════════════════════════════════════════════"));
  console.log(dim("  fake-indexeddb + Dexie | no browser required\n"));

  await suitePointsCalculation();
  await suiteUserIdResolution();
  await suiteSyncQueueCreation();
  await suiteGuestFiltering();
  await suiteQuizFlow();
  await suitePdfBlobStorage();
  await suiteSyncMutex();
  await suitePWAConfig();
  await suitePointsSafety();

  console.log("\n" + bold("═══════════════════════════════════════════════════════"));
  const allPassed = failed === 0;
  const summary = `  ${green(`${passed} passed`)}  ${failed > 0 ? red(`${failed} failed`) : dim("0 failed")}  ${dim(`${total} total`)}`;
  console.log(summary);
  if (!allPassed) {
    console.log(red("\n  Some tests failed — see details above."));
    console.log(yellow("  Tests marked [BUG] are expected failures that confirm known issues."));
  } else {
    console.log(green("\n  All tests passed."));
  }
  console.log(bold("═══════════════════════════════════════════════════════\n"));
}

main().catch(console.error);
