"use client";

import { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Loader2, Star, BookOpen, Crown, Medal } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/hooks/useUser';
import { getThumbnailUrl, extractFileId } from '@/lib/google-drive';
import { getBookRatingStats, getImdbWeightedRating } from '@/lib/book-ratings';

interface LeaderboardUser {
    id: string;
    name: string;
    totalPoints: number;
    streak?: number;
    rank?: number;
}

interface LeaderboardBook {
    id: number;
    title: string;
    coverUrl?: string;
    avg_rating: number;
    review_count: number;
    weighted_rating: number;
}

interface BooksReadEntry {
    userId: string;
    name: string;
    booksRead: number;
    rank?: number;
}

// Reader title badges by rank
const RANK_BADGES = [
    { label: "Book Wizard", color: "#f59e0b", bg: "#fff4ba", emoji: "🧙" },
    { label: "Story Master", color: "#22c55e", bg: "#d1fae5", emoji: "📚" },
    { label: "Page Turner", color: "#3b82f6", bg: "#dbeafe", emoji: "📖" },
    { label: "Bookworm", color: "#e63329", bg: "#ffece5", emoji: "🐛" },
    { label: "Novel Explorer", color: "#8b5cf6", bg: "#ede9fe", emoji: "🔭" },
    { label: "Reading Champ", color: "#ec4899", bg: "#fce7f3", emoji: "🏆" },
    { label: "Word Whiz", color: "#14b8a6", bg: "#ccfbf1", emoji: "✨" },
];

// Avatar SVG characters (inline, unique per rank)
function PodiumAvatar({ rank, name }: { rank: number; name: string }) {
    const palette = [
        { head: "#fbbf24", hair: "#92400e", shirt: "#7c3aed" },
        { head: "#fca5a5", hair: "#7f1d1d", shirt: "#15803d" },
        { head: "#fde68a", hair: "#1c1917", shirt: "#f97316" },
    ];
    const p = palette[(rank - 1) % palette.length];
    const initials = name.substring(0, 2).toUpperCase();
    return (
        <div className="relative">
            <svg width="80" height="96" viewBox="0 0 80 96" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Body */}
                <ellipse cx="40" cy="74" rx="22" ry="18" fill={p.shirt} stroke="#111" strokeWidth="2.5" />
                {/* Head */}
                <circle cx="40" cy="44" r="22" fill={p.head} stroke="#111" strokeWidth="2.5" />
                {/* Hair */}
                <ellipse cx="40" cy="28" rx="22" ry="10" fill={p.hair} />
                {/* Eyes */}
                <circle cx="33" cy="43" r="4" fill="white" stroke="#111" strokeWidth="1.5" />
                <circle cx="47" cy="43" r="4" fill="white" stroke="#111" strokeWidth="1.5" />
                <circle cx="34" cy="44" r="2" fill="#111" />
                <circle cx="48" cy="44" r="2" fill="#111" />
                {/* Smile */}
                <path d="M33 55 Q40 62 47 55" stroke="#111" strokeWidth="2" strokeLinecap="round" fill="none" />
                {/* Arms */}
                <ellipse cx="18" cy="78" rx="8" ry="6" fill={p.shirt} stroke="#111" strokeWidth="2" transform="rotate(-20 18 78)" />
                <ellipse cx="62" cy="78" rx="8" ry="6" fill={p.shirt} stroke="#111" strokeWidth="2" transform="rotate(20 62 78)" />
                {/* Belt line */}
                <line x1="18" y1="72" x2="62" y2="72" stroke="#111" strokeWidth="1.5" strokeDasharray="3,3" />
                {/* Feet */}
                <ellipse cx="32" cy="92" rx="9" ry="5" fill="#111" />
                <ellipse cx="48" cy="92" rx="9" ry="5" fill="#111" />
            </svg>
            {/* Rank 1 gets a special trophy */}
            {rank === 1 && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2">
                    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                        <path d="M18 2L22 12H33L24 18L27 29L18 23L9 29L12 18L3 12H14L18 2Z" fill="#f59e0b" stroke="#111" strokeWidth="2" />
                    </svg>
                </div>
            )}
            {/* Initials circle */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0">
                <span className="text-white font-black text-sm">{initials}</span>
            </div>
        </div>
    );
}

