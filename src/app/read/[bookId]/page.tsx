"use client";

import { useState, useEffect, useRef } from 'react';
import { PdfReader } from '@/components/pdf-reader';
import { ArrowLeft, BookOpen, Trophy, CheckCircle2, XCircle, Plus, Star, Clock } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/db';
import { useLiveQuery } from "dexie-react-hooks";
import { dedupeReviewsByUser, getBookRatingStats } from '@/lib/book-ratings';

export default function ReadPage() {
    const getRemoteUserId = (user?: { id: string; student_id?: string } | undefined) =>
        user?.student_id || (user?.id !== 'local-user' ? user?.id : null);

    const params = useParams();
    const bookIdString = typeof params.bookId === 'string' ? params.bookId : '1';
    const bookIdNum = parseInt(bookIdString);

    const book = useLiveQuery(() => db.books.get(bookIdNum), [bookIdNum]);
    const reviews = useLiveQuery(() => db.bookReviews.where('bookId').equals(bookIdNum).sortBy('createdAt'), [bookIdNum]);
    const pdfUrl = book?.pdfUrl || '/sample.pdf';

    const [currentPage, setCurrentPage] = useState(1);
    const currentPageRef = useRef(1);
    const [totalPages, setTotalPages] = useState(0);
    const totalPagesRef = useRef(0);
    const pageStartTimeRef = useRef(Date.now());
    const accumulatedPointsRef = useRef(0);
    const discoveredWordCountsRef = useRef<Record<number, number>>({});

    const getMaxPointsForPage = (page: number) => {
        const wordCount = discoveredWordCountsRef.current[page] ?? book?.pageWordCounts?.[page];
        if (wordCount === undefined) return 5;
        return Math.max(2, Math.min(15, Math.floor(wordCount / 15)));
    };

    const startTimeRef = useRef(Date.now());
    const [displaySeconds, setDisplaySeconds] = useState(0);

    const MAX_XP = 500;
    const currentXP = Math.min(Math.floor(displaySeconds / 2) + accumulatedPointsRef.current * 2, MAX_XP);
    const xpPercent = Math.min((currentXP / MAX_XP) * 100, 100);

    const questions = book?.questions || [];
    const [showQuiz, setShowQuiz] = useState(false);
    useEffect(() => {
        if (window.location.hash === '#quiz' && questions?.length > 0) setShowQuiz(true);
    }, [questions?.length]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [quizCompleted, setQuizCompleted] = useState(false);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);

    const handleLoadSuccess = (numPages: number) => {
    setTotalPages(numPages);
    totalPagesRef.current = numPages;
};

const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(i => i + 1);
        setSelectedOption(null);
    } else {
        setQuizCompleted(true);
        const bonusPoints = score * 10;
        if (bonusPoints > 0) { accumulatedPointsRef.current += bonusPoints; saveProgress(); }
    }
};

const [showReviewModal, setShowReviewModal] = useState(false);
const [userRating, setUserRating] = useState(0);
const [hoverRating, setHoverRating] = useState(0);
const [reviewText, setReviewText] = useState("");
const [isSubmittingReview, setIsSubmittingReview] = useState(false);
const uniqueReviews = dedupeReviewsByUser(reviews || []).sort((a, b) => b.createdAt - a.createdAt);
const ratingStats = getBookRatingStats(reviews || []);

