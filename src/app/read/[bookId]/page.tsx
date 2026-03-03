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
    const [totalPages, setTotalPages] = useState(0);
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
    };

    const handleWordCount = (page: number, count: number) => {
        discoveredWordCountsRef.current[page] = count;
    };

    const saveProgress = async () => {
        const now = Date.now();
        const durationOnFinalPage = (now - pageStartTimeRef.current) / 1000;
        const maxPointsFinal = getMaxPointsForPage(currentPage);
        const pointsForFinalPage = Math.min(Math.floor(durationOnFinalPage / 10), maxPointsFinal);

        const totalSessionPoints =
            accumulatedPointsRef.current + pointsForFinalPage;

        const totalDuration = Math.floor(
            (now - startTimeRef.current) / 1000
        );

        if (totalSessionPoints === 0 && totalDuration < 5) return;

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
            const userId =
                (localUser as any).student_id ||
                (localUser.id !== 'local-user' ? localUser.id : null);

            await db.readings.add({
                bookId: bookIdString,
                userId: userId || 'local-user',
                startTime: startTimeRef.current,
                endTime: endTime,
                synced: 0
            });

            // 2. Update Local User Points & Book Word Counts
            const newTotalPoints = (localUser.totalPoints || 0) + totalSessionPoints;
            await db.users.update(userId, {
                totalPoints: newTotalPoints
            });

            // Also update 'local-user' specifically if it still exists and is different
            if (userId !== 'local-user') {
                const guest = await db.users.get('local-user');
                if (guest) {
                    await db.users.update('local-user', {
                        totalPoints: newTotalPoints
                    });
                }
            }

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

            if (supabase && userId) {
                const bookTitle = ({
                    1: 'Sample Book',
                    2: 'Science Book',
                    3: 'Math Book',
                    4: 'History'
                } as any)[bookIdNum] || 'Unknown Book';

                // const isCompleted =
                //     completedRef.current ||
                //     (currentPage === totalPages && totalPages > 0);

                const { error } = await supabase
                    .from('reading_sessions')
                    .insert([{
                        user_id: userId,
                        book_id: bookIdNum,
                        book_title: bookTitle,
                        start_time: new Date(startTimeRef.current).toISOString(),
                        end_time: new Date(endTime).toISOString(),
                        duration_seconds: totalDuration,
                        pages_read: currentPage,
                        // completed: isCompleted
                    }]);

                if (error) {
                    console.warn("Supabase error:", error.message);
                }
            }

            await db.syncQueue.add({
                type: 'READ_LOG',
                payload: {
                    userId: userId || 'local-user',
                    bookId: bookIdNum,
                    startTime: startTimeRef.current,
                    endTime: endTime
                },
                createdAt: Date.now()
            });

            await db.syncQueue.add({
                type: 'UPDATE_POINTS',
                payload: {
                    userId: userId || 'local-user',
                    totalPoints: newTotalPoints
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
                    <Link href="/" className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors">
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
                />
            </main>
        </div>
    );
}
