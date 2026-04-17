"use client";

import { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Loader2, Star, BookOpen, Crown, Medal, Flame } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface LeaderboardUser {
    id: string;
    name: string;
    totalPoints: number;
    streak?: number;
    rank?: number;
}

export default function LeaderboardPage() {
    const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
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

    // Provide default placeholders if there are no users yet for UI demonstration
    const top1 = top3[0] || { name: 'Leo_L', totalPoints: 1250 };
    const top2 = top3[1] || { name: 'Sarah_K', totalPoints: 950 };
    const top3rd = top3[2] || { name: 'Ben_J', totalPoints: 800 };

    const top1Pct = Math.max(1, top1.totalPoints);

    return (
        <div className="flex flex-col font-sans bg-black max-w-full overflow-x-hidden" style={{ minHeight: '100vh', height: '100vh' }}>

            {/* ─── HEADER ────────────────────────────────────────────── */}
            <header className="bg-[#d32f2f] h-16 sm:h-20 flex items-center justify-between px-4 sm:px-8 border-b-4 border-black relative z-50 flex-shrink-0">
                {/* EXTREME LEFT: League */}
                <div className="flex items-center">
                    <div className="bg-black text-white px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-full font-black comic-title text-xs sm:text-sm border-2 border-white shadow-[0_2px_0_#fff]">
                        🏆 LEGEND LEAGUE
                    </div>
                </div>

                {/* LOGO Overlap */}
                <div className="absolute left-1/2 -top-1 -translate-x-1/2 sm:left-auto sm:right-[70%] sm:-translate-x-1/2 w-48 sm:w-64 bg-white border-4 border-black rounded-[2rem] p-2 flex items-center justify-center gap-2 shadow-[0_6px_0_#111] z-50">
                    <div className="w-8 h-8 rounded-full border-[3px] border-black flex items-center justify-center bg-gray-100">
                        <Compass className="w-5 h-5 text-red-600" />
                    </div>
                    <span className="comic-title text-black text-sm sm:text-lg leading-none tracking-wide text-center">Reading<br />Adventure</span>
                </div>

                {/* NAV LINKS */}
                <nav className="hidden lg:flex items-center gap-8 ml-auto mr-16">
                    <Link href="/dashboard" className="text-white font-black hover:text-yellow-400 border-2 border-transparent hover:border-black bg-black rounded-full px-5 py-1.5 text-xs tracking-widest shadow-[0_2px_0_#fff]">HOME</Link>
                    <Link href="/books" className="text-white font-black hover:text-yellow-400 text-xs tracking-widest drop-shadow-md">BOOKS</Link>
                    <Link href="/adventure" className="text-white font-black hover:text-yellow-400 text-xs tracking-widest drop-shadow-md">MY ADVENTURE</Link>
                    <Link href="/about" className="text-white font-black hover:text-yellow-400 text-xs tracking-widest drop-shadow-md">ABOUT US</Link>
                </nav>

                {/* SEARCH */}
                <button className="hidden sm:block text-white hover:text-yellow-400 transition-colors drop-shadow-md">
                    <Search className="w-6 h-6" />
                </button>
            </header>

            {/* ─── MAIN CONTENT ──────────────────────────────────────── */}
            <main className="flex-1 relative bg-cover bg-center bg-no-repeat overflow-hidden flex flex-col items-center pt-8 md:pt-12 pb-16 min-h-0"
                style={{ backgroundImage: "url('/dragons_hoard_bg.png')" }}>

                {/* Background Dimmer for text clarity */}
                <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>

                {/* Title */}
                <h1 className="comic-title text-white text-3xl sm:text-5xl md:text-6xl drop-shadow-[0_6px_12px_rgba(0,0,0,0.8)] mb-8 text-center relative z-10 w-full px-4"
                    style={{ WebkitTextStroke: '2px black' }}>
                    DRAGON'S HOARD LEADERBOARD
                </h1>

                {/* ─── PODIUM ────────────────────────────────────────── */}
                <div className="flex items-end justify-center gap-2 sm:gap-6 md:gap-12 mb-8 relative z-10 w-full px-4 mx-auto max-w-5xl flex-shrink-0">

                    {/* 2nd Place */}
                    <div className="flex flex-col items-center z-10 w-[30%] max-w-[200px] transform translate-y-6 sm:translate-y-10 hover:-translate-y-2 hover:scale-105 transition-all duration-300">
                        <div className="relative">
                            <img src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${top2.name}&backgroundColor=transparent`}
                                className="w-24 h-24 sm:w-36 sm:h-36 object-contain drop-shadow-[0_8px_4px_rgba(0,0,0,0.5)]" alt="2nd place avatar" />
                            <div className="absolute -bottom-4 -left-3 sm:-left-6 w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br from-gray-200 to-gray-400 rounded-full border-[3px] border-black flex items-center justify-center shadow-[0_4px_0_#111] comic-title text-black text-sm sm:text-xl">
                                2nd
                            </div>
                        </div>
                        <div className="bg-[#e63329] border-[3px] border-black rounded-lg px-2 sm:px-5 py-1.5 sm:py-2 mt-4 text-white font-black whitespace-nowrap shadow-[0_5px_0_#111] relative comic-title text-xs sm:text-base w-full text-center">
                            <span className="relative z-10">2nd: {top2.name.split('_')[0]}</span>
                            <div className="absolute -left-3 sm:-left-4 top-[10%] bottom-[10%] w-3 sm:w-4 bg-[#b91c1c] border-[3px] border-r-0 border-black -z-10 skew-x-12"></div>
                            <div className="absolute -right-3 sm:-right-4 top-[10%] bottom-[10%] w-3 sm:w-4 bg-[#b91c1c] border-[3px] border-l-0 border-black -z-10 -skew-x-12"></div>
                        </div>
                        <div className="bg-black rounded-full border-[3px] border-gray-600 px-2 sm:px-4 py-1.5 flex items-center justify-center gap-1.5 mt-3 text-[10px] sm:text-xs font-black tracking-widest text-white shadow-[0_2px_0_#111] whitespace-nowrap w-[110%] relative z-0">
                            <Flame className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500 fill-orange-500" /> <span className="hidden sm:inline">FIRE LEVEL: </span>MASTER
                        </div>
                    </div>

                    {/* 1st Place */}
                    <div className="flex flex-col items-center z-20 w-[40%] max-w-[280px] hover:-translate-y-4 hover:scale-110 transition-all duration-300">
                        <div className="relative">
                            <img src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${top1.name}&backgroundColor=transparent`}
                                className="w-32 h-32 sm:w-48 sm:h-48 md:w-56 md:h-56 object-contain drop-shadow-[0_12px_8px_rgba(0,0,0,0.6)]" alt="1st place avatar" />
                        </div>
                        <div className="bg-[#e63329] border-4 border-black rounded-xl px-4 sm:px-8 py-2 sm:py-3 mt-4 text-white font-black whitespace-nowrap shadow-[0_8px_0_#111] relative comic-title text-sm sm:text-xl md:text-2xl transform sm:scale-110 w-full text-center z-10">
                            <span className="relative z-10">1st Place: {top1.name.split('_')[0]}</span>
                            <div className="absolute -left-4 sm:-left-5 top-[10%] bottom-[10%] w-4 sm:w-5 bg-[#b91c1c] border-y-4 border-l-4 border-black -z-10 skew-x-12"></div>
                            <div className="absolute -right-4 sm:-right-5 top-[10%] bottom-[10%] w-4 sm:w-5 bg-[#b91c1c] border-y-4 border-r-4 border-black -z-10 -skew-x-12"></div>
                        </div>
                        <div className="bg-black rounded-full border-[3px] border-gray-500 px-3 sm:px-5 py-2 mt-4 text-xs sm:text-sm font-black tracking-widest text-white shadow-[0_4px_0_#111] flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap w-[110%] relative z-0">
                            <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 fill-orange-500 animate-pulse" /> <span className="hidden sm:inline">FIRE LEVEL: </span>LEGEND
                        </div>
                    </div>

                    {/* 3rd Place */}
                    <div className="flex flex-col items-center z-10 w-[30%] max-w-[200px] transform translate-y-8 sm:translate-y-12 hover:-translate-y-2 hover:scale-105 transition-all duration-300">
                        <div className="relative">
                            <img src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${top3rd.name}&backgroundColor=transparent`}
                                className="w-24 h-24 sm:w-36 sm:h-36 object-contain drop-shadow-[0_8px_4px_rgba(0,0,0,0.5)]" alt="3rd place avatar" />
                            <div className="absolute -bottom-4 -left-3 sm:-left-6 w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br from-[#cd7f32] to-[#8b5a2b] rounded-full border-[3px] border-black flex items-center justify-center shadow-[0_4px_0_#111] comic-title text-white text-sm sm:text-xl transform -rotate-12">
                                3rd
                            </div>
                        </div>
                        <div className="bg-[#e63329] border-[3px] border-black rounded-lg px-2 sm:px-5 py-1.5 sm:py-2 mt-4 text-white font-black whitespace-nowrap shadow-[0_5px_0_#111] relative comic-title text-xs sm:text-base w-full text-center">
                            <span className="relative z-10">3rd: {top3rd.name.split('_')[0]}</span>
                            <div className="absolute -left-3 sm:-left-4 top-[10%] bottom-[10%] w-3 sm:w-4 bg-[#b91c1c] border-[3px] border-r-0 border-black -z-10 skew-x-12"></div>
                            <div className="absolute -right-3 sm:-right-4 top-[10%] bottom-[10%] w-3 sm:w-4 bg-[#b91c1c] border-[3px] border-l-0 border-black -z-10 -skew-x-12"></div>
                        </div>
                        <div className="bg-black rounded-full border-[3px] border-gray-600 px-2 sm:px-4 py-1.5 flex items-center justify-center gap-1.5 mt-3 text-[10px] sm:text-xs font-black tracking-widest text-white shadow-[0_2px_0_#111] whitespace-nowrap w-[110%] relative z-0">
                            <Flame className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500 fill-orange-500" /> <span className="hidden sm:inline">FIRE LEVEL: </span>ELITE
                        </div>
                    </div>
                </div>

                {/* ─── LIST ──────────────────────────────────────────── */}
                <div className="w-[95%] sm:w-[90%] max-w-5xl bg-white rounded-[24px] sm:rounded-[32px] border-[5px] border-black shadow-[0_20px_0_#111] flex flex-col relative z-20 mt-4 mb-4 flex-1 min-h-[300px] overflow-hidden">
                    <div className="p-4 sm:p-6 pb-2 border-b-[3px] border-gray-200 flex-shrink-0 bg-white shadow-sm z-10">
                        <h2 className="comic-title text-center text-2xl sm:text-3xl text-black tracking-wide">LEADERBOARD LIST</h2>
                    </div>

                    <div className="overflow-y-auto w-full custom-scrollbar flex-1 relative bg-white pb-6 pt-2">
                        {loading && <div className="absolute inset-0 flex items-center justify-center text-xl comic-title">Loading...</div>}

                        <table className="w-full text-left min-w-[600px] border-separate border-spacing-y-2 px-4 sm:px-8 relative">
                            <thead className="bg-white z-10">
                                <tr>
                                    <th className="py-2 px-6 font-black text-xs sm:text-sm uppercase text-gray-500 text-center w-16">Rank</th>
                                    <th className="py-2 px-4 font-black text-xs sm:text-sm uppercase text-gray-500 text-center w-20">Avatar</th>
                                    <th className="py-2 px-4 font-black text-xs sm:text-sm uppercase text-gray-500 w-[20%]">Username</th>
                                    <th className="py-2 px-6 font-black text-xs sm:text-sm uppercase text-gray-500 text-center w-[40%]">Fire Level</th>
                                    <th className="py-2 px-6 font-black text-xs sm:text-sm uppercase text-gray-500 text-center w-[20%]">Badge</th>
                                </tr>
                            </thead>
                            <tbody>
                                {others.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-gray-400 comic-title">No other players found in the hoard...</td>
                                    </tr>
                                )}
                                {others.map((u, i) => {
                                    // Calculate progress relative to rank 1 (capped at 100%, min 5%)
                                    const levelPct = Math.min(100, Math.max(5, Math.floor((u.totalPoints / top1Pct) * 100)));

                                    // Fun fake badges for visually matching the design
                                    let badgeLabel = "ADVANCED";
                                    if (u.rank && u.rank <= 5) badgeLabel = "EXPERT";
                                    else if (u.rank && u.rank <= 10) badgeLabel = "PRO";

                                    return (
                                        <tr key={u.id} className="hover:bg-gray-50/80 transition-colors group">
                                            <td className="py-3 px-6 comic-title text-xl sm:text-2xl text-black text-center">{u.rank}.</td>
                                            <td className="py-3 px-4 flex justify-center">
                                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#ffebee] rounded-full border-[3px] border-black shadow-[0_2px_0_#111] overflow-hidden flex items-center justify-center group-hover:-translate-y-1 transition-transform">
                                                    <img src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${u.name}&backgroundColor=transparent`} className="w-full h-full object-cover mt-1" alt="avatar" />
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 comic-title text-lg sm:text-xl text-black tracking-wide truncate max-w-[150px]">{u.name}</td>
                                            <td className="py-3 px-6">
                                                {/* Custom Progress Bar matching design */}
                                                <div className="flex items-center w-full max-w-[250px] mx-auto h-6 sm:h-7 bg-red-50 border-[3px] border-[#111] rounded-full relative z-0 shadow-[0_2px_0_rgba(255,255,255,1)] overflow-visible">

                                                    {/* The Red Fill */}
                                                    <div className="absolute left-0 top-0 bottom-0 bg-[#e63329] rounded-l-full flex items-center pl-3 sm:pl-4 font-bold text-[9px] sm:text-[11px] text-white tracking-widest z-10 transition-all duration-1000 ease-out border-y-[1px] border-l-[1px] border-[#c62020]"
                                                        style={{ width: `${levelPct}%` }}>
                                                        <span className="truncate pr-4 text-shadow-sm">Fire Level: {levelPct}%</span>
                                                    </div>

                                                    {/* The Black Pill Cap matching image */}
                                                    <div className="absolute top-1/2 -translate-y-1/2 w-4 sm:w-5 bg-black rounded-full z-20 border-[2px] border-black shadow-[0_2px_0_#555]"
                                                        style={{ left: `calc(${levelPct}% - 6px)`, height: '140%' }}></div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-6">
                                                <div className="flex items-center justify-center">
                                                    {/* Shield Badge matching design */}
                                                    <div className="bg-black text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-[20px] border-[3px] border-[#111] font-black text-[10px] sm:text-xs tracking-widest flex items-center justify-center gap-1.5 shadow-[0_3px_0_#555] group-hover:bg-[#222] transition-colors relative overflow-hidden min-w-[100px]">
                                                        <div className="absolute inset-x-1 inset-y-1 border-[1px] border-red-500/30 rounded-[16px] pointer-events-none"></div>
                                                        <Flame className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500 fill-orange-500 drop-shadow-md" /> {badgeLabel}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* ─── FOOTER ────────────────────────────────────────────── */}
            <footer className="bg-[#b91c1c] h-12 flex items-center justify-center gap-4 sm:gap-8 relative border-t-[5px] border-black z-50 text-white text-[10px] sm:text-xs font-bold w-full flex-shrink-0 px-4">
                <Link href="/privacy" className="hover:underline hover:text-yellow-200 transition-colors hidden sm:block">Privacy Policy</Link>
                <Link href="/terms" className="hover:underline hover:text-yellow-200 transition-colors hidden sm:block">Terms of Service</Link>
                <Link href="/contact" className="hover:underline hover:text-yellow-200 transition-colors hidden sm:block">Contact</Link>

                <span className="text-white/80 scale-90 sm:scale-100 font-medium">© 2024 Reading Adventure. All rights reserved.</span>

                {/* Cute Monster peeking from bottom matching design */}
                <div className="absolute bottom-0 right-[5%] sm:right-[15%] w-16 h-16 sm:w-20 sm:h-20 pointer-events-none overflow-hidden flex items-end">
                    <img src="https://api.dicebear.com/7.x/bottts/svg?seed=monstra&backgroundColor=transparent&primaryColor=e63329"
                        className="w-full h-[80%] object-cover object-top transform translate-y-2" alt="peeking monster" />
                </div>
            </footer>

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #d1d5db;
                    border-radius: 20px;
                    border: 2px solid white;
                }
                .text-shadow-sm {
                    text-shadow: 1px 1px 0 rgba(0,0,0,0.3);
                }
            `}} />
        </div>
    );
}
