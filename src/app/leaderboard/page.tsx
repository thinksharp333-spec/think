"use client";

import { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Loader2, Star, BookOpen, Crown, Medal, Swords, Shield, Gem, Flame } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/hooks/useUser';
import { getThumbnailUrl, extractFileId } from '@/lib/google-drive';
import { getBookRatingStats, getImdbWeightedRating } from '@/lib/book-ratings';

const LEAGUES = [
    { id: 'immortal', name: 'Immortal Legends', min: 4000, max: 999999, icon: Crown, color: '#a855f7', bg: '#f3e8ff' },
    { id: 'diamond', name: 'Diamond Dragons', min: 3000, max: 3999, icon: Gem, color: '#0ea5e9', bg: '#e0f2fe' },
    { id: 'gold', name: 'Gold Guardians', min: 2000, max: 2999, icon: Trophy, color: '#f59e0b', bg: '#fef3c7' },
    { id: 'silver', name: 'Silver Seekers', min: 1000, max: 1999, icon: Swords, color: '#6b7280', bg: '#f3f4f6' },
    { id: 'bronze', name: 'Bronze Bookworms', min: 0, max: 999, icon: Shield, color: '#d97706', bg: '#ffedd5' },
];

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
    fileId?: string;
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

// Glowing dragon-egg trophy on a flame pedestal — tiered by rank
function PodiumAvatar({ rank, name }: { rank: number; name: string }) {
    const initials = name.substring(0, 2).toUpperCase();
    const size = rank === 1 ? { w: 200, h: 220 } : { w: 160, h: 180 };
    const uid = `pa-${rank}`;

    // Per-rank palette (gold / silver / bronze, each with its own glow)
    const tier = {
        1: { shell: "#fbbf24", shellDark: "#b45309", shellLight: "#fef3c7", glow: "#fde047", flameA: "#fef08a", flameB: "#f59e0b", flameC: "#dc2626", crownFill: "#fde047", gem: "#ef4444", runeBg: "#78350f" },
        2: { shell: "#e5e7eb", shellDark: "#6b7280", shellLight: "#f9fafb", glow: "#cbd5e1", flameA: "#fde68a", flameB: "#f59e0b", flameC: "#b91c1c", crownFill: "#d1d5db", gem: "#3b82f6", runeBg: "#374151" },
        3: { shell: "#d97706", shellDark: "#7c2d12", shellLight: "#fdba74", glow: "#fb923c", flameA: "#fed7aa", flameB: "#ea580c", flameC: "#991b1b", crownFill: "#d97706", gem: "#10b981", runeBg: "#7c2d12" },
    }[rank as 1 | 2 | 3] || { shell: "#fbbf24", shellDark: "#b45309", shellLight: "#fef3c7", glow: "#fde047", flameA: "#fef08a", flameB: "#f59e0b", flameC: "#dc2626", crownFill: "#fde047", gem: "#ef4444", runeBg: "#78350f" };

    const eggScale = rank === 1 ? 1.15 : 0.9;

    return (
        <div className="relative" title={name}>
            <svg width={size.w} height={size.h} viewBox="0 0 200 220" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <radialGradient id={`${uid}-glow`} cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor={tier.glow} stopOpacity="0.9" />
                        <stop offset="60%" stopColor={tier.glow} stopOpacity="0.2" />
                        <stop offset="100%" stopColor={tier.glow} stopOpacity="0" />
                    </radialGradient>
                    <linearGradient id={`${uid}-flameOuter`} x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stopColor={tier.flameC} />
                        <stop offset="50%" stopColor={tier.flameB} />
                        <stop offset="100%" stopColor={tier.flameA} />
                    </linearGradient>
                    <linearGradient id={`${uid}-flameInner`} x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stopColor={tier.flameB} />
                        <stop offset="100%" stopColor="#fffbeb" />
                    </linearGradient>
                    <linearGradient id={`${uid}-shell`} x1="30%" y1="0%" x2="70%" y2="100%">
                        <stop offset="0%" stopColor={tier.shellLight} />
                        <stop offset="55%" stopColor={tier.shell} />
                        <stop offset="100%" stopColor={tier.shellDark} />
                    </linearGradient>
                </defs>

                {/* Aura glow behind everything */}
                <circle cx="100" cy="110" r="85" fill={`url(#${uid}-glow)`}>
                    <animate attributeName="r" values="78;92;78" dur="3s" repeatCount="indefinite" />
                </circle>

                {/* Flame pedestal — large outer flame */}
                <g transform="translate(100 200)">
                    <path d="M-36 0 Q-44 -30 -20 -60 Q-28 -38 -10 -66 Q-6 -46 0 -80 Q6 -46 10 -66 Q28 -38 20 -60 Q44 -30 36 0 Z"
                          fill={`url(#${uid}-flameOuter)`} stroke="#111" strokeWidth="2.2" strokeLinejoin="round">
                        <animateTransform attributeName="transform" type="scale" values="1 1;1 1.08;1 1" dur="1.4s" repeatCount="indefinite" additive="sum" />
                    </path>
                    {/* Inner flame */}
                    <path d="M-18 -4 Q-20 -24 -8 -44 Q-4 -32 0 -52 Q4 -32 8 -44 Q20 -24 18 -4 Z"
                          fill={`url(#${uid}-flameInner)`} stroke="#fff7ed" strokeWidth="1" strokeLinejoin="round" opacity="0.95">
                        <animateTransform attributeName="transform" type="scale" values="1 1;1 1.15;1 1" dur="0.9s" repeatCount="indefinite" additive="sum" />
                    </path>
                </g>

                {/* Stacked book pedestal beneath the flame, suggesting a reader's trophy */}
                <g transform="translate(100 188)">
                    <rect x="-40" y="-4" width="80" height="10" rx="2" fill={tier.runeBg} stroke="#111" strokeWidth="2" />
                    <rect x="-40" y="-4" width="80" height="3" fill={tier.shell} opacity="0.55" />
                    <rect x="-36" y="-14" width="72" height="10" rx="2" fill="#1f2937" stroke="#111" strokeWidth="2" />
                    <rect x="-36" y="-14" width="72" height="3" fill={tier.shell} opacity="0.45" />
                    <rect x="-32" y="-24" width="64" height="10" rx="2" fill="#7c2d12" stroke="#111" strokeWidth="2" />
                    <rect x="-32" y="-24" width="64" height="3" fill={tier.shell} opacity="0.55" />
                </g>

                {/* The dragon egg — centered above the pedestal */}
                <g transform={`translate(100 110) scale(${eggScale})`}>
                    {/* Egg body */}
                    <path d="M0 -48 C 28 -48, 38 -10, 38 20 C 38 45, 20 58, 0 58 C -20 58, -38 45, -38 20 C -38 -10, -28 -48, 0 -48 Z"
                          fill={`url(#${uid}-shell)`} stroke="#111" strokeWidth="3" strokeLinejoin="round" />
                    {/* Highlight sheen */}
                    <path d="M-20 -30 Q-30 -10 -20 10" stroke={tier.shellLight} strokeWidth="5" strokeLinecap="round" opacity="0.55" fill="none" />
                    {/* Scale pattern */}
                    <g stroke="#111" strokeWidth="1.3" fill="none" opacity="0.55">
                        <path d="M-22 -10 Q-14 -6 -6 -10 Q2 -6 10 -10 Q18 -6 26 -10" />
                        <path d="M-26 4 Q-18 8 -10 4 Q-2 8 6 4 Q14 8 22 4 Q30 8 30 4" />
                        <path d="M-24 18 Q-16 22 -8 18 Q0 22 8 18 Q16 22 24 18" />
                        <path d="M-20 32 Q-12 36 -4 32 Q4 36 12 32 Q20 36 20 32" />
                    </g>
                    {/* Central rank glyph — embedded gem */}
                    <circle cx="0" cy="8" r="13" fill="#111" />
                    <circle cx="0" cy="8" r="11" fill={tier.gem} stroke={tier.shellDark} strokeWidth="1.5" />
                    <path d="M-5 5 L0 0 L5 5 L0 14 Z" fill={tier.shellLight} opacity="0.85" />
                    {/* Crack emitting light (rank 1 only, biggest reveal) */}
                    {rank === 1 && (
                        <g>
                            <path d="M-20 -40 L-14 -30 L-18 -22 L-10 -14 L-16 -4" stroke="#fffbeb" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.85" />
                            <circle cx="-14" cy="-30" r="2.5" fill="#fffbeb" />
                        </g>
                    )}
                </g>

                {/* Rank crest above the egg */}
                <g transform={rank === 1 ? "translate(100 40)" : "translate(100 54)"}>
                    {rank === 1 ? (
                        <>
                            {/* Crown */}
                            <path d="M-26 8 L-20 -16 L-10 -2 L0 -22 L10 -2 L20 -16 L26 8 Z"
                                  fill={tier.crownFill} stroke="#111" strokeWidth="2.5" strokeLinejoin="round" />
                            <rect x="-26" y="8" width="52" height="8" fill={tier.shellDark} stroke="#111" strokeWidth="2" />
                            <circle cx="-14" cy="0" r="3" fill="#ef4444" stroke="#111" strokeWidth="1" />
                            <circle cx="0" cy="-4" r="3.5" fill="#22c55e" stroke="#111" strokeWidth="1" />
                            <circle cx="14" cy="0" r="3" fill="#3b82f6" stroke="#111" strokeWidth="1" />
                        </>
                    ) : (
                        <>
                            {/* Medal */}
                            <circle cx="0" cy="0" r="14" fill={tier.shell} stroke="#111" strokeWidth="2.5" />
                            <circle cx="0" cy="0" r="9" fill={tier.shellLight} stroke={tier.shellDark} strokeWidth="1.2" />
                            <text x="0" y="4" textAnchor="middle" fontSize="11" fontWeight="900" fill={tier.shellDark} fontFamily="sans-serif">
                                {rank}
                            </text>
                            {/* Ribbon */}
                            <path d="M-8 12 L-12 26 L-4 22 L0 30 L4 22 L12 26 L8 12 Z" fill={tier.flameC} stroke="#111" strokeWidth="1.8" strokeLinejoin="round" />
                        </>
                    )}
                </g>

                {/* Sparkle stars around */}
                <g fill="#fde047" opacity="0.9">
                    <path d="M30 70 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 l6 -2 z">
                        <animate attributeName="opacity" values="0.2;1;0.2" dur="1.8s" repeatCount="indefinite" />
                    </path>
                    <path d="M170 80 l1.5 4.5 l4.5 1.5 l-4.5 1.5 l-1.5 4.5 l-1.5 -4.5 l-4.5 -1.5 l4.5 -1.5 z">
                        <animate attributeName="opacity" values="1;0.2;1" dur="2.4s" repeatCount="indefinite" />
                    </path>
                    <path d="M40 140 l1 3 l3 1 l-3 1 l-1 3 l-1 -3 l-3 -1 l3 -1 z">
                        <animate attributeName="opacity" values="0.3;1;0.3" dur="2.1s" repeatCount="indefinite" />
                    </path>
                    <path d="M160 160 l1.2 3.5 l3.5 1.2 l-3.5 1.2 l-1.2 3.5 l-1.2 -3.5 l-3.5 -1.2 l3.5 -1.2 z">
                        <animate attributeName="opacity" values="1;0.3;1" dur="1.6s" repeatCount="indefinite" />
                    </path>
                </g>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center opacity-0">
                <span className="text-white font-black text-sm">{initials}</span>
            </div>
        </div>
    );
}

