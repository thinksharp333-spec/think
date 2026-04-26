import Dexie, { type EntityTable } from 'dexie';

interface User {
    id: string; // Remote ID
    name: string;
    mobile?: string;
    verifiedMobile?: string; // Confirmed mobile after OTP
    isVerified?: boolean;
    age?: number;
    city?: string;
    school?: string;
    schoolId?: string; // ID from schools table
    grade?: string; // Added for analytics
    role?: string; // student or admin
    password?: string;
    favouriteFood?: string; // Added for password reset security question
    totalPoints: number;
    streak?: number;
    lastPointsDate?: string;
    booksRead?: number;
    lastLogin?: number;
    // ── Avatar system ──────────────────────────────────────────
    avatarBaseId?: string;       // Character lineage: "dreamer" | "wizard" | "explorer"
    currentAvatarStage?: number; // 0 = Starter, 1 = 50 books, 2 = 120 books, 3 = Final
    currentAvatarUrl?: string;   // e.g. /avatars/dreamer_v0.png
    totalBooksRead?: number;     // Count of fully-completed books
}

interface ReadingSession {
    id?: number; // Local Auto-increment
    userId: string; // ID of the user who read
    bookId: string;
    startTime: number;
    endTime?: number;
    synced: 0 | 1; // 0 = false, 1 = true
}

interface Book {
    id?: number;
    fileId?: string; // Original Google Drive File ID
    title: string;
    grade: string;
    pages: number;
    pdfUrl: string;
    pdfBlob?: Blob; // Added for true offline storage
    level: string;
    subject: string;
    language: string;
    coverUrl?: string;
    pageWordCounts?: Record<number, number>; // Local cache of word counts per page
    questions?: any[]; // Generated questions from LLM
    avgRating?: number; // Cached average rating
    reviewCount?: number; // Cached total feedback count
    // ── Quiz text cache ──────────────────────────────────────────
    extractedText?: string; // Cached PDF text — avoids re-fetching PDF for quiz generation
    extractedWordCount?: number; // Word count of extractedText
}

interface BookReview {
    id?: number;
    bookId: number; // Matches book id
    userId: string;
    rating: number; // 1-10 stars
    reviewText: string;
    createdAt: number;
    synced: 0 | 1;
}

interface QuizAttempt {
    id?: number;
    bookId: number;
    userId: string;
    score: number;
    totalQuestions: number;
    answers: { questionIndex: number; selected: string; correct: boolean }[];
    completedAt: number;
    synced: 0 | 1;
}

interface SyncTask {
    id?: number;
    type: 'UPDATE_POINTS' | 'READ_LOG' | 'SUBMIT_REVIEW' | 'SUBMIT_QUIZ' | 'BOOK_QUIZ';
    payload: any;
    createdAt: number;
    retryCount?: number; // GAP-03: max 3 attempts before task is dropped
}

const db = new Dexie('AdaptivePlatformDB') as Dexie & {
    users: EntityTable<User, 'id'>;
    readings: EntityTable<ReadingSession, 'id'>;
    syncQueue: EntityTable<SyncTask, 'id'>;
    books: EntityTable<Book, 'id'>;
    bookReviews: EntityTable<BookReview, 'id'>;
    quizAttempts: EntityTable<QuizAttempt, 'id'>;
};

// Schema definition — version 9 is the baseline (no structural change for v10, retryCount is a non-indexed field)
db.version(9).stores({
    users: 'id, name, mobile, isVerified, schoolId, totalPoints, grade, role',

    readings: '++id, bookId, userId, synced, startTime',
    syncQueue: '++id, type, createdAt',
    books: '++id, title, grade, level, subject, language',
    bookReviews: '++id, bookId, userId, synced, createdAt'
});

// GAP-04: v10 migration — seeds retryCount:0 on any existing orphaned sync tasks
db.version(10).stores({
    users: 'id, name, mobile, isVerified, schoolId, totalPoints, grade, role',
    readings: '++id, bookId, userId, synced, startTime',
    syncQueue: '++id, type, createdAt',
    books: '++id, title, grade, level, subject, language',
    bookReviews: '++id, bookId, userId, synced, createdAt'
}).upgrade(async tx => {
    await tx.table('syncQueue').toCollection().modify(task => {
        if (task.retryCount === undefined) task.retryCount = 0;
    });
});

// v11 migration — adds avatar fields to users (non-indexed, no structural change needed)
db.version(11).stores({
    users: 'id, name, mobile, isVerified, schoolId, totalPoints, grade, role',
    readings: '++id, bookId, userId, synced, startTime',
    syncQueue: '++id, type, createdAt',
    books: '++id, title, grade, level, subject, language',
    bookReviews: '++id, bookId, userId, synced, createdAt'
}).upgrade(async tx => {
    await tx.table('users').toCollection().modify(user => {
        if (user.totalBooksRead === undefined) user.totalBooksRead = 0;
        if (user.currentAvatarStage === undefined) user.currentAvatarStage = 0;
    });
});

// v12 migration — adds quizAttempts table for offline quiz score storage
db.version(12).stores({
    users: 'id, name, mobile, isVerified, schoolId, totalPoints, grade, role',
    readings: '++id, bookId, userId, synced, startTime',
    syncQueue: '++id, type, createdAt',
    books: '++id, title, grade, level, subject, language',
    bookReviews: '++id, bookId, userId, synced, createdAt',
    quizAttempts: '++id, bookId, userId, synced, completedAt'
});

// v13 migration — adds extractedText + extractedWordCount fields to books (non-indexed)
db.version(13).stores({
    users: 'id, name, mobile, isVerified, schoolId, totalPoints, grade, role',
    readings: '++id, bookId, userId, synced, startTime',
    syncQueue: '++id, type, createdAt',
    books: '++id, title, grade, level, subject, language',
    bookReviews: '++id, bookId, userId, synced, createdAt',
    quizAttempts: '++id, bookId, userId, synced, completedAt'
});

// Seed default user
db.on('populate', async () => {
    await db.users.add({
        id: 'local-admin',
        name: 'Test Student',
        mobile: '1234567890',
        password: 'admin',
        totalPoints: 0,
        booksRead: 0,
        isVerified: true,
        school: 'ThinkSharp School',
        city: 'Mumbai',
        age: 12
    });
});

export { db };
export type { User, ReadingSession, SyncTask, Book, BookReview, QuizAttempt };

/**
 * Utility to generate a consistent key for syncing books between local and server
 */
export function getSyncKey(book: any) {
    return `${book.title}-${book.grade}-${book.language || 'en'}`.toLowerCase();
}