const handleSubmitReview = async () => {
    if (userRating === 0) return;
    setIsSubmittingReview(true);
    try {
        const allUsers = await db.users.toArray();
        const localUser = allUsers.find(u => u.id !== 'local-user' && u.id !== 'local-admin') || allUsers.find(u => u.id === 'local-user') || allUsers[0];
        const userId = getRemoteUserId(localUser);
        const resolvedUserId = userId || 'local-user';
        const createdAt = Date.now();
        const existingReview = await db.bookReviews.where('bookId').equals(bookIdNum).and((r) => r.userId === resolvedUserId).last();
        let localId = existingReview?.id;
        if (existingReview?.id) {
            await db.bookReviews.update(existingReview.id, { rating: userRating, reviewText, createdAt, synced: 0 });
        } else {
            localId = await db.bookReviews.add({ bookId: bookIdNum, userId: resolvedUserId, rating: userRating, reviewText, createdAt, synced: 0 });
        }
        const currentReviews = await db.bookReviews.where('bookId').equals(bookIdNum).toArray();
        const stats = getBookRatingStats(currentReviews);
        await db.books.update(bookIdNum, { avgRating: stats.averageRating, reviewCount: stats.reviewCount });
        await db.syncQueue.add({ type: 'SUBMIT_REVIEW', payload: { bookId: bookIdNum, userId: resolvedUserId, rating: userRating, reviewText, originalReviewId: localId }, createdAt: Date.now() });
        setShowReviewModal(false); setUserRating(0); setHoverRating(0); setReviewText("");
        alert(existingReview ? "Review updated!" : "Thanks for your rating!");
    } catch (e) { console.error(e); alert("Could not save review."); }
    finally { setIsSubmittingReview(false); }
};

useEffect(() => {
    const interval = setInterval(() => {
        const secs = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setDisplaySeconds(secs);
        if (secs > 0 && secs % 30 === 0) saveProgress();
    }, 1000);
    const vis = () => { if (document.visibilityState === 'hidden') saveProgress(); };
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', vis); saveProgress(true); };
}, [bookIdString]);

const handlePageChange = (newPage: number) => {
    const dur = (Date.now() - pageStartTimeRef.current) / 1000;
    const pts = Math.min(Math.floor(dur / 3), getMaxPointsForPage(currentPage));
    if (pts > 0) accumulatedPointsRef.current += pts;
    pageStartTimeRef.current = Date.now();
    setCurrentPage(newPage);
    currentPageRef.current = newPage;
};

const handleWordCount = (page: number, count: number) => { discoveredWordCountsRef.current[page] = count; };

const sessionLoggedRef = useRef(false);
const saveProgress = async (isFinal = false) => {
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
        const allUsers = await db.users.toArray();
        const localUser = allUsers.find(u => u.id !== 'local-user' && u.id !== 'local-admin') || allUsers.find(u => u.id === 'local-user') || allUsers[0];
        if (!localUser) return;

        const fresh = await db.users.get(localUser.id);
        const resolvedUserId = getRemoteUserId(localUser) || 'local-user';

        const isCompleted = mayHaveCompleted;
        let newlyCompleted = false;

        if (isCompleted) {
            const existingSessions = await db.readings.where({ bookId: bookIdString }).toArray();
            const alreadyCompleted = existingSessions.some(s => s.userId === resolvedUserId && (s as any).completed);
            if (!alreadyCompleted) {
                newlyCompleted = true;
            }
        }

        const newTotalPoints = (fresh?.totalPoints || 0) + totalSessionPoints;
        const newBooksRead = (localUser.booksRead || 0) + (newlyCompleted ? 1 : 0);

        await db.users.update(localUser.id, { 
            totalPoints: newTotalPoints,
            booksRead: newBooksRead
        });

        if (resolvedUserId !== 'local-user') { 
            const g = await db.users.get('local-user'); 
            if (g) {
                await db.users.update('local-user', { 
                    totalPoints: newTotalPoints,
                    booksRead: newBooksRead
                }); 
            }
        }

        // Save Word Counts map
        if (book && Object.keys(discoveredWordCountsRef.current).length > 0) {
            const updatedWordCounts = {
                ...(book.pageWordCounts || {}),
                ...discoveredWordCountsRef.current
            };
            await db.books.update(bookIdNum, {
                pageWordCounts: updatedWordCounts
            });
        }

        await db.syncQueue.add({ 
            type: 'UPDATE_POINTS', 
            payload: { 
                userId: resolvedUserId, 
                totalPoints: newTotalPoints,
                booksRead: newBooksRead
            }, 
            createdAt: now 
        });

        if (isFinal && !sessionLoggedRef.current) {
            const fallback: Record<number, string> = { 1: 'Sample Book', 2: 'Science Book', 3: 'Math Book', 4: 'History' };
            await db.syncQueue.add({ 
                type: 'READ_LOG', 
                payload: { 
                    userId: resolvedUserId, 
                    bookId: bookIdNum, 
                    bookTitle: fallback[bookIdNum] || book?.title || 'Unknown Book', 
                    startTime: startTimeRef.current, 
                    endTime: now, 
                    duration: totalDuration, 
                    pagesRead: finalPage, 
                    pointsEarned: totalSessionPoints,
                    completed: isCompleted
                }, 
                createdAt: now 
            });
            sessionLoggedRef.current = true;
            
            await db.readings.add({ 
                bookId: bookIdString, 
                userId: resolvedUserId, 
                startTime: startTimeRef.current, 
                endTime: now, 
                synced: 0,
                completed: isCompleted
            } as any);
        }

        console.log(`Saved! Earned ${totalSessionPoints} points.`);
    } catch (e) {
        console.error("Failed to save progress", e);
    }
};

