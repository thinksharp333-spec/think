"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MapChart } from './MapChart';
import { Users, BookOpen, Trophy, TrendingUp, Loader2, RefreshCw } from 'lucide-react';

export function OverviewTab() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalStudents: 0,
        totalBooksRead: 0,
        topSubject: 'N/A',
        topSchool: 'N/A'
    });
    const [districtData, setDistrictData] = useState<Record<string, number>>({});

    const fetchOverviewStats = async () => {
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

            // 5. District Data for Heatmap
            const { data: districts } = await supabase
                .from('analytics_school_stats')
                .select('district, participating_students');
            
            if (districts) {
                const agg: Record<string, number> = {};
                districts.forEach(d => {
                    if (d.district) {
                        agg[d.district] = (agg[d.district] || 0) + d.participating_students;
                    }
                });
                setDistrictData(agg);
            }

            setStats({
                totalStudents: studentCount || 0,
                totalBooksRead: booksCount || 0,
                topSubject: topBooks?.[0]?.grade_level || topBooks?.[0]?.level || 'N/A', 
                topSchool: topSchool?.[0]?.school_name || 'N/A'
            });

        } catch (error) {
            console.error("Error fetching overview stats:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
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
            {/* Header with Refresh */}
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">Analytics Overview</h2>
                <button 
                    onClick={() => {
                        setLoading(true);
                        fetchOverviewStats();
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh Data
                </button>
            </div>

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
                    <MapChart data={districtData} />
                </div>
            </div>
        </div>
    );
}
