import Dexie, { type EntityTable } from 'dexie';

interface User {
    id: string; // Remote ID
    name: string;
    age?: number;
    city?: string;
    school?: string;
    password?: string; // Simple local password for demo
    totalPoints: number;
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
db.version(7).stores({
    users: 'id, name, totalPoints',
    readings: '++id, bookId, userId, synced, startTime',
    syncQueue: '++id, type, createdAt',
    books: '++id, title, grade, level, subject, language'
});

export { db };
export type { User, ReadingSession, SyncTask, Book };
