"use client";

import { useState, useEffect, useRef } from 'react';
import { PdfReader, PdfScrollThumbnails } from '@/components/pdf-reader';
import { ArrowLeft, BookOpen, Trophy, CheckCircle2, XCircle, Plus, ChevronLeft, ChevronRight, Wifi, WifiOff, RefreshCw, Star } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/db';
import { useLiveQuery } from "dexie-react-hooks";
import { useSync } from '@/hooks/useSync';
import { supabase } from '@/lib/supabase';
import { onBookCompleted, AVATARS } from '@/lib/avatar';
import { AvatarStageImage } from '@/components/avatar-stage-image';

// Pure helper — defined outside component to avoid recreation on every render
function getRemoteUserId(user?: { id: string; student_id?: string }): string | null {
    return user?.student_id || (user?.id !== 'local-user' ? user?.id : null) || null;
}

// ─── Avatar Evolution Overlay ─────────────────────────────────────────────────
function AvatarEvolutionOverlay({ evolvedStage, onClose }: { evolvedStage: number | null; onClose: () => void }) {
    const users = useLiveQuery(() => db.users.toArray()) || [];
    const user  = users.find(u => u.id !== 'local-user' && u.id !== 'local-admin')
               || users.find(u => u.id === 'local-user')
               || users[0];

    if (evolvedStage === null || !user?.avatarBaseId) return null;

    const avatarDef = AVATARS.find(a => a.id === user.avatarBaseId);
    const prevStage = Math.max(0, evolvedStage - 1);
    const stageName = avatarDef?.stageNames[evolvedStage] ?? `Stage ${evolvedStage}`;
    const prevName  = avatarDef?.stageNames[prevStage]   ?? `Stage ${prevStage}`;
    const color     = avatarDef?.color ?? '#db3125';
    const bgColor   = avatarDef?.bgColor ?? '#fff0ec';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <div className="comic-modal w-full max-w-sm overflow-hidden text-center">

                {/* Header */}
                <div className="px-6 py-4 flex justify-center items-center gap-2"
                    style={{ background: color, borderBottom: '3px solid #111' }}>
                    <Star className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                    <span className="font-black text-white text-lg uppercase tracking-wide">
                        Avatar Evolved!
                    </span>
                    <Star className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                </div>

                {/* Body */}
                <div className="flex flex-col items-center gap-5 bg-white px-6 pb-7 pt-6">
                    <p className="text-sm font-black uppercase tracking-widest text-[#777]">
                        Your {avatarDef?.name ?? 'Avatar'} levelled up!
                    </p>
                    <p className="text-4xl font-black leading-none" style={{ color }}>
                        {stageName}
                    </p>

                    {/* Before → After using real images */}
                    <div className="flex items-center gap-5">
                        {/* Previous stage */}
                        <div className="flex flex-col items-center gap-1.5">
                            <AvatarStageImage
                                avatarBaseId={user.avatarBaseId}
                                stage={prevStage}
                                size={72}
                                style={{
                                    border: '3px solid #ddd',
                                    opacity: 0.55,
                                }}
                            />
                            <span className="text-[10px] font-bold text-[#aaa] uppercase">{prevName}</span>
                        </div>

                        {/* Arrow */}
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-3xl animate-bounce">→</span>
                        </div>

                        {/* New stage — larger, glowing */}
                        <div className="flex flex-col items-center gap-1.5">
                            <AvatarStageImage
                                avatarBaseId={user.avatarBaseId}
                                stage={evolvedStage}
                                size={96}
                                style={{
                                    border: `4px solid ${color}`,
                                    boxShadow: `0 0 0 4px ${color}44, 0 8px 24px ${color}55`,
                                }}
                            />
                            <span className="text-xs font-black uppercase" style={{ color }}>{stageName}</span>
                        </div>
                    </div>

                    {/* Full evolution strip */}
                    <div className="w-full rounded-2xl overflow-hidden border-[2px] border-[#eee]"
                        style={{ backgroundColor: bgColor }}>
                        <div className="flex items-center divide-x-2 divide-[#eee]">
                            {(avatarDef?.stageNames ?? []).map((name, i) => (
                                <div key={i} className="flex flex-1 flex-col items-center gap-1 py-2">
                                    <AvatarStageImage
                                        avatarBaseId={user.avatarBaseId!}
                                        stage={i}
                                        size={36}
                                        style={{
                                            border: i === evolvedStage
                                                ? `2px solid ${color}`
                                                : i < evolvedStage
                                                ? '2px solid #bbb'
                                                : '2px solid #ddd',
                                            opacity: i <= evolvedStage ? 1 : 0.35,
                                        }}
                                    />
                                    <span className="text-[8px] font-bold leading-tight text-center px-0.5"
                                        style={{ color: i === evolvedStage ? color : '#888' }}>
                                        {name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <p className="text-sm font-bold text-[#666]">
                        Keep reading to power up even more!
                    </p>

                    <button onClick={onClose}
                        className="w-full rounded-2xl border-[3px] border-[#111] py-4 text-base font-black text-white shadow-[0_5px_0_#111] active:translate-y-1 active:shadow-none transition-all"
                        style={{ background: color }}>
                        Continue Reading →
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ReadPage() {

    const params = useParams();
    const bookIdString = typeof params.bookId === 'string' ? params.bookId : '1';
    const bookIdNum = parseInt(bookIdString);

    const book = useLiveQuery(() => db.books.get(bookIdNum), [bookIdNum]);
    const pdfUrl = book?.pdfUrl || '/sample.pdf';
    const { isOnline, isSyncing, syncQueueCount } = useSync();

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    // Refs so stale closures always read the latest values
    const currentPageRef = useRef(1);
    const totalPagesRef = useRef(0);
    useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);
    useEffect(() => { totalPagesRef.current = totalPages; }, [totalPages]);

    const pageStartTimeRef = useRef(Date.now());
    const accumulatedPointsRef = useRef(0);
    const discoveredWordCountsRef = useRef<Record<number, number>>({});
    // Tracks total points already awarded per page — prevents re-awarding on revisit
    const pagePointsEarnedRef = useRef<Record<number, number>>({});
    const startTimeRef = useRef(Date.now());
    const [displaySeconds, setDisplaySeconds] = useState(0);

    const MAX_XP = 500;
    const currentXP = Math.min(Math.floor(displaySeconds / 2) + accumulatedPointsRef.current * 2, MAX_XP);
    const xpPercent = Math.min((currentXP / MAX_XP) * 100, 100);

    // On mount, fetch the latest questions from Supabase and update Dexie.
    // This ensures students see quizzes generated by the admin background worker
    // even if syncLibrary() was never called on this device.
    useEffect(() => {
        if (!bookIdNum || isNaN(bookIdNum) || !supabase) return;
        (async () => {
            try {
                const { data } = await supabase
                    .from('books')
                    .select('questions')
                    .eq('id', bookIdNum)
                    .single();
                const serverQ: any[] = data?.questions || [];
                if (serverQ.length === 0) return;
                const local = await db.books.get(bookIdNum);
                if (!local?.questions?.length) {
                    await db.books.update(bookIdNum, { questions: serverQ });
                }
            } catch { /* offline — Dexie is the source of truth */ }
        })();
    }, [bookIdNum]); // eslint-disable-line react-hooks/exhaustive-deps

    const questions = book?.questions || [];
    const [showQuiz, setShowQuiz] = useState(false);
    const [showNoQuiz, setShowNoQuiz] = useState(false);

    const openQuiz = () => {
        quizAnswersRef.current = [];
        setCurrentQuestionIndex(0);
        setScore(0);
        setQuizCompleted(false);
        setSelectedOption(null);
        setShowQuiz(true);
    };

    useEffect(() => {
        if (window.location.hash !== '#quiz') return;
        if (questions?.length > 0) {
            openQuiz();
        } else if (book) {
            setShowNoQuiz(true);
        }
    }, [questions?.length, book?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [quizCompleted, setQuizCompleted] = useState(false);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    // Track per-answer details for saving to quizAttempts
    const quizAnswersRef = useRef<{ questionIndex: number; selected: string; correct: boolean }[]>([]);

    const handleOptionSelect = (opt: string, correct: string) => {
        setSelectedOption(opt);
        const isCorrect = opt === correct;
        if (isCorrect) setScore(s => s + 1);
        quizAnswersRef.current = [
            ...quizAnswersRef.current,
            { questionIndex: currentQuestionIndex, selected: opt, correct: isCorrect }
        ];
    };

    // ─── Point system ───────────────────────────────────────
    // Average reading speed for target age group: ~150 WPM = 2.5 words/sec
    const READING_SPEED_WPS = 2.5;

    const getPageWordCount = (page: number) =>
        discoveredWordCountsRef.current[page] ?? book?.pageWordCounts?.[page];

    // Max points per page: 1pt per 30 words, min 1, hard AFK cap at 15
    const getMaxPointsForPage = (page: number) => {
        const wc = getPageWordCount(page);
        if (wc === undefined) return 5;
        return Math.max(1, Math.min(15, Math.floor(wc / 30)));
    };

    // Minimum time to read a page at normal reading speed
    const getMinReadTimeForPage = (page: number) => {
        const wc = getPageWordCount(page);
        if (wc === undefined) return 15;
        return Math.ceil(wc / READING_SPEED_WPS);
    };

    // Proportional: partial credit if < min time, full if >= min time.
    // Capped by remaining points for the page — revisiting a fully-rewarded page gives 0.
    const getPointsForPageTime = (page: number, timeSpentSeconds: number) => {
        const maxPts = getMaxPointsForPage(page);
        const alreadyEarned = pagePointsEarnedRef.current[page] || 0;
        const remainingPts = maxPts - alreadyEarned;
        if (remainingPts <= 0) return 0;

        const minTime = getMinReadTimeForPage(page);
        const earned = timeSpentSeconds >= minTime
            ? maxPts
            : Math.floor((timeSpentSeconds / minTime) * maxPts);

        return Math.min(earned, remainingPts);
    };

    // ─── Save progress ──────────────────────────────────────
    const sessionLoggedRef = useRef(false);
    // Tracks whether the student has reached the last third of the book
    const bookCompletedRef = useRef(false);

    // A book is flagged as completed once the reader reaches the last third (page ≥ ⌈totalPages × 2/3⌉)
    useEffect(() => {
        if (totalPages > 0 && currentPage >= Math.ceil(totalPages * 2 / 3)) {
            bookCompletedRef.current = true;
        }
    }, [currentPage, totalPages]);

    const saveProgress = async (isFinal = false) => {
        const pg = currentPageRef.current;
        const now = Date.now();
        const dur = (now - pageStartTimeRef.current) / 1000;
        const pts = getPointsForPageTime(pg, dur);
        // Record points earned for this page so revisits don't re-award them
        if (pts > 0) {
            pagePointsEarnedRef.current[pg] = (pagePointsEarnedRef.current[pg] || 0) + pts;
        }
        const totalPts = accumulatedPointsRef.current + pts;
        const totalDur = Math.floor((now - startTimeRef.current) / 1000);
        if (totalPts === 0 && totalDur < 2) return;
        // Reset before async to prevent double-counting on overlapping saves
        accumulatedPointsRef.current = 0;
        pageStartTimeRef.current = Date.now();
        try {
            const allUsers = await db.users.toArray();
            const localUser =
                allUsers.find(u => u.id !== 'local-user' && u.id !== 'local-admin') ||
                allUsers.find(u => u.id === 'local-user') ||
                allUsers[0];
            if (!localUser) return;
            const fresh = await db.users.get(localUser.id);
            const newTotal = (fresh?.totalPoints || 0) + totalPts;
            const userId = getRemoteUserId(localUser);
            await db.users.update(localUser.id, { totalPoints: newTotal });
            if (userId !== 'local-user') {
                const g = await db.users.get('local-user');
                if (g) await db.users.update('local-user', { totalPoints: newTotal });
            }
            // BUG-04 FIX: Only queue sync tasks for registered users — guests never sync to Supabase.
            // BUG-06 FIX: Store pointsDelta (additive) not totalPoints (absolute) to avoid last-write-wins.
            const GUEST_IDS = ['local-user', 'local-admin'];
            if (userId && !GUEST_IDS.includes(userId) && totalPts > 0) {
                await db.syncQueue.add({ type: 'UPDATE_POINTS', payload: { userId, pointsDelta: totalPts }, createdAt: Date.now() });
            }
            if (isFinal && !sessionLoggedRef.current) {
                const fallback: Record<number, string> = { 1: 'Sample Book', 2: 'Science Book', 3: 'Math Book', 4: 'History' };
                // completed = true when student reached the last third of the book
                const isCompleted = bookCompletedRef.current;
                await db.syncQueue.add({
                    type: 'READ_LOG',
                    payload: { userId: userId || 'local-user', bookId: bookIdNum, bookTitle: book?.title || fallback[bookIdNum] || 'Unknown', startTime: startTimeRef.current, endTime: now, duration: totalDur, pagesRead: pg, pointsEarned: totalPts, completed: isCompleted },
                    createdAt: Date.now(),
                });
                sessionLoggedRef.current = true;
                await db.readings.add({ bookId: bookIdString, userId: userId || 'local-user', startTime: startTimeRef.current, endTime: now, synced: 0 });
            }
        } catch (e) { console.error("Save Progress Error:", e); }
    };

    // Always-fresh ref so the mount-time effect never calls a stale saveProgress
    const saveProgressRef = useRef(saveProgress);
    useEffect(() => { saveProgressRef.current = saveProgress; });

    useEffect(() => {
        const interval = setInterval(() => {
            const secs = Math.floor((Date.now() - startTimeRef.current) / 1000);
            setDisplaySeconds(secs);
            if (secs > 0 && secs % 30 === 0) saveProgressRef.current();
        }, 1000);
        const vis = () => { if (document.visibilityState === 'hidden') saveProgressRef.current(); };
        document.addEventListener('visibilitychange', vis);
        return () => { clearInterval(interval); document.removeEventListener('visibilitychange', vis); saveProgressRef.current(true); };
    }, [bookIdString]);

    // ─── Navigation ─────────────────────────────────────────
    const goToPage = (newPage: number) => {
        const tp = totalPagesRef.current;
        if (newPage < 1 || (tp > 0 && newPage > tp)) return;
        const dur = (Date.now() - pageStartTimeRef.current) / 1000;
        const pts = getPointsForPageTime(currentPage, dur);
        if (pts > 0) {
            accumulatedPointsRef.current += pts;
            // Record so this page can't be re-awarded beyond its max on revisit
            pagePointsEarnedRef.current[currentPage] = (pagePointsEarnedRef.current[currentPage] || 0) + pts;
        }
        pageStartTimeRef.current = Date.now();
        setCurrentPage(newPage);
    };

    const handleWordCount = (page: number, count: number) => {
        discoveredWordCountsRef.current[page] = count;
    };

    const handleNextQuestion = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(i => i + 1);
            setSelectedOption(null);
        } else {
            setQuizCompleted(true);
            const bonusPoints = score * 10;
            if (bonusPoints > 0) {
                accumulatedPointsRef.current += bonusPoints;
                // BUG-02 FIX: pass isFinal=true so READ_LOG is queued for this session
                saveProgressRef.current(true);
            }
            // Save quiz attempt offline and queue sync
            (async () => {
                try {
                    const allUsers = await db.users.toArray();
                    const localUser =
                        allUsers.find(u => u.id !== 'local-user' && u.id !== 'local-admin') ||
                        allUsers.find(u => u.id === 'local-user') ||
                        allUsers[0];
                    if (!localUser) return;
                    const userId = getRemoteUserId(localUser);
                    const completedAt = Date.now();
                    const localAttemptId = await db.quizAttempts.add({
                        bookId: bookIdNum,
                        userId: userId || 'local-user',
                        score,
                        totalQuestions: questions.length,
                        answers: quizAnswersRef.current,
                        completedAt,
                        synced: 0,
                    });
                    const GUEST_IDS = ['local-user', 'local-admin'];
                    if (userId && !GUEST_IDS.includes(userId)) {
                        await db.syncQueue.add({
                            type: 'SUBMIT_QUIZ',
                            payload: {
                                bookId: bookIdNum,
                                userId,
                                score,
                                totalQuestions: questions.length,
                                answers: quizAnswersRef.current,
                                completedAt,
                                localAttemptId,
                            },
                            createdAt: Date.now(),
                        });
                    }
                } catch (e) {
                    console.error('Failed to save quiz attempt:', e);
                }
            })();
        }
    };

    const router = useRouter();
    const handleBack = async () => { await saveProgressRef.current(true); router.push('/dashboard'); };

    const atLastPage = totalPages > 0 && currentPage >= totalPages;

    // ─── Avatar Evolution ──────────────────────────────────────
    const bookCompletionFiredRef = useRef(false);
    const [evolvedStage, setEvolvedStage] = useState<number | null>(null);

    useEffect(() => {
        if (!atLastPage || bookCompletionFiredRef.current) return;
        bookCompletionFiredRef.current = true;

        (async () => {
            const allUsers = await db.users.toArray();
            const localUser =
                allUsers.find(u => u.id !== 'local-user' && u.id !== 'local-admin') ||
                allUsers.find(u => u.id === 'local-user') ||
                allUsers[0];
            if (!localUser) return;

            const evolved = await onBookCompleted(localUser.id);
            if (evolved !== null) setEvolvedStage(evolved);
        })();
    }, [atLastPage]);

    return (
        <div className="h-screen w-full flex flex-col overflow-hidden"
            style={{ backgroundColor: '#2e2e2e', backgroundImage: 'url(/reader-bg.png)', backgroundSize: '600px 600px', backgroundRepeat: 'repeat' }}>

            {/* ─── HEADER ─── */}
            <header className="relative z-50 flex-shrink-0 h-14 flex items-center justify-between px-5"
                style={{ background: 'linear-gradient(180deg, #d9342a 0%, #b82520 100%)', boxShadow: '0 3px 16px rgba(0,0,0,0.4)' }}>

                {/* Left: Back + Quiz button */}
                <div className="flex items-center gap-2">
                    <button onClick={handleBack}
                        className="flex items-center gap-2 text-white font-bold text-xs px-4 py-2 rounded-lg transition-all hover:bg-white/10 active:scale-95"
                        style={{ background: 'rgba(0,0,0,0.25)' }}>
                        <ArrowLeft className="w-4 h-4" />
                        Library
                    </button>
                    {questions.length > 0 && (
                        <button
                            onClick={() => { quizAnswersRef.current = []; setCurrentQuestionIndex(0); setScore(0); setQuizCompleted(false); setSelectedOption(null); setShowQuiz(true); }}
                            className="flex items-center gap-1.5 text-white font-black text-xs px-3 py-2 rounded-lg transition-all hover:scale-105 active:scale-95"
                            style={{ background: 'rgba(0,0,0,0.35)', border: '2px solid rgba(255,215,0,0.5)' }}
                            title="Take the quiz for this book"
                        >
                            <Trophy className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
                            <span className="text-yellow-200">Quiz</span>
                        </button>
                    )}
                </div>

                {/* Centre: Book title + logo */}
                <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-md" style={{ transform: 'rotate(-3deg)' }}>
                        <BookOpen className="w-5 h-5 text-[#d9342a]" />
                    </div>
                    <span className="comic-title text-xl text-white tracking-wider drop-shadow-md">BookQuest</span>
                </div>

                {/* Right: sync status + XP bar */}
                <div className="flex flex-col items-end gap-0.5">
                    {/* GAP-01: Sync status indicator */}
                    <div className="flex items-center gap-1 mb-0.5">
                        {!isOnline ? (
                            <span className="flex items-center gap-1 text-[9px] font-bold text-yellow-300/90 uppercase tracking-wide">
                                <WifiOff className="w-3 h-3" /> Offline
                            </span>
                        ) : isSyncing ? (
                            <span className="flex items-center gap-1 text-[9px] font-bold text-white/70 uppercase tracking-wide">
                                <RefreshCw className="w-3 h-3 animate-spin" /> Syncing…
                            </span>
                        ) : syncQueueCount > 0 ? (
                            <span className="flex items-center gap-1 text-[9px] font-bold text-white/50 uppercase tracking-wide">
                                <Wifi className="w-3 h-3" /> {syncQueueCount} pending
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 text-[9px] font-bold text-green-300/70 uppercase tracking-wide">
                                <Wifi className="w-3 h-3" /> Saved
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center border-[3px] flex-shrink-0"
                            style={{ background: '#b82520', borderColor: '#fbbf24' }}>
                            <span className="text-white font-black text-[8px]">XP</span>
                        </div>
                        <div className="h-5 w-36 rounded-full overflow-hidden"
                            style={{ background: 'rgba(0,0,0,0.35)', border: '2px solid rgba(255,255,255,0.15)' }}>
                            <div className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${Math.max(xpPercent, 3)}%`, background: 'linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b)', boxShadow: '0 0 8px rgba(251,191,36,0.5)' }} />
                        </div>
                    </div>
                    <span className="text-white/60 text-[9px] font-bold">{currentXP}/{MAX_XP} XP</span>
                </div>
            </header>

            {/* ─── MAIN ─── */}
            <main className="relative z-10 flex-1 flex flex-col overflow-hidden px-4 pt-4 pb-3 gap-3">

                {/* ── Book + side arrows ── */}
                <div className="flex-1 min-h-0 flex items-stretch justify-center gap-3">

                    {/* Prev arrow */}
                    <div className="flex items-center">
                        <button
                            onClick={() => goToPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage <= 1}
                            className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 disabled:opacity-20 shadow-2xl"
                            style={{ background: 'rgba(0,0,0,0.5)', border: '2px solid rgba(255,255,255,0.12)', color: 'white' }}>
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Book frame */}
                    <div className="flex-1 min-w-0 h-full relative"
                        style={{
                            background: 'linear-gradient(165deg, #c0352b 0%, #8c2019 45%, #6b1812 100%)',
                            borderRadius: '6px 16px 16px 6px',
                            padding: '10px 14px 10px 22px',
                            boxShadow: '0 24px 64px rgba(0,0,0,0.65), 0 8px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
                        }}>

                        {/* Spine */}
                        <div className="absolute top-0 bottom-0 left-0 w-[18px] z-20 pointer-events-none"
                            style={{ background: 'linear-gradient(90deg, #3d0d0a 0%, #5e1510 40%, #7a1c14 70%, transparent 100%)', borderRadius: '6px 0 0 6px', boxShadow: '3px 0 10px rgba(0,0,0,0.4)' }} />
                        {/* Spine highlight lines */}
                        <div className="absolute top-8 bottom-8 left-[6px] w-px z-20 pointer-events-none" style={{ background: 'rgba(255,255,255,0.07)' }} />
                        <div className="absolute top-8 bottom-8 left-[10px] w-px z-20 pointer-events-none" style={{ background: 'rgba(255,255,255,0.04)' }} />
                        {/* Top sheen */}
                        <div className="absolute top-0 left-5 right-3 h-px z-10" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12) 30%, rgba(255,255,255,0.12) 70%, transparent)' }} />

                        {/* Page area */}
                        <div className="w-full h-full overflow-hidden relative"
                            style={{ background: '#faf6ed', borderRadius: '3px 10px 10px 3px', boxShadow: 'inset 8px 0 20px rgba(0,0,0,0.08), inset 0 2px 6px rgba(0,0,0,0.04), inset 0 -2px 4px rgba(0,0,0,0.03)' }}>
                            {/* Left gutter shadow */}
                            <div className="absolute inset-y-0 left-0 w-8 z-10 pointer-events-none" style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.09), transparent)' }} />
                            {/* Top/right subtle shadows */}
                            <div className="absolute top-0 left-0 right-0 h-5 z-10 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.05), transparent)' }} />
                            <div className="absolute inset-y-0 right-0 w-4 z-10 pointer-events-none" style={{ background: 'linear-gradient(-90deg, rgba(0,0,0,0.04), transparent)' }} />

                            <PdfReader
                                url={pdfUrl}
                                book={book}
                                bookIdNum={bookIdNum}
                                pageNumber={currentPage}
                                twoPageView={false}
                                onNumPagesChange={setTotalPages}
                                onWordCount={handleWordCount}
                            />
                        </div>

                        {/* Page stack — bottom */}
                        <div className="absolute bottom-[4px] left-[22px] right-[10px] h-[4px] rounded-b z-0 pointer-events-none"
                            style={{ background: '#eee8d9', boxShadow: '0 2px 0 #e6dece, 0 4px 0 #ddd6c4, 0 6px 0 #d4ccb9' }} />
                        {/* Page stack — right */}
                        <div className="absolute top-[14px] bottom-[18px] right-[4px] w-[3px] rounded-r z-0 pointer-events-none"
                            style={{ background: '#eee8d9', boxShadow: '2px 0 0 #e6dece, 4px 0 0 #ddd6c4' }} />

                        {/* Page number badge */}
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
                            style={{ background: 'rgba(0,0,0,0.12)', borderRadius: '999px', padding: '2px 10px' }}>
                            <span className="text-[10px] font-bold text-black/30 tracking-widest select-none">
                                {currentPage} / {totalPages || '—'}
                            </span>
                        </div>
                    </div>

                    {/* Next arrow */}
                    <div className="flex items-center">
                        <button
                            onClick={() => goToPage(Math.min(totalPages || 9999, currentPage + 1))}
                            disabled={atLastPage}
                            className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 disabled:opacity-20 shadow-2xl"
                            style={{ background: 'rgba(0,0,0,0.5)', border: '2px solid rgba(255,255,255,0.12)', color: 'white' }}>
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* ── Book Scroll strip ── */}
                <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
                    <div className="w-full rounded-2xl px-3 py-2"
                        style={{ background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="overflow-x-auto flex justify-center" style={{ scrollbarWidth: 'none' }}>
                            <PdfScrollThumbnails
                                url={pdfUrl}
                                book={book}
                                numPages={totalPages}
                                activePage={currentPage}
                                onPageClick={(pg) => goToPage(pg)}
                            />
                        </div>
                    </div>
                    <p className="text-white/35 font-bold text-[10px] tracking-widest uppercase">
                        Page <span className="text-white/65">{currentPage}</span> of {totalPages || '?'}
                    </p>
                </div>
            </main>

            {/* ── Quiz prompt banner — shown at last page if quiz is ready ── */}
            {atLastPage && questions.length > 0 && !showQuiz && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl"
                    style={{ background: 'linear-gradient(90deg, #e63329, #f59e0b)', border: '3px solid #111', minWidth: 260 }}>
                    <Trophy className="w-5 h-5 text-white flex-shrink-0 fill-yellow-300" />
                    <span className="text-white font-black text-sm flex-1">Quiz available!</span>
                    <button
                        onClick={openQuiz}
                        className="px-4 py-2 rounded-xl font-black text-sm text-[#111] shadow-[0_3px_0_#111] active:translate-y-px active:shadow-none transition-all"
                        style={{ background: '#fff4ba' }}>
                        Start Quiz
                    </button>
                </div>
            )}

            {/* ── Avatar Evolution Celebration ── */}
            <AvatarEvolutionOverlay evolvedStage={evolvedStage} onClose={() => setEvolvedStage(null)} />

            {/* ── Quiz Not Ready Yet ── */}
            {showNoQuiz && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
                    <div className="comic-modal w-full max-w-sm overflow-hidden">
                        <div className="px-6 py-4 flex items-center gap-2 bg-[#e63329] border-b-[3px] border-[#111]">
                            <Trophy className="w-5 h-5 text-white" />
                            <span className="font-black text-white text-lg uppercase tracking-wide">Quiz</span>
                        </div>
                        <div className="p-8 flex flex-col items-center gap-4 bg-white text-center">
                            <div className="w-16 h-16 rounded-full bg-[#fff4ba] border-[3px] border-[#111] flex items-center justify-center">
                                <Trophy className="w-8 h-8 text-yellow-500" />
                            </div>
                            <p className="font-black text-[#111] text-lg">Quiz Coming Soon!</p>
                            <p className="text-sm text-[#777]">The quiz for this book is being prepared by our team. Check back shortly.</p>
                            <button onClick={() => setShowNoQuiz(false)} className="btn-red px-8 py-3 text-sm w-full">Got it</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Quiz Modal ── */}
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
                                        const isCorrect = opt === questions[currentQuestionIndex].correctAnswer;
                                        let cls = "w-full text-left p-4 rounded-2xl border-[3px] border-[#111] font-bold transition-all shadow-[0_4px_0_#111] ";
                                        if (selectedOption) {
                                            if (isCorrect) cls += "bg-[#edf8df] border-[#2f6a1d] text-[#2f6a1d] shadow-[0_4px_0_#2f6a1d]";
                                            else if (isSelected) cls += "bg-[#ffece5] border-[#e63329] text-[#e63329] shadow-[0_4px_0_#e63329]";
                                            else cls += "opacity-40 bg-white";
                                        } else { cls += "bg-white hover:bg-[#fff3ef] hover:border-[#e63329] text-[#111]"; }
                                        return (
                                            <button key={idx} disabled={!!selectedOption} onClick={() => handleOptionSelect(opt, questions[currentQuestionIndex].correctAnswer)} className={cls}>
                                                <div className="flex items-center justify-between">
                                                    <span>{opt}</span>
                                                    {selectedOption && isCorrect && <CheckCircle2 className="w-5 h-5 text-[#2f6a1d]" />}
                                                    {selectedOption && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-[#e63329]" />}
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
        </div>
    );
}
