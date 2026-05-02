'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface CachedBook {
    id: number;
    title: string;
    sizeKB: number;
}

export default function OfflinePage() {
    const [cachedBooks, setCachedBooks] = useState<CachedBook[]>([]);

    useEffect(() => {
        const req = indexedDB.open('AdaptivePlatformDB');
        req.onsuccess = (e) => {
            const db = (e.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains('books')) return;
            const tx = db.transaction('books', 'readonly');
            const getAll = tx.objectStore('books').getAll();
            getAll.onsuccess = (e) => {
                const books = (e.target as IDBRequest).result as any[];
                const withBlob = books
                    .filter(b => b.pdfBlob instanceof Blob && b.pdfBlob.size > 0)
                    .map(b => ({ id: b.id, title: b.title, sizeKB: Math.round(b.pdfBlob.size / 1024) }));
                setCachedBooks(withBlob);
            };
        };

        const handleOnline = () => window.location.reload();
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, []);

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
                <div className="w-24 h-24 bg-[#d9342a] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <svg viewBox="0 0 24 24" fill="white" className="w-12 h-12">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z" />
                    </svg>
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-2">You're Offline</h1>
                <p className="text-gray-500 mb-8">
                    No internet connection right now. Go back online to load new content.
                </p>

                {cachedBooks.length > 0 ? (
                    <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6 text-left">
                        <p className="text-green-800 font-semibold mb-3 flex items-center gap-2">
                            <span>📚</span>
                            {cachedBooks.length} book{cachedBooks.length !== 1 ? 's' : ''} available offline
                        </p>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {cachedBooks.map(book => (
                                <Link
                                    key={book.id}
                                    href={`/read?id=${book.id}`}
                                    className="w-full text-left bg-white rounded-xl px-3 py-2 hover:bg-green-100 transition-colors flex items-center justify-between"
                                >
                                    <span className="text-sm font-medium text-gray-800 truncate">{book.title}</span>
                                    <span className="text-xs text-gray-400 ml-2 shrink-0">{book.sizeKB} KB</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 text-left">
                        <p className="text-amber-800 text-sm">
                            <span className="font-semibold">Tip:</span> Open a book while online and tap the <span className="font-semibold">↓ download button</span> in the reader to save it for offline reading.
                        </p>
                    </div>
                )}

                <button
                    onClick={() => window.location.reload()}
                    className="w-full bg-[#d9342a] text-white font-semibold py-3 rounded-2xl hover:bg-[#b82a22] transition-colors"
                >
                    Try Again
                </button>
            </div>
        </div>
    );
}
