import { useCallback, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Book, getSyncKey } from "@/lib/db";
import { supabase } from "@/lib/supabase";

export function useBooks() {
    const books = useLiveQuery(() => db.books.toArray());
    const syncingRef = useRef(false);

    const syncLibrary = useCallback(async () => {
        if (!supabase || syncingRef.current) return;

        try {
            syncingRef.current = true;
            console.log("[Sync] Starting library synchronization...");

            const { data, error } = await supabase
                .from('books')
                .select('*');

            if (error) throw error;
            if (data) {
                console.log(`[Sync] Found ${data.length} books on server.`);

                const serverKeys = new Set(data.map(getSyncKey));
                const localBooks = await db.books.toArray();

                // 1. Purge local books that are definitely not on the server
                // Only purge if we actually got a healthy response from the server
                if (data.length > 0) {
                    for (const localBook of localBooks) {
                        if (!serverKeys.has(getSyncKey(localBook))) {
                            console.log(`[Sync] Removing orphaned local book: ${localBook.title}`);
                            await db.books.delete(localBook.id!);
                        }
                    }
                }

                // 2. Add or Update books from server
                for (const book of data) {
                    const sKey = getSyncKey(book);
                    // Find existing by normalized composite match
                    const existingBook = localBooks.find(lb => getSyncKey(lb) === sKey);

                    const bookData = {
                        title: book.title,
                        fileId: book.fileId,
                        grade: book.grade,
                        pages: book.pages,
                        pdfUrl: book.pdfUrl,
                        level: book.level,
                        subject: book.subject,
                        language: book.language,
                        coverUrl: book.coverUrl
                    };

                    if (existingBook) {
                        // Update existing book if anything changed (metadata refresh)
                        // This uses PUT to overwrite while preserving ID and local pdfBlob
                        await db.books.put({
                            ...bookData,
                            id: existingBook.id,
                            pdfBlob: existingBook.pdfBlob // Keep the precious download!
                        });
                    } else {
                        // Add as a new book - only if we didn't just find it
                        await db.books.add(bookData);
                    }
                }
                console.log("[Sync] Sync complete.");
            }
        } catch (err) {
            console.error("[Sync] Error during sync:", err);
        } finally {
            syncingRef.current = false;
        }
    }, []);

    const addBook = async (book: Book) => {
        await db.books.add(book);
    };

    const addBooks = async (newBooks: Book[]) => {
        await db.books.bulkAdd(newBooks);
    };

    const removeBook = async (id: number) => {
        await db.books.delete(id);
    };

    return { books, addBook, addBooks, removeBook, syncLibrary };
}

