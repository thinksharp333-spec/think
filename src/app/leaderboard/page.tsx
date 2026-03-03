"use client";

import { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Medal, Crown, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/hooks/useUser';

interface LeaderboardUser {
    id: string;
    name: string;
    totalPoints: number;
    rank?: number;
}

export default function LeaderboardPage() {
    const { user: currentUser } = useUser();
    const [filter, setFilter] = useState<'daily' | 'weekly' | 'all'>('weekly');
    const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            if (!supabase) return;
            setLoading(true);
            try {
                // Fetch top 50 users by points
                const { data, error } = await supabase
                    .from('users')
                    .select('id, name, totalPoints')
                    .order('totalPoints', { ascending: false })
                    .limit(50);

                if (error) throw error;

                if (data) {
                    const mappedData = data.map((u, index) => ({
                        id: u.id,
                        name: u.name || 'Anonymous',
                        totalPoints: u.totalPoints || 0,
                        rank: index + 1
                    }));
                    setLeaderboard(mappedData);
                }
            } catch (err) {
                console.error("Failed to fetch leaderboard:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, []);

    const top3 = leaderboard.slice(0, 3);
    const others = leaderboard.slice(3);

    return (
        <main className="min-h-screen bg-gray-50 pb-6">
            {/* Header */}
            <header className="bg-green-600 text-white p-6 pb-12 rounded-b-[2.5rem] shadow-lg relative z-10">
                <div className="flex items-center justify-between mb-6">
                    <Link href="/" className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="text-xl font-bold">Leaderboard</h1>
                    <div className="w-10" /> {/* Spacer */}
                </div>

                {/* Top 3 Podium */}
                <div className="flex items-end justify-center gap-4 mb-4 min-h-[160px]">
                    {loading ? (
                        <div className="flex items-center justify-center h-40">
                            <Loader2 className="w-8 h-8 animate-spin text-white/50" />
                        </div>
                    ) : leaderboard.length === 0 ? (
                        <p className="text-white/60 text-sm italic">No ranking data yet</p>
                    ) : (
                        <>
                            {/* Rank 2 */}
                            {top3[1] && (
                                <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                                    <div className="w-16 h-16 bg-green-200 border-4 border-white rounded-full flex items-center justify-center text-green-800 font-bold mb-2 shadow-md relative">
                                        <span className="text-xl">{top3[1].name.substring(0, 2).toUpperCase()}</span>
                                        <div className="absolute -bottom-2 bg-gray-300 text-gray-700 text-xs font-bold px-2 py-0.5 rounded-full">2</div>
                                    </div>
                                    <p className="text-sm font-medium text-green-100 max-w-[80px] truncate">{top3[1].name.split(' ')[0]}</p>
                                    <p className="text-sm font-bold">{top3[1].totalPoints}</p>
                                </div>
                            )}

                            {/* Rank 1 */}
                            {top3[0] && (
                                <div className="flex flex-col items-center -mt-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
                                    <Crown className="w-8 h-8 text-yellow-300 mb-1 fill-yellow-300" />
                                    <div className="w-20 h-20 bg-yellow-100 border-4 border-yellow-300 rounded-full flex items-center justify-center text-yellow-800 font-bold mb-2 shadow-lg relative">
                                        <span className="text-2xl">{top3[0].name.substring(0, 2).toUpperCase()}</span>
                                        <div className="absolute -bottom-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full">1</div>
                                    </div>
                                    <p className="text-base font-bold text-white max-w-[90px] truncate">{top3[0].name.split(' ')[0]}</p>
                                    <p className="text-lg font-bold">{top3[0].totalPoints}</p>
                                </div>
                            )}

                            {/* Rank 3 */}
                            {top3[2] && (
                                <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                                    <div className="w-16 h-16 bg-orange-100 border-4 border-white rounded-full flex items-center justify-center text-orange-800 font-bold mb-2 shadow-md relative">
                                        <span className="text-xl">{top3[2].name.substring(0, 2).toUpperCase()}</span>
                                        <div className="absolute -bottom-2 bg-orange-300 text-orange-900 text-xs font-bold px-2 py-0.5 rounded-full">3</div>
                                    </div>
                                    <p className="text-sm font-medium text-green-100 max-w-[80px] truncate">{top3[2].name.split(' ')[0]}</p>
                                    <p className="text-sm font-bold">{top3[2].totalPoints}</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </header>

            {/* Filter Tabs */}
            <div className="flex justify-center -mt-6 mb-6 relative z-20">
                <div className="bg-white p-1 rounded-full shadow-md flex">
                    {(['daily', 'weekly', 'all'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${filter === f ? 'bg-green-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="px-4 space-y-3">
                {others.map((u) => (
                    <div
                        key={u.id}
                        className={`flex items-center gap-4 p-3 rounded-xl border ${u.id === currentUser?.id ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100'
                            } shadow-sm transition-all hover:scale-[1.01]`}
                    >
                        <div className="w-8 text-center font-bold text-gray-400">#{u.rank}</div>
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500">
                            {u.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="flex-1">
                            <p className={`font-semibold ${u.id === currentUser?.id ? 'text-green-900' : 'text-gray-800'}`}>
                                {u.id === currentUser?.id ? `${u.name} (YOU)` : u.name}
                            </p>
                        </div>
                        <div className="font-bold text-gray-600 flex items-center gap-1">
                            {u.totalPoints}
                            <span className="text-[10px] text-gray-400 uppercase">pts</span>
                        </div>
                    </div>
                ))}

                {!loading && others.length === 0 && top3.length === 0 && (
                    <div className="text-center py-10 opacity-50">
                        <Trophy className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p>No active students in the rankings yet.</p>
                    </div>
                )}
            </div>
        </main>
    );
}
