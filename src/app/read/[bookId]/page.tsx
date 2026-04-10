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
    const [totalPages, setTotalPages] = useState(0);
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

    const handleOptionSelect = (opt: string, correct: string) => {
        setSelectedOption(opt);
        if (opt === correct) setScore(s => s + 1);
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
    };

    const handleWordCount = (page: number, count: number) => { discoveredWordCountsRef.current[page] = count; };

    const sessionLoggedRef = useRef(false);
    const saveProgress = async (isFinal = false) => {
        const now = Date.now();
        const dur = (now - pageStartTimeRef.current) / 1000;
        const pts = Math.min(Math.floor(dur / 3), getMaxPointsForPage(currentPage));
        const totalPts = accumulatedPointsRef.current + pts;
        const totalDur = Math.floor((now - startTimeRef.current) / 1000);
        if (totalPts === 0 && totalDur < 2) return;
        try {
            const allUsers = await db.users.toArray();
            const localUser = allUsers.find(u => u.id !== 'local-user' && u.id !== 'local-admin') || allUsers.find(u => u.id === 'local-user') || allUsers[0];
            if (!localUser) return;
            const fresh = await db.users.get(localUser.id);
            const newTotal = (fresh?.totalPoints || 0) + totalPts;
            const userId = getRemoteUserId(localUser);
            await db.users.update(localUser.id, { totalPoints: newTotal });
            if (userId !== 'local-user') { const g = await db.users.get('local-user'); if (g) await db.users.update('local-user', { totalPoints: newTotal }); }
            await db.syncQueue.add({ type: 'UPDATE_POINTS', payload: { userId: userId || 'local-user', totalPoints: newTotal }, createdAt: Date.now() });
            if (isFinal && !sessionLoggedRef.current) {
                const fallback: Record<number, string> = { 1: 'Sample Book', 2: 'Science Book', 3: 'Math Book', 4: 'History' };
                await db.syncQueue.add({ type: 'READ_LOG', payload: { userId: userId || 'local-user', bookId: bookIdNum, bookTitle: fallback[bookIdNum] || book?.title || 'Unknown', startTime: startTimeRef.current, endTime: now, duration: totalDur, pagesRead: currentPage, pointsEarned: totalPts }, createdAt: Date.now() });
                sessionLoggedRef.current = true;
                await db.readings.add({ bookId: bookIdString, userId: userId || 'local-user', startTime: startTimeRef.current, endTime: now, synced: 0 });
            }
        } catch (e) { console.error(e); }
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

            {/* ── Book Stage ────────────────────────────────────────────── */}
            <div className="book-stage">
                {/* Book title */}
                {book?.title && (
                    <div className="text-center">
                        <p className="text-white/50 text-xs font-black uppercase tracking-widest">{book.title}</p>
                    </div>
                )}

                {/* Book frame */}
                <div className="book-frame">
                    <div className="book-spine" />
                    <PdfReader url={pdfUrl} book={book} bookIdNum={bookIdNum} onPageChange={handlePageChange} onWordCount={handleWordCount} />
                </div>

                {/* Thumbnail strip */}
                {totalPages > 1 && (
                    <div className="w-full max-w-[900px]">
                        <p className="text-white/40 text-[10px] font-black uppercase tracking-widest text-center mb-2">Book Scroll</p>
                        <div className="thumb-strip">
                            {Array.from({ length: Math.min(totalPages, 25) }, (_, i) => i + 1).map(pg => (
                                <button key={pg} onClick={() => setCurrentPage(pg)} className={`thumb-item ${currentPage === pg ? 'active' : ''}`}>
                                    <span className="text-lg font-black block">{pg}</span>
                                    <span className="text-[9px] uppercase opacity-60 block">pg</span>
                                </button>
                            ))}
                            {totalPages > 25 && (
                                <div className="thumb-item opacity-40">
                                    <span className="text-xs font-black">+{totalPages - 25}</span>
                                </div>
                            )}
                        </div>
                        <p className="text-white/30 text-xs font-black text-center mt-2 uppercase tracking-wide">
                            Page {currentPage} of {totalPages}
                        </p>
                    </div>
                )}
            </div>

            {/* ── Reviews Section ───────────────────────────────────────── */}
            <section className="px-4 pb-12 max-w-4xl w-full self-center">
                <div className="card p-6 md:p-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-black text-[#111] flex items-center gap-2 uppercase tracking-wide">
                            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" /> Community Reviews
                        </h2>
                        <button onClick={() => setShowReviewModal(true)} className="btn-red px-5 py-2.5 text-xs">
                            Write a Review
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="card-flat bg-[#fff4ba] px-5 py-4">
                            <p className="text-[10px] uppercase tracking-widest font-black text-[#5f5852] mb-1">Avg Rating</p>
                            <div className="flex items-center gap-2">
                                <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
                                <span className="text-3xl font-black text-[#111]">{ratingStats.reviewCount > 0 ? ratingStats.averageRating.toFixed(1) : "N/A"}</span>
                                <span className="text-sm font-bold text-[#777]">/10</span>
                            </div>
                        </div>
                        <div className="card-flat bg-[#ffece5] px-5 py-4">
                            <p className="text-[10px] uppercase tracking-widest font-black text-[#5f5852] mb-1">Votes</p>
                            <div className="text-3xl font-black text-[#111]">{ratingStats.reviewCount}</div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {uniqueReviews.length > 0 ? uniqueReviews.map((rev, idx) => (
                            <div key={idx} className="card-flat bg-[#fffbf3] p-5">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-9 h-9 rounded-full border-[3px] border-[#111] bg-[#ffece5] flex items-center justify-center text-[#e63329] font-black text-xs shadow-[0_3px_0_#111]">
                                            {rev.userId.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-[#111]">{rev.userId === 'local-user' ? 'Me' : rev.userId}</p>
                                            <p className="text-[10px] text-[#999] font-bold">{new Date(rev.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <span className="chip chip-gold text-xs"><Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />{rev.rating}/10</span>
                                </div>
                                {rev.reviewText && <p className="text-sm font-bold text-[#3a3a3a] leading-relaxed mt-2">{rev.reviewText}</p>}
                            </div>
                        )) : (
                            <div className="card-flat bg-[#fffbf3] py-14 text-center">
                                <Star className="w-12 h-12 text-[#f2d7cd] mx-auto mb-3" />
                                <p className="font-black text-[#999] uppercase tracking-wide text-sm">No reviews yet — be the first!</p>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* ── Quiz Modal ────────────────────────────────────────────── */}
            {showQuiz && questions.length > 0 && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
                    <div className="comic-modal w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 flex justify-between items-center bg-[#e63329] border-b-[3px] border-[#111]">
                            <div className="font-black text-white flex items-center gap-2 text-lg uppercase tracking-wide">
                                <Trophy className="w-5 h-5" /> Book Quiz
                            </div>
                            <span className="chip bg-white/20 text-white border-white/30 text-xs">
                                {!quizCompleted ? `${currentQuestionIndex + 1}/${questions.length}` : 'Done!'}
                            </span>
                        </div>
                        {!quizCompleted ? (
                            <div className="p-6 overflow-y-auto">
                                <h3 className="text-xl font-black text-[#111] mb-6 leading-relaxed">{questions[currentQuestionIndex].question}</h3>
                                <div className="space-y-3">
                                    {questions[currentQuestionIndex].options?.map((opt: string, idx: number) => {
                                        const isSelected = selectedOption === opt;
                                        const isCorrectOpt = opt === questions[currentQuestionIndex].correctAnswer;
                                        let cls = "w-full text-left p-4 rounded-2xl border-[3px] border-[#111] font-bold transition-all shadow-[0_4px_0_#111] ";
                                        if (selectedOption) {
                                            if (isCorrectOpt) cls += "bg-[#edf8df] border-[#2f6a1d] text-[#2f6a1d] shadow-[0_4px_0_#2f6a1d]";
                                            else if (isSelected) cls += "bg-[#ffece5] border-[#e63329] text-[#e63329] shadow-[0_4px_0_#e63329]";
                                            else cls += "opacity-40 bg-white";
                                        } else { cls += "bg-white hover:bg-[#fff3ef] hover:border-[#e63329] text-[#111]"; }
                                        return (
                                            <button key={idx} disabled={!!selectedOption} onClick={() => handleOptionSelect(opt, questions[currentQuestionIndex].correctAnswer)} className={cls}>
                                                <div className="flex items-center justify-between">
                                                    <span>{opt}</span>
                                                    {selectedOption && isCorrectOpt && <CheckCircle2 className="w-5 h-5 text-[#2f6a1d]" />}
                                                    {selectedOption && isSelected && !isCorrectOpt && <XCircle className="w-5 h-5 text-[#e63329]" />}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                                {selectedOption && (
                                    <div className="mt-6 flex justify-end">
                                        <button onClick={handleNextQuestion} className="btn-red px-7 py-3 text-sm">
                                            {currentQuestionIndex < questions.length - 1 ? 'Next Question →' : 'Finish Quiz'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="p-8 flex flex-col items-center text-center">
                                <div className="w-20 h-20 rounded-full border-[4px] border-[#111] bg-[#fff4ba] flex items-center justify-center mb-5 shadow-[0_8px_0_#111]">
                                    <Trophy className="w-10 h-10 text-yellow-500 fill-yellow-400" />
                                </div>
                                <h2 className="comic-title text-3xl text-[#111] mb-2">Quiz Complete!</h2>
                                <p className="text-[#555] font-bold mb-5">You scored <span className="text-[#e63329] font-black">{score}</span> out of {questions.length}.</p>
                                <div className="chip chip-gold w-full py-4 justify-center text-xl font-black mb-6">
                                    <Plus className="w-5 h-5" /> +{score * 10} Bonus Points!
                                </div>
                                <button onClick={() => setShowQuiz(false)} className="btn-red w-full py-4 text-base">Back to Reading</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Review Modal ──────────────────────────────────────────── */}
            {showReviewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
                    <div className="comic-modal w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="bg-[#e63329] px-6 py-4 border-b-[3px] border-[#111]">
                            <h2 className="comic-title text-2xl text-white uppercase">Rate this Book!</h2>
                            <p className="text-white/75 font-bold text-sm">{book?.title}</p>
                        </div>
                        <div className="p-6">
                            <div className="flex justify-center gap-1 mb-4">
                                {[...Array(10)].map((_, i) => {
                                    const v = i + 1;
                                    const filled = v <= (hoverRating || userRating);
                                    return (
                                        <button key={i} onMouseEnter={() => setHoverRating(v)} onMouseLeave={() => setHoverRating(0)} onClick={() => setUserRating(v)} className="transition-transform active:scale-75">
                                            <Star className={`w-8 h-8 transition-colors ${filled ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-100 text-gray-200 hover:fill-yellow-200'}`} />
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="text-center mb-4 h-7">
                                {userRating > 0 && <span className="chip chip-gold px-4 py-1 inline-flex">{userRating} / 10</span>}
                            </div>
                            <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)}
                                placeholder="What did you learn? Did you like the story?"
                                className="comic-input min-h-[90px] resize-none text-sm mb-4" />
                            <div className="flex gap-3">
                                <button onClick={() => setShowReviewModal(false)} className="btn-outline flex-1 py-3 text-sm">Cancel</button>
                                <button disabled={userRating === 0 || isSubmittingReview} onClick={handleSubmitReview}
                                    className={`flex-[2] py-3 font-black uppercase text-sm rounded-full border-[3px] border-[#111] flex items-center justify-center gap-2 transition-all ${userRating > 0 ? 'btn-red' : 'bg-gray-200 text-gray-400 cursor-not-allowed border-gray-300 shadow-none'}`}>
                                    {isSubmittingReview ? 'Submitting...' : <><Star className="w-4 h-4 fill-white" /> Submit Rating</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