export default function LeaderboardPage() {
    const { user } = useUser();
    const _users = useLiveQuery(() => db.users.toArray()) || [];
    const currentUser = _users.find(u => u.id !== 'local-user' && u.id !== 'local-admin')
               || _users.find(u => u.id === 'local-user')
               || _users[0];
    const router = useRouter();

    // Auth Guard: Redirect to landing if no real user session
    useEffect(() => {
        if (currentUser && currentUser.id === 'local-user') {
            router.push('/');
        }
    }, [currentUser, router]);

    const [activeTab, setActiveTab] = useState<'students' | 'books' | 'booksRead'>('students');
    const [selectedLeague, setSelectedLeague] = useState<string>('bronze');
    const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
    const [topBooks, setTopBooks] = useState<LeaderboardBook[]>([]);
    const [booksRead, setBooksRead] = useState<BooksReadEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const fetchLeaderboard = async (isBackground = false) => {
            if (!isBackground) setLoading(true);
            try {
                const res = await fetch('/api/leaderboard');
                if (!res.ok) throw new Error('Leaderboard API error');
                const { users: usersData, books: booksData, reviews: reviewsData, sessions: sessionsData } = await res.json();

                if (usersData && mounted) {
                    const now = new Date();
                    const today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
                    const yesterdayObj = new Date(now.getTime() - 86400000 - now.getTimezoneOffset() * 60000);
                    const yesterday = yesterdayObj.toISOString().split('T')[0];

                    const usersList = usersData.map((u: any, i: number) => {
                        let effStreak = u.streak || 0;
                        if (effStreak > 0 && u.last_points_date !== today && u.last_points_date !== yesterday) effStreak = 0;
                        return { id: u.id, name: u.name || 'Anonymous', totalPoints: u.totalPoints || 0, streak: effStreak, rank: i + 1 };
                    });
                    setLeaderboard(usersList);

                    if (user) {
                        const me = usersList.find((u: any) => u.id === user.id);
                        if (me) {
                            const myLg = LEAGUES.find(l => me.totalPoints >= l.min && me.totalPoints <= l.max);
                            if (myLg) setSelectedLeague(myLg.id);
                        }
                    }
                }

                if (sessionsData && mounted) {
                    const booksByUser = new Map<string, Set<string>>();
                    for (const s of sessionsData) {
                        if (!booksByUser.has(s.user_id)) booksByUser.set(s.user_id, new Set());
                        booksByUser.get(s.user_id)!.add(String(s.book_id));
                    }
                    const nameMap = new Map((usersData || []).map((u: any) => [u.id, String(u.name || 'Anonymous')]));
                    const entries: BooksReadEntry[] = Array.from(booksByUser.entries())
                        .map(([userId, books]) => ({ userId, name: String(nameMap.get(userId) || 'Anonymous'), booksRead: books.size }))
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
                    const statsByBook = booksData.map((book: any) => {
                        const rs = getBookRatingStats(reviewMap.get(book.id) || []);
                        return { 
                            id: book.id, 
                            title: book.title, 
                            fileId: book.fileId,
                            coverUrl: book.coverUrl, 
                            avg_rating: rs.reviewCount > 0 ? rs.averageRating : (book.avg_rating || 0), 
                            review_count: rs.reviewCount > 0 ? rs.reviewCount : (book.review_count || 0) 
                        };
                    }).filter((b: any) => b.review_count > 0);
                    const globalAvg = statsByBook.length > 0 ? statsByBook.reduce((s: number, b: any) => s + b.avg_rating, 0) / statsByBook.length : 0;
                    const minVotes = Math.max(3, Math.ceil(statsByBook.reduce((s: number, b: any) => s + b.review_count, 0) / Math.max(1, statsByBook.length)));
                    setTopBooks(statsByBook.map((b: any) => ({ ...b, weighted_rating: getImdbWeightedRating(b.avg_rating, b.review_count, globalAvg, minVotes) })).sort((a: any, b: any) => b.weighted_rating - a.weighted_rating || b.avg_rating - a.avg_rating).slice(0, 20));
                }
            } catch (err) { console.error(err); }
            finally { if (!isBackground && mounted) setLoading(false); }
        };
        fetchLeaderboard();

        // Poll every 30s for live updates (replaces realtime subscription which needs anon client)
        const interval = setInterval(() => { if (mounted) fetchLeaderboard(true); }, 30000);

        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, []);

    const activeLeagueDef = LEAGUES.find(l => l.id === selectedLeague) || LEAGUES[4];
    const filteredLeaderboard = leaderboard.filter(u => u.totalPoints >= activeLeagueDef.min && u.totalPoints <= activeLeagueDef.max);
    const top3 = filteredLeaderboard.slice(0, 3);
    const others = filteredLeaderboard.slice(3);
    // order for display: 2nd, 1st, 3rd
    const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);

    return (
        <div className="min-h-screen flex flex-col relative" style={{
            backgroundColor: "#7f1d1d",
            backgroundImage: "linear-gradient(rgba(127,29,29,0.78), rgba(69,10,10,0.88)), url('/dragons_hoard_bg.png')",
            backgroundSize: "cover, 900px auto",
            backgroundPosition: "center, center",
            backgroundRepeat: "no-repeat, repeat",
            backgroundAttachment: "fixed, fixed",
        }}>

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
                        className={`px-6 py-2.5 rounded-full font-black text-sm uppercase tracking-wide transition-all border-2 ${activeTab === 'students' ? 'bg-[#111] text-white border-[#111] shadow-[0_4px_0_rgba(0,0,0,0.3)]' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}`}>
                        <Trophy className="inline w-4 h-4 mr-1 -mt-0.5" /> Students
                    </button>
                    <button onClick={() => setActiveTab('books')}
                        className={`px-6 py-2.5 rounded-full font-black text-sm uppercase tracking-wide transition-all border-2 ${activeTab === 'books' ? 'bg-[#111] text-white border-[#111] shadow-[0_4px_0_rgba(0,0,0,0.3)]' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}`}>
                        <Star className="inline w-4 h-4 mr-1 -mt-0.5 fill-current" /> Top Books
                    </button>
                    <button onClick={() => setActiveTab('booksRead')}
                        className={`px-6 py-2.5 rounded-full font-black text-sm uppercase tracking-wide transition-all border-2 ${activeTab === 'booksRead' ? 'bg-[#111] text-white border-[#111] shadow-[0_4px_0_rgba(0,0,0,0.3)]' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}`}>
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
                        <div className="flex w-full flex-col xl:flex-row min-h-0 flex-1">

                            {/* ── League Selector — EXTREME LEFT ── */}
                            <div className="xl:w-[220px] shrink-0 xl:flex xl:flex-col gap-2 px-3 py-4 hidden xl:flex">
                                {LEAGUES.map(league => {
                                    const Icon = league.icon;
                                    const isSelected = selectedLeague === league.id;
                                    return (
                                        <button key={league.id} onClick={() => setSelectedLeague(league.id)}
                                            className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all text-left w-full ${isSelected ? 'border-yellow-400 bg-yellow-400/10 shadow-[0_0_12px_rgba(251,191,36,0.3)]' : 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/40'}`}>
                                            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                                                 style={{ backgroundColor: league.bg + '33', color: league.color }}>
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className={`font-black text-xs uppercase tracking-wide truncate ${isSelected ? 'text-yellow-300' : 'text-white/80'}`}>{league.name}</p>
                                                <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{league.min}{league.max < 900000 ? `–${league.max}` : '+'} pts</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Mobile league scroller */}
                            <div className="flex xl:hidden gap-2 overflow-x-auto no-scrollbar px-3 pt-3 pb-1 snap-x">
                                {LEAGUES.map(league => {
                                    const Icon = league.icon;
                                    const isSelected = selectedLeague === league.id;
                                    return (
                                        <button key={league.id} onClick={() => setSelectedLeague(league.id)}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all shrink-0 snap-start ${isSelected ? 'border-yellow-400 bg-yellow-400/15 text-yellow-300' : 'border-white/20 bg-white/5 text-white/70'}`}>
                                            <Icon className="w-4 h-4" />
                                            <span className="font-black text-xs uppercase tracking-wide whitespace-nowrap">{league.name}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* ── Main Content ── */}
                            <div className="flex-1 min-w-0 flex flex-col">

                                {filteredLeaderboard.length === 0 ? (
                                    <div className="text-center py-20">
                                        <Trophy className="w-14 h-14 text-white/30 mx-auto mb-4" />
                                        <p className="text-white/60 font-bold uppercase tracking-wide text-sm">No players in this league yet</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* ── Podium ─────────────────────────────────── */}
                                        <div className="px-4 md:px-12 pt-4 pb-0">
                                            <div className="max-w-4xl mx-auto rounded-[28px] border-4 border-yellow-500/70 overflow-hidden shadow-[0_10px_0_rgba(0,0,0,0.4),0_0_40px_rgba(251,191,36,0.15)] relative"
                                                 style={{
                                                     backgroundImage: "radial-gradient(ellipse at center top, rgba(127,29,29,0.3) 0%, rgba(20,5,5,0.7) 100%), url('/dragons_hoard_bg.png')",
                                                     backgroundSize: "cover",
                                                     backgroundPosition: "center",
                                                     backgroundRepeat: "no-repeat",
                                                 }}>
                                                <div className="px-4 md:px-8 pt-6 pb-6">
                                                {/* Characters */}
                                                <div className="flex items-end justify-center gap-3 md:gap-6 mb-2 relative">
                                                    {podiumOrder.map((u) => {
                                                        const rank = top3.findIndex(user => user.id === u.id) + 1;
                                                        const badge = RANK_BADGES[(rank - 1) % RANK_BADGES.length];
                                                        const isFirst = rank === 1;
                                                        const isMe = u.id === currentUser?.id;
                                                        return (
                                                            <div key={u.id} className={`flex flex-col items-center ${isFirst ? '-mt-4' : ''}`}>
                                                                <PodiumAvatar rank={rank} name={u.name} />
                                                                <p className={`font-black mt-1 text-center flex items-center justify-center gap-1.5 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] ${isFirst ? 'text-base' : 'text-sm'} ${isMe ? 'text-yellow-300' : 'text-white'}`}>
                                                                    {u.streak! > 0 && (
                                                                        <span className="flex items-center gap-0.5 text-orange-400 bg-black/40 px-1.5 py-0.5 rounded" title={`${u.streak} Day Streak!`}>
                                                                            <Flame className="w-3 h-3 text-orange-400 fill-orange-400" />
                                                                            <span className="text-[10px]">{u.streak}</span>
                                                                        </span>
                                                                    )}
                                                                    <span>{u.name.split(' ')[0]}{isMe ? ' (YOU)' : ''}</span>
                                                                </p>
                                                                <p className={`font-black text-center drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] ${isFirst ? 'text-sm' : 'text-xs'} ${isMe ? 'text-white' : 'text-yellow-300'}`}>
                                                                    {u.totalPoints} Book Points
                                                                </p>
                                                                <div className="mt-2 px-3 py-1.5 rounded-full border-2 border-[#111] font-black text-[11px] uppercase tracking-wide flex items-center gap-1.5 shadow-[0_4px_0_rgba(0,0,0,0.4)]"
                                                                    style={{ background: badge.bg, color: badge.color, borderColor: badge.color + "88" }}>
                                                                    <span>{badge.emoji}</span> {badge.label}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Red banner name plates */}
                                                <div className="flex items-end justify-center gap-3 md:gap-6 mt-3">
                                                    {podiumOrder.map((u) => {
                                                        const rank = top3.findIndex(user => user.id === u.id) + 1;
                                                        const isFirst = rank === 1;
                                                        const rankLabel = rank === 1 ? '1st Place' : rank === 2 ? '2nd' : '3rd';
                                                        const medalSuffix = rank === 1 ? 'st' : rank === 2 ? 'nd' : 'rd';
                                                        return (
                                                            <div key={u.id} className={`${isFirst ? 'w-44 md:w-52' : 'w-32 md:w-40'} flex flex-col items-center relative`}>
                                                                {/* Rank medallion */}
                                                                <div className="absolute -left-2 -top-3 z-20 w-12 h-12 rounded-full border-[3px] border-[#111] flex items-center justify-center font-black text-white"
                                                                     style={{ 
                                                                         background: rank === 1 
                                                                             ? "radial-gradient(circle at 30% 30%, #fbbf24 0%, #d97706 60%, #7c2d12 100%)" 
                                                                             : rank === 2 
                                                                                 ? "radial-gradient(circle at 30% 30%, #cbd5e1 0%, #64748b 60%, #334155 100%)"
                                                                                 : "radial-gradient(circle at 30% 30%, #fdba74 0%, #ea580c 60%, #7c2d12 100%)",
                                                                         boxShadow: rank === 1
                                                                             ? "0 0 20px rgba(251, 191, 36, 0.8), 0 4px 0 rgba(0,0,0,0.5)"
                                                                             : rank === 2
                                                                                 ? "0 0 20px rgba(203, 213, 225, 0.6), 0 4px 0 rgba(0,0,0,0.5)"
                                                                                 : "0 0 20px rgba(251, 146, 60, 0.6), 0 4px 0 rgba(0,0,0,0.5)"
                                                                     }}>
                                                                    <span className="text-base leading-none">{rank}<sup className="text-[10px]">{medalSuffix}</sup></span>
                                                                </div>
                                                                {/* Banner */}
                                                                <div className={`w-full ${isFirst ? 'py-3' : 'py-2.5'} px-3 relative border-[3px] border-[#111] shadow-[0_6px_0_rgba(0,0,0,0.5)]`}
                                                                     style={{
                                                                         background: "linear-gradient(180deg,#ef4444 0%,#dc2626 50%,#991b1b 100%)",
                                                                         clipPath: "polygon(0 0, 100% 0, 96% 100%, 4% 100%)",
                                                                     }}>
                                                                    {/* Gold top stripe */}
                                                                    <div className="absolute top-1 left-3 right-3 h-0.5 rounded-full bg-yellow-300/60" />
                                                                    <p className={`font-black text-white uppercase tracking-wide text-center drop-shadow-[0_2px_0_rgba(0,0,0,0.5)] truncate ${isFirst ? 'text-sm md:text-base' : 'text-xs md:text-sm'}`}>
                                                                        {rankLabel}: {u.name.split(' ')[0]}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* ── Other Amazing Readers ─────────────────── */}
                                        <div className="flex-1 px-4 pt-4 pb-20">
                                            <div className="max-w-4xl mx-auto bg-black/30 backdrop-blur-md rounded-[32px] border-4 border-white/10 p-8 shadow-[0_15px_35px_rgba(0,0,0,0.4)]">
                                                <h3 className="comic-title text-2xl text-yellow-400 text-center mb-6 uppercase">
                                                    Your Competitors
                                                </h3>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl mx-auto">
                                                {others.map((u) => {
                                                    const badge = RANK_BADGES[(u.rank! - 1) % RANK_BADGES.length];
                                                    const isMe = u.id === currentUser?.id;
                                                    return (
                                                        <div key={u.id}
                                                            className={`flex items-center gap-3 p-3 rounded-[20px] border-[3px] ${isMe ? 'border-yellow-400 bg-yellow-400/10' : 'border-white/10 bg-white/5'} shadow-[0_5px_0_rgba(0,0,0,0.4)] transition-all hover:-translate-y-0.5`}>
                                                            {/* Rank number */}
                                                            <div className="w-8 text-center font-black text-yellow-400 text-sm flex-shrink-0">
                                                                #{u.rank}
                                                            </div>
                                                            {/* Avatar */}
                                                            <div className="w-10 h-10 rounded-full border-[2.5px] border-[#111] flex-shrink-0 flex items-center justify-center font-black text-sm shadow-[0_3px_0_rgba(0,0,0,0.4)]"
                                                                style={{ background: badge.bg, color: badge.color }}>
                                                                {u.name.substring(0, 2).toUpperCase()}
                                                            </div>
                                                            {/* Name + badge */}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center mb-1">
                                                                    <p className={`font-black text-sm leading-tight truncate flex items-center ${isMe ? 'text-yellow-400' : 'text-white'}`}>
                                                                        {u.streak! > 0 && (
                                                                            <span className="flex items-center gap-0.5 mr-1.5 text-orange-400" title={`${u.streak} Day Streak!`}>
                                                                                <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400 animate-pulse" />
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
                                                                    <p className="font-black text-white text-sm leading-none">{u.totalPoints}</p>
                                                                    <p className="text-[9px] text-white/40 uppercase tracking-wide font-bold">BP</p>
                                                                </div>
                                                                {u.rank! <= 6 ? (
                                                                    <Medal className="w-5 h-5 shadow-sm" style={{ color: u.rank! <= 3 ? '#fbbf24' : u.rank! <= 5 ? '#94a3b8' : '#b45309' }} />
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {!loading && others.length === 0 && top3.length === 0 && (
                                                <div className="text-center py-16 opacity-50">
                                                    <Trophy className="w-12 h-12 mx-auto mb-3 text-white/40" />
                                                    <p className="font-bold text-white/40 uppercase tracking-wide text-sm">No active students yet</p>
                                                </div>
                                            )}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                            {/* Ghost column for centering on XL */}
                            <div className="hidden xl:block xl:w-[220px] shrink-0 pointer-events-none" />
                        </div>
                    )}
                </>
            )}

            {/* ── Books Read Tab ───────────────────────────────────────── */}
            {activeTab === 'booksRead' && (
                <div className="flex-1 px-4 pt-10 pb-20">
                    <div className="max-w-4xl mx-auto bg-black/30 backdrop-blur-md rounded-[32px] border-4 border-white/10 p-8 shadow-[0_15px_35px_rgba(0,0,0,0.4)]">
                        <h3 className="comic-title text-2xl text-yellow-400 text-center mb-2 uppercase">Books Read</h3>
                    <p className="text-center text-white/60 font-bold text-xs uppercase tracking-wide mb-6">
                        Completed = reached the last third of the book
                    </p>

                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-yellow-400" /></div>
                    ) : booksRead.length === 0 ? (
                        <div className="bg-white/5 border-2 border-white/10 rounded-[32px] py-16 text-center max-w-md mx-auto">
                            <BookOpen className="w-14 h-14 text-white/20 mx-auto mb-4" />
                            <h2 className="comic-title text-2xl text-white mb-2">No Books Completed Yet!</h2>
                            <p className="text-white/40 font-bold">Students who reach the last third of a book will appear here.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl mx-auto">
                            {booksRead.map((entry) => {
                                const badge = RANK_BADGES[(entry.rank! - 1) % RANK_BADGES.length];
                                const isMe = entry.userId === currentUser?.id;
                                return (
                                    <div key={entry.userId}
                                        className={`flex items-center gap-3 p-3 rounded-[20px] border-[3px] ${isMe ? 'border-yellow-400 bg-yellow-400/10' : 'border-white/10 bg-white/5'} shadow-[0_5px_0_rgba(0,0,0,0.4)] transition-all hover:-translate-y-0.5`}>
                                        {/* Rank */}
                                        <div className="w-8 text-center font-black text-yellow-400 text-sm flex-shrink-0">
                                            #{entry.rank}
                                        </div>
                                        {/* Avatar */}
                                        <div className="w-10 h-10 rounded-full border-[2.5px] border-[#111] flex-shrink-0 flex items-center justify-center font-black text-sm shadow-[0_3px_0_rgba(0,0,0,0.4)]"
                                            style={{ background: badge.bg, color: badge.color }}>
                                            {entry.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        {/* Name + badge */}
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-black text-sm leading-tight truncate ${isMe ? 'text-yellow-400' : 'text-white'}`}>
                                                {entry.name.split(' ')[0]}{isMe ? ' (YOU)' : ''}
                                            </p>
                                            <span className="text-[10px] font-black uppercase tracking-wide" style={{ color: badge.color }}>
                                                {badge.emoji} {badge.label}
                                            </span>
                                        </div>
                                        {/* Books count */}
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <div className="flex flex-col items-center bg-yellow-400 border-2 border-[#111] rounded-xl px-3 py-1.5 shadow-[0_3px_0_rgba(0,0,0,0.4)]">
                                                <span className="font-black text-[#111] text-lg leading-none">{entry.booksRead}</span>
                                                <span className="text-[9px] font-black uppercase tracking-wide text-[#111]/60">
                                                    {entry.booksRead === 1 ? 'book' : 'books'}
                                                </span>
                                            </div>
                                            <BookOpen className="w-5 h-5 text-yellow-400" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    </div>
                </div>
            )}

            {/* ── Top Books Tab ─────────────────────────────────────────── */}
            {activeTab === 'books' && (
                <div className="flex-1 px-4 pt-10 pb-20">
                    <div className="max-w-4xl mx-auto bg-black/30 backdrop-blur-md rounded-[32px] border-4 border-white/10 p-8 shadow-[0_15px_35px_rgba(0,0,0,0.4)]">
                        <h3 className="comic-title text-2xl text-yellow-400 text-center mb-6 uppercase">Top Rated Books</h3>

                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-yellow-400" /></div>
                    ) : topBooks.length === 0 ? (
                        <div className="bg-white/5 border-2 border-white/10 rounded-[32px] py-16 text-center max-w-md mx-auto">
                            <Star className="w-14 h-14 text-white/20 mx-auto mb-4" />
                            <h2 className="comic-title text-2xl text-white mb-2">No Reviews Yet!</h2>
                            <p className="text-white/40 font-bold">Be the first to rate a book and it will appear here!</p>
                        </div>
                    ) : (
                        <div className="max-w-3xl mx-auto space-y-4">
                            {topBooks.map((book, idx) => (
                                <Link href={`/read?id=${book.id}`} key={book.id}
                                    className="flex gap-4 items-center bg-white/5 border-[3px] border-white/10 hover:border-white/30 rounded-[24px] p-0 overflow-hidden group/bk shadow-[0_6px_0_rgba(0,0,0,0.4)] transition-all hover:-translate-y-1">
                                    {/* Rank col */}
                                    <div className="w-14 flex-shrink-0 self-stretch flex flex-col items-center justify-center gap-1 py-3"
                                        style={{ background: idx === 0 ? "linear-gradient(180deg,#fbbf24,#d97706)" : idx === 1 ? "linear-gradient(180deg,#94a3b8,#475569)" : idx === 2 ? "linear-gradient(180deg,#b45309,#78350f)" : "rgba(255,255,255,0.05)" }}>
                                        {idx === 0 ? <Crown className="w-5 h-5 text-white" /> : null}
                                        <span className={`font-black text-2xl ${idx < 3 ? 'text-white' : 'text-white/20'}`}>#{idx + 1}</span>
                                    </div>

                                    {/* Cover */}
                                    <div className="w-16 h-24 flex-shrink-0 overflow-hidden rounded-xl border-2 border-[#111] shadow-[0_4px_0_rgba(0,0,0,0.4)] my-3">
                                        {book.coverUrl || book.fileId ? (
                                            <img src={book.coverUrl ? (book.coverUrl.includes('drive.google.com') ? getThumbnailUrl(extractFileId(book.coverUrl)) : book.coverUrl) : getThumbnailUrl(book.fileId!)}
                                                alt={book.title} className="w-full h-full object-cover group-hover/bk:scale-105 transition-transform duration-500"
                                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(180deg,#e63329,#b91c1c)" }}>
                                                <BookOpen className="w-7 h-7 text-white/80" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0 py-3 pr-2">
                                        <h3 className="font-black text-white text-base leading-tight line-clamp-2 group-hover/bk:text-yellow-400 transition-colors mb-1">
                                            {book.title}
                                        </h3>
                                        <p className="text-[11px] font-bold text-white/40 uppercase tracking-wide">
                                            {book.review_count} community reviews
                                        </p>
                                    </div>

                                    {/* Rating */}
                                    <div className="flex-shrink-0 flex flex-col items-center justify-center bg-yellow-400 px-4 py-3 self-stretch border-l-2 border-[#111]">
                                        <Star className="w-5 h-5 fill-yellow-600 text-yellow-600 mb-1" />
                                        <span className="font-black text-xl text-[#111] leading-none">{book.avg_rating?.toFixed(1)}</span>
                                        <span className="text-[9px] uppercase tracking-wider font-black text-[#111]/40 mt-0.5">/10</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                    </div>
                </div>
            )}
        </div>
    );
}