const router = useRouter();
const handleBack = async () => { await saveProgress(); router.push('/dashboard'); };
const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

return (
    <div className="reader-shell relative overflow-hidden">
        {/* Background Graphics */}
        <div className="absolute inset-0 pointer-events-none">
            <Star className="absolute top-[10%] left-[5%] text-white/5 w-8 h-8 animate-float" />
            <Star className="absolute top-[40%] right-[8%] text-white/5 w-12 h-12 animate-float-delay" />
            <Star className="absolute bottom-[15%] left-[12%] text-white/5 w-6 h-6 animate-wiggle" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-10"
                style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(230,51,41,0.15) 0%, transparent 70%)' }} />
        </div>

        {/* ── BookQuest Header ──────────────────────────────────────── */}
        <header className="bookquest-header">
            {/* Back */}
            <button onClick={handleBack}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-black text-sm uppercase tracking-wide px-4 py-2 rounded-full border border-white/20 transition-all flex-shrink-0">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back to Library</span>
            </button>

            {/* BookQuest logo */}
            <div className="flex items-center gap-2 text-white">
                <div className="h-9 w-9 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center">
                    <BookOpen className="w-5 h-5" />
                </div>
                <span className="comic-title text-2xl text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">BookQuest</span>
            </div>

            {/* XP + actions */}
            <div className="flex items-center gap-2 flex-wrap justify-end">
                <span className="text-yellow-300 font-black text-sm uppercase tracking-wider hidden sm:inline">XP</span>
                <div className="xp-track w-20 sm:w-32">
                    <div className="xp-fill" style={{ width: `${xpPercent}%` }} />
                </div>
                <span className="text-yellow-300 font-black text-xs whitespace-nowrap">{currentXP}/{MAX_XP}</span>
                <button onClick={() => setShowReviewModal(true)}
                    className="flex items-center gap-1 bg-yellow-400 hover:bg-yellow-300 text-yellow-900 font-black text-xs uppercase px-3 py-2 rounded-full transition-all">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span className="hidden sm:inline">Rate</span>
                </button>
                {questions.length > 0 && (
                    <button onClick={() => setShowQuiz(true)}
                        className="flex items-center gap-1 bg-white/15 hover:bg-white/25 text-white font-black text-xs uppercase px-3 py-2 rounded-full border border-white/20 transition-all">
                        <Trophy className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Quiz</span>
                    </button>
                )}
                <div className="flex items-center gap-1 text-white/50 text-xs font-bold bg-white/10 px-2 py-1 rounded-full">
                    <Clock className="w-3 h-3" /> {fmt(displaySeconds)}
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
