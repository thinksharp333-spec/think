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
    const completedRef = useRef(false);
    const MAX_POINTS_PER_PAGE = 5;

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

        const pointsForPage = Math.min(
            Math.floor(durationOnPage / 10),
            MAX_POINTS_PER_PAGE
        );

        if (pointsForPage > 0) {
            accumulatedPointsRef.current += pointsForPage;
            console.log(
                `Page ${currentPage} done: ${durationOnPage.toFixed(1)}s -> ${pointsForPage} pts. Total: ${accumulatedPointsRef.current}`
            );
        }

        if (newPage === totalPages && totalPages > 0) {
            completedRef.current = true;
        }

        pageStartTimeRef.current = now;
        setCurrentPage(newPage);
    };

    const saveProgress = async () => {
        const now = Date.now();
        const durationOnFinalPage = (now - pageStartTimeRef.current) / 1000;
        const pointsForFinalPage = Math.min(
            Math.floor(durationOnFinalPage / 10),
            MAX_POINTS_PER_PAGE
        );

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
            const localUser = await db.users.get('local-user');
            if (!localUser) {
                console.error("No local user found.");
                return;
            }

            const endTime = Date.now();
            const userId =
                (localUser as any).student_id ||
                (localUser.id !== 'local-user' ? localUser.id : null);

            await db.readings.add({
                bookId: bookIdNum,
                userId: userId || 'local-user',
                startTime: startTimeRef.current,
                endTime: endTime,
                synced: 0
            });

            const newTotalPoints =
                (localUser.totalPoints || 0) + totalSessionPoints;

            await db.users.update('local-user', {
                totalPoints: newTotalPoints
            });

            if (userId && userId !== 'local-user') {
                const exists = await db.users.get(userId);
                if (exists) {
                    await db.users.update(userId, {
                        totalPoints: newTotalPoints
                    });
                }
            }

            if (supabase && userId) {
                const bookTitle = ({
                    1: 'Sample Book',
                    2: 'Science Book',
                    3: 'Math Book',
                    4: 'History'
                } as any)[bookIdNum] || 'Unknown Book';

                const isCompleted =
                    completedRef.current ||
                    (currentPage === totalPages && totalPages > 0);

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
                        completed: isCompleted
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
            <header className="bg-white px-4 py-3 shadow-sm flex items-center justify-between sticky top-0 z-20">
                <Link href="/" className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft className="w-5 h-5 text-gray-700" />
                </Link>
                <h1 className="font-semibold text-gray-800 text-sm">
                    {book?.title || "Reading..."}
                </h1>
                <div className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    <Clock className="w-3 h-3" />
                    <span>
                        {Math.floor(displaySeconds / 60)}:
                        {(displaySeconds % 60).toString().padStart(2, '0')}
                    </span>
                </div>
            </header>

            <main className="flex-1 p-4 flex justify-center">
                <PdfReader
                    url={pdfUrl}
                    book={book}
                    bookIdNum={bookIdNum}
                    onPageChange={handlePageChange}
                    onLoadSuccess={handleLoadSuccess}
                />
            </main>
        </div>
    );
}
