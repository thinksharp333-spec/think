"use client";

import { useState, useEffect, useRef } from 'react';
import { PdfReader } from '@/components/pdf-reader';
import { ArrowLeft, Clock } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { useLiveQuery } from "dexie-react-hooks";

export default function ReadPage() {
    const params = useParams();
    const bookIdString = typeof params.bookId === 'string' ? params.bookId : '1';
    const bookIdNum = parseInt(bookIdString);

    const book = useLiveQuery(
        () => db.books.get(bookIdNum),
        [bookIdNum]
    );

    const pdfUrl = book?.pdfUrl || '/sample.pdf';

    // State for tracking per-page time
    const [currentPage, setCurrentPage] = useState(1);
    const currentPageRef = useRef(1);
    const [totalPages, setTotalPages] = useState(0);
    const totalPagesRef = useRef(0);
    const pageStartTimeRef = useRef(Date.now());
    const accumulatedPointsRef = useRef(0);

    const discoveredWordCountsRef = useRef<Record<number, number>>({});

    // Dynamic max points based on word count
    const getMaxPointsForPage = (page: number) => {
        const wordCount = discoveredWordCountsRef.current[page] ?? book?.pageWordCounts?.[page];
        if (wordCount === undefined) return 5; // Default cap if word count unknown
        // Formula: 1 point per 25 words, min 1, max 10
        return Math.max(1, Math.min(10, Math.floor(wordCount / 25)));
    };

    // Global Session Tracking
    const startTimeRef = useRef(Date.now());
    const secondsReadRef = useRef(0);
    const [displaySeconds, setDisplaySeconds] = useState(0);

    // Timer only for display
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            const sessionDuration = Math.floor((now - startTimeRef.current) / 1000);
            setDisplaySeconds(sessionDuration);
            secondsReadRef.current = sessionDuration;
        }, 1000);

        return () => {
            clearInterval(interval);
            saveProgress();
        };
    }, [bookIdString]);

    const handleLoadSuccess = (numPages: number) => {
        setTotalPages(numPages);
        totalPagesRef.current = numPages;
    };

    const handlePageChange = (newPage: number) => {
        const now = Date.now();
        const durationOnPage = (now - pageStartTimeRef.current) / 1000;

        // Calculate points for the page we just left
        const maxPoints = getMaxPointsForPage(currentPage);
        const pointsForPage = Math.min(Math.floor(durationOnPage / 10), maxPoints);

        if (pointsForPage > 0) {
            accumulatedPointsRef.current += pointsForPage;
            console.log(`[DEBUG] Page ${currentPage} points awarded: ${pointsForPage}. Total accumulated: ${accumulatedPointsRef.current}`);
            alert(`[DEBUG] Page ${currentPage} points awarded: ${pointsForPage}. Total: ${accumulatedPointsRef.current}`);
        } else {
            console.log(`[DEBUG] Page ${currentPage} - No points awarded. Duration: ${durationOnPage.toFixed(1)}s, MaxPoints: ${maxPoints}`);
        }

        pageStartTimeRef.current = now;
        setCurrentPage(newPage);
        currentPageRef.current = newPage;
    };

    const handleWordCount = (page: number, count: number) => {
        discoveredWordCountsRef.current[page] = count;
    };

    const saveProgress = async () => {
        const now = Date.now();
        const durationOnFinalPage = (now - pageStartTimeRef.current) / 1000;
        
        // Use Refs to bypass the stale closure during useEffect cleanup
        const finalPage = currentPageRef.current;
        const totalNumPages = totalPagesRef.current;

        const maxPointsFinal = getMaxPointsForPage(finalPage);
        const pointsForFinalPage = Math.min(Math.floor(durationOnFinalPage / 10), maxPointsFinal);

        const totalSessionPoints =
            accumulatedPointsRef.current + pointsForFinalPage;

        const totalDuration = Math.floor(
            (now - startTimeRef.current) / 1000
        );

        const mayHaveCompleted = finalPage === totalNumPages && totalNumPages > 0;
        if (totalSessionPoints === 0 && totalDuration < 5 && !mayHaveCompleted) return;

        console.log(
            `Saving session for book ${bookIdString}: ${totalDuration}s, Points: ${totalSessionPoints}`
        );

        try {
            // Get the active user (first one in the local DB)
            const allUsers = await db.users.toArray();
            const localUser = allUsers[0];
            console.log(`[DEBUG] Active user found:`, localUser);

            if (!localUser) {
                console.error("[DEBUG] No active user found in IndexedDB!");
                alert("[DEBUG] Error: No active user found. Points cannot be saved.");
                return;
            }

            const endTime = Date.now();
            // Always use localUser.id — after login it's 'local-user'
            const userId = localUser.id;
            // Also grab the real remote ID if one was stashed during login
            const remoteUserId = (localUser as any).student_id || 
                (localUser.id !== 'local-user' ? localUser.id : null);

            const isCompleted = finalPage === totalNumPages && totalNumPages > 0;
            let newlyCompleted = false;

            if (isCompleted) {
                // Determine if this is the first time finishing this book
                const existingSessions = await db.readings.where({ bookId: bookIdString }).toArray();
                const alreadyCompleted = existingSessions.some(s => s.userId === userId && (s as any).completed);
                if (!alreadyCompleted) {
                    newlyCompleted = true;
                }
            }

            await db.readings.add({
                bookId: bookIdString,
                userId: userId,
                startTime: startTimeRef.current,
                endTime: endTime,
                synced: 0,
                completed: isCompleted
            } as any);

            // 2. Update Local User Points & Book Word Counts
            const newTotalPoints = (localUser.totalPoints || 0) + totalSessionPoints;
            const newBooksRead = (localUser.booksRead || 0) + (newlyCompleted ? 1 : 0);

            console.log(`[DEBUG] Updating user "${userId}": points=${newTotalPoints}, booksRead=${newBooksRead}, newlyCompleted=${newlyCompleted}`);

            await db.users.update(userId, {
                totalPoints: newTotalPoints,
                booksRead: newBooksRead
            });

            // Save any newly discovered word counts to the book
            if (book && Object.keys(discoveredWordCountsRef.current).length > 0) {
                const updatedWordCounts = {
                    ...(book.pageWordCounts || {}),
                    ...discoveredWordCountsRef.current
                };
                await db.books.update(bookIdNum, {
                    pageWordCounts: updatedWordCounts
                });
            }

            if (supabase && remoteUserId) {
                const bookTitle = ({
                    1: 'Sample Book',
                    2: 'Science Book',
                    3: 'Math Book',
                    4: 'History'
                } as any)[bookIdNum] || 'Unknown Book';

                const { error } = await supabase
                    .from('reading_sessions')
                    .insert([{
                        user_id: remoteUserId,
                        book_id: bookIdNum,
                        book_title: bookTitle,
                        start_time: new Date(startTimeRef.current).toISOString(),
                        end_time: new Date(endTime).toISOString(),
                        duration_seconds: totalDuration,
                        pages_read: finalPage,
                        completed: isCompleted
                    }]);

                if (error) {
                    console.warn("Supabase reading_sessions error:", error.message);
                }

                // Also directly update user points + books_read in Supabase
                const { error: updateError } = await supabase
                    .from('users')
                    .update({ 
                        "totalPoints": newTotalPoints,
                        books_read: newBooksRead 
                    })
                    .eq('id', remoteUserId);
                
                if (updateError) {
                    console.warn("Supabase user update error:", updateError.message);
                } else {
                    console.log(`[DEBUG] Supabase user updated: points=${newTotalPoints}, books_read=${newBooksRead}`);
                }
            }

            await db.syncQueue.add({
                type: 'READ_LOG',
                payload: {
                    userId: remoteUserId || userId,
                    bookId: bookIdNum,
                    startTime: startTimeRef.current,
                    endTime: endTime
                },
                createdAt: Date.now()
            });

            await db.syncQueue.add({
                type: 'UPDATE_POINTS',
                payload: {
                    userId: remoteUserId || userId,
                    totalPoints: newTotalPoints,
                    booksRead: newBooksRead
                },
                createdAt: Date.now()
            });

            console.log(`Saved! Earned ${totalSessionPoints} points.`);
        } catch (e) {
            console.error("Failed to save progress", e);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md px-4 py-3 shadow-sm flex items-center justify-between sticky top-0 z-20 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard" className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5 text-gray-700" />
                    </Link>
                    <div className="flex flex-col">
                        <h1 className="font-bold text-gray-900 text-sm line-clamp-1">{book?.title || "Reading..."}</h1>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Level {book?.level || "1"}</span>
                            <span className="w-1 h-1 rounded-full bg-gray-200" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-green-600">{book?.language || "English"}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-black tabular-nums text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full ring-1 ring-black/5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span>{Math.floor(displaySeconds / 60)}:{(displaySeconds % 60).toString().padStart(2, '0')}</span>
                    </div>
                </div>
            </header>

            <main className="flex-1 p-4 flex justify-center">
                <PdfReader
                    url={pdfUrl}
                    book={book}
                    bookIdNum={bookIdNum}
                    onPageChange={handlePageChange}
                    onWordCount={handleWordCount}
                    onLoadSuccess={handleLoadSuccess}
                />
            </main>
        </div>
    );
}
