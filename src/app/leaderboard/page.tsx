"use client";

import { useState } from 'react';
import { ArrowLeft, Trophy, Medal, Crown } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/hooks/useUser';

// Mock Data
const MOCK_LEADERBOARD = [
    { id: '1', name: "Aarav Patel", points: 1250, booksRead: 15, rank: 1 },
    { id: '2', name: "Priya Sharma", points: 1100, booksRead: 14, rank: 2 },
    { id: '3', name: "Rahul Kumar", points: 950, booksRead: 10, rank: 3 },
    { id: '4', name: "Sneha Gupta", points: 800, booksRead: 8, rank: 4 },
    { id: '5', name: "Vikram Singh", points: 750, booksRead: 7, rank: 5 },
    { id: '6', name: "Ananya Das", points: 600, booksRead: 6, rank: 6 },
    { id: '7', name: "YOU", points: 450, booksRead: 4, rank: 7 },
    { id: '8', name: "Rohan Verma", points: 400, booksRead: 3, rank: 8 },
];

export default function LeaderboardPage() {
    const [filter, setFilter] = useState<'daily' | 'weekly' | 'all'>('weekly');
    const [metric, setMetric] = useState<'points' | 'books'>('points');
    const { user } = useUser();

    // Map REAL user data into the "YOU" slot, then sort
    const sortedLeaderboard = [...MOCK_LEADERBOARD].map(u => {
        if (u.id === '7') {
           return {
               ...u,
               points: user ? (user.totalPoints || 0) : u.points,
               booksRead: user ? (user.booksRead || 0) : u.booksRead
           };
        }
        return u;
    }).sort((a, b) => metric === 'points' ? b.points - a.points : b.booksRead - a.booksRead)
      .map((u, index) => ({ ...u, rank: index + 1 }));

    const topThree = sortedLeaderboard.slice(0, 3);
    const top1 = topThree[0];
    const top2 = topThree[1];
    const top3 = topThree[2];
    const restOfList = sortedLeaderboard.slice(3);

    return (
        <main className="min-h-screen bg-gray-50 pb-6">
            {/* Header */}
            <header className="bg-green-600 text-white p-6 pb-12 rounded-b-[2.5rem] shadow-lg relative z-10">
                <div className="flex flex-col items-center mb-6">
                    <div className="flex w-full items-center justify-between mb-4">
                        <Link href="/" className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors">
                            <ArrowLeft className="w-6 h-6" />
                        </Link>
                        <h1 className="text-xl font-bold">Leaderboard</h1>
                        <div className="w-10" /> {/* Spacer */}
                    </div>
                    
                    {/* Metric Toggle */}
                    <div className="bg-green-700/50 p-1 rounded-full flex gap-1 w-full max-w-[240px]">
                        <button 
                            onClick={() => setMetric('points')}
                            className={`flex-1 py-1.5 text-sm font-bold rounded-full transition-all ${metric === 'points' ? 'bg-white text-green-700 shadow-sm' : 'text-green-100 hover:text-white'}`}
                        >
                            Total Points
                        </button>
                        <button 
                            onClick={() => setMetric('books')}
                            className={`flex-1 py-1.5 text-sm font-bold rounded-full transition-all ${metric === 'books' ? 'bg-white text-green-700 shadow-sm' : 'text-green-100 hover:text-white'}`}
                        >
                            Books Read
                        </button>
                    </div>
                </div>

                {/* Top 3 Podium */}
                <div className="flex items-end justify-center gap-4 mb-4">
                    {/* Rank 2 */}
                    {top2 && (
                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-green-200 border-4 border-white rounded-full flex items-center justify-center text-green-800 font-bold mb-2 shadow-md relative">
                            <span className="text-xl">{top2.name.split(' ').map(n=>n[0]).join('')}</span>
                            <div className="absolute -bottom-2 bg-gray-300 text-gray-700 text-xs font-bold px-2 py-0.5 rounded-full">2</div>
                        </div>
                        <p className="text-sm font-medium text-green-100 max-w-[80px] truncate">{top2.name.split(' ')[0]}</p>
                        <p className="text-sm font-bold">{metric === 'points' ? top2.points : top2.booksRead}</p>
                    </div>
                    )}

                    {/* Rank 1 */}
                    {top1 && (
                    <div className="flex flex-col items-center -mt-8">
                        <Crown className="w-8 h-8 text-yellow-300 mb-1 fill-yellow-300" />
                        <div className="w-20 h-20 bg-yellow-100 border-4 border-yellow-300 rounded-full flex items-center justify-center text-yellow-800 font-bold mb-2 shadow-lg relative">
                            <span className="text-2xl">{top1.name.split(' ').map(n=>n[0]).join('')}</span>
                            <div className="absolute -bottom-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full">1</div>
                        </div>
                        <p className="text-base font-bold text-white max-w-[90px] truncate">{top1.name.split(' ')[0]}</p>
                        <p className="text-lg font-bold">{metric === 'points' ? top1.points : top1.booksRead}</p>
                    </div>
                    )}

                    {/* Rank 3 */}
                    {top3 && (
                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-orange-100 border-4 border-white rounded-full flex items-center justify-center text-orange-800 font-bold mb-2 shadow-md relative">
                            <span className="text-xl">{top3.name.split(' ').map(n=>n[0]).join('')}</span>
                            <div className="absolute -bottom-2 bg-orange-300 text-orange-900 text-xs font-bold px-2 py-0.5 rounded-full">3</div>
                        </div>
                        <p className="text-sm font-medium text-green-100 max-w-[80px] truncate">{top3.name.split(' ')[0]}</p>
                        <p className="text-sm font-bold">{metric === 'points' ? top3.points : top3.booksRead}</p>
                    </div>
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
                {restOfList.map((user) => (
                    <div
                        key={user.id}
                        className={`flex items-center gap-4 p-3 rounded-xl border ${user.id === '7' ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100'
                            } shadow-sm`}
                    >
                        <div className="w-8 text-center font-bold text-gray-400">#{user.rank}</div>
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500">
                            {user.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="flex-1">
                            <p className={`font-semibold ${user.id === '7' ? 'text-green-900' : 'text-gray-800'}`}>
                                {user.name}
                            </p>
                        </div>
                        <div className="font-bold text-gray-600 flex items-center gap-1">
                            {metric === 'points' ? user.points : user.booksRead}
                            <span className="text-[10px] text-gray-400 uppercase">{metric === 'points' ? 'pts' : 'books'}</span>
                        </div>
                    </div>
                ))}
            </div>
        </main>
    );
}
