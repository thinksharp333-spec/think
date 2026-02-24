"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MapChart } from './MapChart';
import { Users, BookOpen, Trophy, TrendingUp, Loader2 } from 'lucide-react';

export function OverviewTab() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalStudents: 0,
        totalBooksRead: 0,
        topSubject: 'N/A',
        topSchool: 'N/A'
    });

    useEffect(() => {
        async function fetchOverviewStats() {
            if (!supabase) return;

            try {
                // Parallel fetch for KPIs
                // 1. Total Students
                const { count: studentCount } = await supabase
                    .from('users')
                    .select('*', { count: 'exact', head: true });

                // 2. Total Books Read (All time for now, or this month)
                const { count: booksCount } = await supabase
                    .from('reading_sessions')
                    .select('*', { count: 'exact', head: true });

                // 3. Top Subject (Most read book category/subject)
                // This is harder without a direct aggregation, we might need a stored procedure or view.
                // For MVP, we'll try to use the 'analytics_student_books' view or similar if available,
                // or just placeholder/simple query on books table joined with sessions.
                // Let's use a dummy for now or try to query the top books view.
                const { data: topBooks } = await supabase
                    .from('analytics_top_books')
                    .select('*')
                    .limit(1);

                // 4. Top School
                const { data: topSchool } = await supabase
                    .from('analytics_school_stats')
                    .select('*')
                    .order('total_sessions', { ascending: false })
                    .limit(1);

                setStats({
                    totalStudents: studentCount || 0,
                    totalBooksRead: booksCount || 0,
                    topSubject: topBooks?.[0]?.grade_level || 'General', // Using Grade Level as proxy for "Subject" if subject missing
                    topSchool: topSchool?.[0]?.school_name || 'N/A'
                });

            } catch (error) {
                console.error("Error fetching overview stats:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchOverviewStats();
    }, []);

    if (loading) {
        return <div className="h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>;
    }

    const cards = [
        { label: 'Total Students', value: stats.totalStudents, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Total Books Read', value: stats.totalBooksRead, icon: BookOpen, color: 'text-green-600', bg: 'bg-green-50' },
        { label: 'Most Popular Level', value: stats.topSubject, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
        { label: 'Top Performing School', value: stats.topSchool, icon: Trophy, color: 'text-orange-600', bg: 'bg-orange-50' },
    ];

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {cards.map((card, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">{card.label}</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-1">{card.value}</h3>
                        </div>
                        <div className={`p-3 rounded-lg ${card.bg}`}>
                            <card.icon className={`w-6 h-6 ${card.color}`} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Map Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Regional Impact</h3>
                <div className="h-[400px]">
                    <MapChart data={{}} /> {/* Pass actual district data here later */}
                </div>
            </div>
        </div>
    );
}
