import Dexie, { type EntityTable } from 'dexie';

interface User {
    id: string; // Remote ID
    name: string;
    mobile: string;
    verifiedMobile?: string; // Confirmed mobile after OTP
    isVerified?: boolean;
    age?: number;
    city?: string;
    school?: string;
    schoolId?: string; // ID from schools table
    password?: string;
    totalPoints: number;
    booksRead?: number;
    lastLogin?: number;
}

interface ReadingSession {
    id?: number; // Local Auto-increment
    userId: string; // ID of the user who read
    bookId: string;
    userId: string;
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
}

interface SyncTask {
    id?: number;
    type: 'UPDATE_POINTS' | 'READ_LOG';
    payload: any;
    createdAt: number;
}

const db = new Dexie('AdaptivePlatformDB') as Dexie & {
    users: EntityTable<User, 'id'>;
    readings: EntityTable<ReadingSession, 'id'>;
    syncQueue: EntityTable<SyncTask, 'id'>;
    books: EntityTable<Book, 'id'>;
};

// Schema definition
db.version(8).stores({ // Incremented version to apply changes
    users: 'id, name, mobile, isVerified, schoolId, totalPoints, booksRead',
    readings: '++id, bookId, synced, startTime',
    syncQueue: '++id, type, createdAt',
    books: '++id, title, grade, level, subject, language'
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
export type { User, ReadingSession, SyncTask, Book };

/**
 * Utility to generate a consistent key for syncing books between local and server
 */
export function getSyncKey(book: any) {
    return `${book.title}-${book.grade}-${book.language || 'en'}`.toLowerCase();
}
