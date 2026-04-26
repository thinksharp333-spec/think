import { useCallback, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Book, getSyncKey } from "@/lib/db";
import { supabase } from "@/lib/supabase";

export function useBooks() {
    const books = useLiveQuery(() => db.books.toArray());
    const syncingRef = useRef(false);

    const syncLibrary = useCallback(async () => {
        if (syncingRef.current) return;

        try {
            syncingRef.current = true;

            const res = await fetch('/api/books');
            if (!res.ok) throw new Error(`Books API error: ${res.status}`);
            const { books: data, error } = await res.json();

            if (error) throw new Error(error);
            if (data) {
                let localBooks = await db.books.toArray();

                // Clear orphans: if local IDs don't match server IDs, wipe and re-sync
                // This ensures local ID 1, 2, 3 always matches Supabase ID 1, 2, 3
                const serverIds = new Set(data.map(b => b.id));
                const orphans = localBooks.filter(lb => !serverIds.has(lb.id));
                if (orphans.length > 0) {
                    await db.books.clear();
                    localBooks = [];
                }

                // Add or update books from server
                for (const book of data) {
                    const sKey = getSyncKey(book);

                    // Use the server's 'id' as the local 'id' — the unifier between local and remote

                    const bookData = {
                        id: book.id,
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
                        // Merge questions: prefer whichever side has real (non-dummy) questions.
                        // Never overwrite a good local quiz with an empty/dummy server value.
                        questions: (() => {
                            const serverQ = book.questions;
                            const localQ  = localBooks.find(lb => lb.id === book.id)?.questions
                                         ?? localBooks.find(lb => getSyncKey(lb) === sKey)?.questions;
                            const isDummy = (q: any[] | undefined) =>
                                !q || q.length === 0 ||
                                q.some((item: any) =>
                                    !item?.question ||
                                    String(item.question).includes("primary topic discussed in the book") ||
                                    String(item.question).includes("Placeholder fallback")
                                );
                            if (!isDummy(localQ))  return localQ;   // local is good — keep it
                            if (!isDummy(serverQ)) return serverQ;  // server is good — use it
                            return localQ ?? serverQ ?? [];          // both dummy — keep local
                        })()

                    };

                    // put() handles both add and update; preserve local pdfBlob
                    const existingLocal = localBooks.find(lb => lb.id === book.id);
                    await db.books.put({
                        ...bookData,
                        pdfBlob: existingLocal?.pdfBlob
                    });
                }
            }
        } catch (err: any) {
            console.error("[Sync] Library sync failed:", {
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

