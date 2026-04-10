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
                .select('id, title, "fileId", grade, pages, "pdfUrl", level, subject, language, "coverUrl", questions, avg_rating, review_count');

            if (error) throw error;
            if (data) {
                console.log(`[Sync] Found ${data.length} books on server. Samples:`, data.slice(0, 2).map(b => ({ title: b.title, rating: b.avg_rating })));

                const serverKeys = new Set(data.map(getSyncKey));
                let localBooks = await db.books.toArray();

                // 1. CLEAR ORPHANS: If we have books that don't match server IDs, wipe and re-sync once
                // This fix ensures local ID 1, 2, 3 matches Supabase ID 1, 2, 3
                const serverIds = new Set(data.map(b => b.id));
                const orphans = localBooks.filter(lb => !serverIds.has(lb.id));
                if (orphans.length > 0) {
                    console.log("[Sync] Detected ID mismatch/orphans. Clearing local library for clean re-sync.");
                    await db.books.clear();
                    // Refetch localBooks as it's now empty
                    localBooks = [];
                }

                // 2. Add or Update books from server
                for (const book of data) {
                    const sKey = getSyncKey(book);
                    
                    // VERY IMPORTANT: Use the server's 'id' as the local 'id'
                    // This ensures that reviews and reading logs link to the correct row in Supabase
                    const bookData = {
                        id: book.id, // THE UNIFIER
                        title: book.title,
                        fileId: book.fileId,
                        grade: book.grade,
                        pages: book.pages,
                        pdfUrl: book.pdfUrl,
                        level: book.level,
                        subject: book.subject,
                        language: book.language,
                        coverUrl: book.coverUrl,
                        avgRating: book.avg_rating || 0,
                        reviewCount: book.review_count || 0,
                        questions: (book.questions && book.questions.length > 0) 
                            ? book.questions 
                            : (localBooks.find(lb => getSyncKey(lb) === sKey)?.questions || [])
                    };

                    // We use put() which handles both add and update since we define the 'id'
                    // We also preserve the local pdfBlob if it exists
                    const existingLocal = localBooks.find(lb => lb.id === book.id);
                    await db.books.put({
                        ...bookData,
                        pdfBlob: existingLocal?.pdfBlob
                    });
                }
                console.log("[Sync] Sync complete.");
            }
        } catch (err: any) {
            console.error("[Sync] Error during library sync:", {
                message: err.message,
                details: err.details,
                hint: err.hint,
                code: err.code
            });
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