export default function LeaderboardPage() {
    const { user: currentUser } = useUser();
    const [activeTab, setActiveTab] = useState<'students' | 'books' | 'booksRead'>('students');
    const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
    const [topBooks, setTopBooks] = useState<LeaderboardBook[]>([]);
    const [booksRead, setBooksRead] = useState<BooksReadEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const fetchLeaderboard = async (isBackground = false) => {
            if (!supabase) return;
            if (!isBackground) setLoading(true);
            try {
                const { data, error } = await supabase.from('users').select('id, name, totalPoints, streak, last_points_date').order('totalPoints', { ascending: false });
                if (error) throw error;
                if (data && mounted) {
                    const now = new Date();
                    const today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
                    const yesterdayObj = new Date(now.getTime() - 86400000 - now.getTimezoneOffset() * 60000);
                    const yesterday = yesterdayObj.toISOString().split('T')[0];

                    setLeaderboard(data.map((u, i) => {
                        let effStreak = u.streak || 0;
                        if (effStreak > 0 && u.last_points_date !== today && u.last_points_date !== yesterday) {
                            effStreak = 0;
                        }
                        return { id: u.id, name: u.name || 'Anonymous', totalPoints: u.totalPoints || 0, streak: effStreak, rank: i + 1 };
                    }));
                }
                const { data: booksData } = await supabase.from('books').select('id, title, "coverUrl", avg_rating, review_count');
                const { data: reviewsData } = await supabase.from('book_reviews').select('book_id, user_id, rating, created_at');
                // ── Books Read leaderboard ──────────────────────────────
                const { data: sessionsData } = await supabase
                    .from('reading_sessions')
                    .select('user_id, book_id')
                    .eq('completed', true);
                if (sessionsData && mounted) {
                    // Count unique books per user
                    const booksByUser = new Map<string, Set<string>>();
                    for (const s of sessionsData) {
                        if (!booksByUser.has(s.user_id)) booksByUser.set(s.user_id, new Set());
                        booksByUser.get(s.user_id)!.add(String(s.book_id));
                    }
                    // Build display list joined with user names
                    const { data: usersForBooks } = await supabase
                        .from('users')
                        .select('id, name')
                        .in('id', Array.from(booksByUser.keys()));
                    const nameMap = new Map((usersForBooks || []).map(u => [u.id, u.name || 'Anonymous']));
                    const entries: BooksReadEntry[] = Array.from(booksByUser.entries())
                        .map(([userId, books]) => ({ userId, name: nameMap.get(userId) || 'Anonymous', booksRead: books.size }))
                        .sort((a, b) => b.booksRead - a.booksRead)
                        .map((e, i) => ({ ...e, rank: i + 1 }));
                    setBooksRead(entries);
                }

                if (booksData && mounted) {
                    const reviewMap = new Map<number, Array<{ userId: string; rating: number; createdAt: number }>>();
                    for (const r of reviewsData || []) {
                        const cur = reviewMap.get(r.book_id) || [];
                        cur.push({ userId: r.user_id, rating: r.rating, createdAt: new Date(r.created_at).getTime() });
                        reviewMap.set(r.book_id, cur);
                    }
                    const statsByBook = booksData.map((book) => {
                        const rs = getBookRatingStats(reviewMap.get(book.id) || []);
                        return { id: book.id, title: book.title, coverUrl: book.coverUrl, avg_rating: rs.reviewCount > 0 ? rs.averageRating : (book.avg_rating || 0), review_count: rs.reviewCount > 0 ? rs.reviewCount : (book.review_count || 0) };
                    }).filter(b => b.review_count > 0);
                    const globalAvg = statsByBook.length > 0 ? statsByBook.reduce((s, b) => s + b.avg_rating, 0) / statsByBook.length : 0;
                    const minVotes = Math.max(3, Math.ceil(statsByBook.reduce((s, b) => s + b.review_count, 0) / Math.max(1, statsByBook.length)));
                    setTopBooks(statsByBook.map(b => ({ ...b, weighted_rating: getImdbWeightedRating(b.avg_rating, b.review_count, globalAvg, minVotes) })).sort((a, b) => b.weighted_rating - a.weighted_rating || b.avg_rating - a.avg_rating).slice(0, 20));
                }
            } catch (err) { console.error(err); }
            finally { if (!isBackground && mounted) setLoading(false); }
        };
        fetchLeaderboard();

        if (!supabase) return;

        const channel = supabase.channel('leaderboard_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
                if (mounted) fetchLeaderboard(true);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'reading_sessions' }, () => {
                if (mounted) fetchLeaderboard(true);
            })
            .subscribe();

        return () => {
            mounted = false;
            supabase.removeChannel(channel);
        };
    }, []);

    const top3 = leaderboard.slice(0, 3);
    const others = leaderboard.slice(3);
    // order for display: 2nd, 1st, 3rd
    const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);

    return (
        <div className="min-h-screen flex flex-col" style={{ background: "#7f1d1d", backgroundImage: "radial-gradient(ellipse at 20% 0%, #b91c1c 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, #991b1b 0%, transparent 60%)" }}>

            {/* ── Header ──────────────────────────────────────────────── */}
            <header className="px-5 pt-10 pb-6 md:px-12 text-center relative">
                {/* Back */}
                <Link href="/dashboard" className="absolute left-5 top-8 flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-black text-sm uppercase tracking-wide px-4 py-2 rounded-full border border-white/20 transition-all">
                    <ArrowLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Library</span>
                </Link>

                {/* Decorative stars */}
                <div className="flex justify-center gap-3 mb-3">
                    <Star className="w-7 h-7 fill-yellow-400 text-yellow-400 opacity-60 animate-pulse" />
                    <Star className="w-9 h-9 fill-yellow-400 text-yellow-400" />
                    <Star className="w-7 h-7 fill-yellow-400 text-yellow-400 opacity-60 animate-pulse" style={{ animationDelay: "0.5s" }} />
                </div>
                <h1 className="comic-title text-4xl md:text-6xl text-yellow-400 drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]" style={{ textShadow: "0 4px 0 rgba(0,0,0,0.3)" }}>
                    Top Readers
                </h1>
                <h2 className="comic-title text-2xl md:text-4xl text-white mt-1">Leaderboard</h2>

                {/* Tab switcher */}
                <div className="flex justify-center gap-2 mt-6">
                    <button onClick={() => setActiveTab('students')}
                        className={`px-6 py-2.5 rounded-full font-black text-sm uppercase tracking-wide transition-all border-2 ${activeTab === 'students' ? 'bg-yellow-400 text-[#111] border-yellow-400 shadow-[0_4px_0_rgba(0,0,0,0.3)]' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}`}>
                        <Trophy className="inline w-4 h-4 mr-1 -mt-0.5" /> Students
                    </button>
                    <button onClick={() => setActiveTab('books')}
                        className={`px-6 py-2.5 rounded-full font-black text-sm uppercase tracking-wide transition-all border-2 ${activeTab === 'books' ? 'bg-yellow-400 text-[#111] border-yellow-400 shadow-[0_4px_0_rgba(0,0,0,0.3)]' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}`}>
                        <Star className="inline w-4 h-4 mr-1 -mt-0.5 fill-current" /> Top Books
                    </button>
                    <button onClick={() => setActiveTab('booksRead')}
                        className={`px-6 py-2.5 rounded-full font-black text-sm uppercase tracking-wide transition-all border-2 ${activeTab === 'booksRead' ? 'bg-yellow-400 text-[#111] border-yellow-400 shadow-[0_4px_0_rgba(0,0,0,0.3)]' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}`}>
                        <BookOpen className="inline w-4 h-4 mr-1 -mt-0.5" /> Books Read
                    </button>
                </div>
            </header>

            {/* ── Students Tab ─────────────────────────────────────────── */}
            {activeTab === 'students' && (
                <>
                    {loading ? (
                        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-yellow-400" /></div>
                    ) : leaderboard.length === 0 ? (
                        <div className="text-center py-20">
                            <Trophy className="w-16 h-16 text-white/30 mx-auto mb-4" />
                            <p className="text-white/60 font-bold uppercase tracking-wide">No ranking data yet</p>
                        </div>
                    ) : (
                        <>
                            {/* ── Podium ─────────────────────────────────── */}
                            <div className="px-4 md:px-12 pt-4 pb-0">
                                <div className="max-w-2xl mx-auto">
                                    {/* Characters */}
                                    <div className="flex items-end justify-center gap-4 md:gap-8 mb-0">
                                        {podiumOrder.map((u) => {
                                            const rank = top3.findIndex(user => user.id === u.id) + 1;
                                            const badge = RANK_BADGES[(rank - 1) % RANK_BADGES.length];
                                            const isFirst = rank === 1;
                                            const isMe = u.id === currentUser?.id;
                                            return (
                                                <div key={u.id} className={`flex flex-col items-center ${isFirst ? '-mt-6' : ''}`}>
                                                    <PodiumAvatar rank={rank} name={u.name} />
                                                    <p className={`font-black mt-2 text-center flex items-center justify-center gap-1.5 ${isFirst ? 'text-base' : 'text-sm'} ${isMe ? 'text-yellow-400' : 'text-white'}`}>
                                                        {u.streak! > 0 && (
                                                            <span className="flex items-center gap-0.5 text-orange-500 bg-black/20 px-1.5 py-0.5 rounded textxs" title={`${u.streak} Day Streak!`}>
                                                                <Flame className="w-3 h-3 text-orange-500 fill-orange-500" />
                                                                <span className="text-[10px]">{u.streak}</span>
                                                            </span>
                                                        )}
                                                        <span>{rank}. {u.name.split(' ')[0]}{isMe ? ' (YOU)' : ''}</span>
                                                    </p>
                                                    <p className={`font-black text-center ${isFirst ? 'text-sm' : 'text-xs'} ${isMe ? 'text-white' : 'text-yellow-300'}`}>
                                                        {u.totalPoints} Book Points
                                                    </p>
                                                    <div className="mt-2 px-3 py-1.5 rounded-full border-2 border-[#111] font-black text-[11px] uppercase tracking-wide flex items-center gap-1.5 shadow-[0_4px_0_rgba(0,0,0,0.3)]"
                                                        style={{ background: badge.bg, color: badge.color, borderColor: badge.color + "88" }}>
                                                        <span>{badge.emoji}</span> {badge.label}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Podium blocks */}
                                    <div className="flex items-end justify-center gap-4 md:gap-8 -mt-1">
                                        {podiumOrder.map((u) => {
                                            const rank = top3.findIndex(user => user.id === u.id) + 1;
                                            const isFirst = rank === 1;
                                            const heights = { 1: "h-24", 2: "h-16", 3: "h-12" };
                                            const h = heights[rank as 1 | 2 | 3] || "h-12";
                                            return (
                                                <div key={u.id} className={`${isFirst ? 'w-36' : 'w-28'} ${h} flex items-center justify-center font-black text-3xl md:text-4xl text-[#111] rounded-t-2xl border-t-4 border-x-4 border-yellow-400 relative`}
                                                    style={{ background: "linear-gradient(180deg,#d4a017 0%,#b8860b 50%,#8B6914 100%)" }}>
                                                    <span className="text-white/80 drop-shadow-lg">{rank}</span>
                                                    {/* gold shimmer strip */}
                                                    <div className="absolute top-2 left-2 right-2 h-1 rounded-full bg-yellow-200/40" />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* ── Other Amazing Readers ─────────────────── */}
                            <div className="flex-1 bg-[#fffbf3] rounded-t-[36px] mt-0 px-4 pt-8 pb-20 md:px-8">
                                <h3 className="comic-title text-2xl text-[#111] text-center mb-6 uppercase">
                                    Your Competitors
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl mx-auto">
                                    {others.map((u) => {
                                        const badge = RANK_BADGES[(u.rank! - 1) % RANK_BADGES.length];
                                        const isMe = u.id === currentUser?.id;
                                        return (
                                            <div key={u.id}
                                                className={`flex items-center gap-3 p-3 rounded-[20px] border-[3px] ${isMe ? 'border-[#e63329] bg-[#fff3ef]' : 'border-[#111] bg-white'} shadow-[0_5px_0_#111] transition-all hover:-translate-y-0.5`}>
                                                {/* Rank number */}
                                                <div className="w-8 text-center font-black text-[#e63329] text-sm flex-shrink-0">
                                                    #{u.rank}
                                                </div>
                                                {/* Avatar */}
                                                <div className="w-10 h-10 rounded-full border-[2.5px] border-[#111] flex-shrink-0 flex items-center justify-center font-black text-sm shadow-[0_3px_0_#111]"
                                                    style={{ background: badge.bg, color: badge.color }}>
                                                    {u.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                {/* Name + badge */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center mb-1">
                                                        <p className={`font-black text-sm leading-tight truncate flex items-center ${isMe ? 'text-[#e63329]' : 'text-[#111]'}`}>
                                                            {u.streak! > 0 && (
                                                                <span className="flex items-center gap-0.5 mr-1.5 text-orange-500" title={`${u.streak} Day Streak!`}>
                                                                    <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500 animate-pulse" />
                                                                    <span className="text-[10px]">{u.streak}</span>
                                                                </span>
                                                            )}
                                                            {u.name.split(' ')[0]}{isMe ? ' (YOU)' : ''}
                                                        </p>
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-wide" style={{ color: badge.color }}>
                                                        {badge.emoji} {badge.label}
                                                    </span>
                                                </div>
                                                {/* Points + medal */}
                                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                                    <div className="text-right">
                                                        <p className="font-black text-[#111] text-sm leading-none">{u.totalPoints}</p>
                                                        <p className="text-[9px] text-[#777] uppercase tracking-wide font-bold">BP</p>
                                                    </div>
                                                    {u.rank! <= 6 ? (
                                                        <Medal className="w-5 h-5" style={{ color: u.rank! <= 3 ? '#f59e0b' : u.rank! <= 5 ? '#9ca3af' : '#cd7c2f' }} />
                                                    ) : null}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {!loading && others.length === 0 && top3.length === 0 && (
                                    <div className="text-center py-16 opacity-50">
                                        <Trophy className="w-12 h-12 mx-auto mb-3 text-[#aaa]" />
                                        <p className="font-bold text-[#777] uppercase tracking-wide text-sm">No active students yet</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </>
            )}

            {/* ── Books Read Tab ───────────────────────────────────────── */}
            {activeTab === 'booksRead' && (
                <div className="flex-1 bg-[#fffbf3] rounded-t-[36px] mt-8 px-4 pt-8 pb-20 md:px-8">
                    <h3 className="comic-title text-2xl text-[#111] text-center mb-2 uppercase">Books Read</h3>
                    <p className="text-center text-[#777] font-bold text-xs uppercase tracking-wide mb-6">
                        Completed = reached the last third of the book
                    </p>

                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-[#e63329]" /></div>
                    ) : booksRead.length === 0 ? (
                        <div className="card py-16 text-center max-w-md mx-auto">
                            <BookOpen className="w-14 h-14 text-[#f2d7cd] mx-auto mb-4" />
                            <h2 className="comic-title text-2xl text-[#111] mb-2">No Books Completed Yet!</h2>
                            <p className="text-[#777] font-bold">Students who reach the last third of a book will appear here.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl mx-auto">
                            {booksRead.map((entry) => {
                                const badge = RANK_BADGES[(entry.rank! - 1) % RANK_BADGES.length];
                                const isMe = entry.userId === currentUser?.id;
                                return (
                                    <div key={entry.userId}
                                        className={`flex items-center gap-3 p-3 rounded-[20px] border-[3px] ${isMe ? 'border-[#e63329] bg-[#fff3ef]' : 'border-[#111] bg-white'} shadow-[0_5px_0_#111] transition-all hover:-translate-y-0.5`}>
                                        {/* Rank */}
                                        <div className="w-8 text-center font-black text-[#e63329] text-sm flex-shrink-0">
                                            #{entry.rank}
                                        </div>
                                        {/* Avatar */}
                                        <div className="w-10 h-10 rounded-full border-[2.5px] border-[#111] flex-shrink-0 flex items-center justify-center font-black text-sm shadow-[0_3px_0_#111]"
                                            style={{ background: badge.bg, color: badge.color }}>
                                            {entry.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        {/* Name + badge */}
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-black text-sm leading-tight truncate ${isMe ? 'text-[#e63329]' : 'text-[#111]'}`}>
                                                {entry.name.split(' ')[0]}{isMe ? ' (YOU)' : ''}
                                            </p>
                                            <span className="text-[10px] font-black uppercase tracking-wide" style={{ color: badge.color }}>
                                                {badge.emoji} {badge.label}
                                            </span>
                                        </div>
                                        {/* Books count */}
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <div className="flex flex-col items-center bg-[#fff4ba] border-2 border-[#111] rounded-xl px-3 py-1.5 shadow-[0_3px_0_#111]">
                                                <span className="font-black text-[#111] text-lg leading-none">{entry.booksRead}</span>
                                                <span className="text-[9px] font-black uppercase tracking-wide text-[#777]">
                                                    {entry.booksRead === 1 ? 'book' : 'books'}
                                                </span>
                                            </div>
                                            <BookOpen className="w-5 h-5 text-[#e63329]" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ── Top Books Tab ─────────────────────────────────────────── */}
            {activeTab === 'books' && (
                <div className="flex-1 bg-[#fffbf3] rounded-t-[36px] mt-8 px-4 pt-8 pb-20 md:px-8">
                    <h3 className="comic-title text-2xl text-[#111] text-center mb-6 uppercase">Top Rated Books</h3>

                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-[#e63329]" /></div>
                    ) : topBooks.length === 0 ? (
                        <div className="card py-16 text-center max-w-md mx-auto">
                            <Star className="w-14 h-14 text-[#f2d7cd] mx-auto mb-4" />
                            <h2 className="comic-title text-2xl text-[#111] mb-2">No Reviews Yet!</h2>
                            <p className="text-[#777] font-bold">Be the first to rate a book and it will appear here!</p>
                        </div>
                    ) : (
                        <div className="max-w-3xl mx-auto space-y-4">
                            {topBooks.map((book, idx) => (
                                <Link href={`/read/${book.id}`} key={book.id}
                                    className="flex gap-4 items-center book-card p-0 overflow-hidden group/bk">
                                    {/* Rank col */}
                                    <div className="w-14 flex-shrink-0 self-stretch flex flex-col items-center justify-center gap-1 py-3"
                                        style={{ background: idx === 0 ? "linear-gradient(180deg,#f59e0b,#d97706)" : idx === 1 ? "linear-gradient(180deg,#9ca3af,#6b7280)" : idx === 2 ? "linear-gradient(180deg,#cd7c2f,#a16207)" : "#f5f0ea" }}>
                                        {idx === 0 ? <Crown className="w-5 h-5 text-white" /> : null}
                                        <span className={`font-black text-2xl ${idx < 3 ? 'text-white' : 'text-[#aaa]'}`}>#{idx + 1}</span>
                                    </div>

                                    {/* Cover */}
                                    <div className="w-16 h-24 flex-shrink-0 overflow-hidden rounded-xl border-2 border-[#111] shadow-[0_4px_0_#111] my-3">
                                        {book.coverUrl ? (
                                            <img src={book.coverUrl.includes('drive.google.com') ? getThumbnailUrl(extractFileId(book.coverUrl)) : book.coverUrl}
                                                alt={book.title} className="w-full h-full object-cover group-hover/bk:scale-105 transition-transform duration-500" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(180deg,#e63329,#b91c1c)" }}>
                                                <BookOpen className="w-7 h-7 text-white/80" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0 py-3 pr-2">
                                        <h3 className="font-black text-[#111] text-base leading-tight line-clamp-2 group-hover/bk:text-[#e63329] transition-colors mb-1">
                                            {book.title}
                                        </h3>
                                        <p className="text-[11px] font-bold text-[#999] uppercase tracking-wide">
                                            {book.review_count} community reviews
                                        </p>
                                    </div>

                                    {/* Rating */}
                                    <div className="flex-shrink-0 flex flex-col items-center justify-center bg-[#fff4ba] px-4 py-3 self-stretch border-l-2 border-[#111]">
                                        <Star className="w-5 h-5 fill-yellow-500 text-yellow-500 mb-1" />
                                        <span className="font-black text-xl text-[#111] leading-none">{book.avg_rating?.toFixed(1)}</span>
                                        <span className="text-[9px] uppercase tracking-wider font-black text-[#777] mt-0.5">/10</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
