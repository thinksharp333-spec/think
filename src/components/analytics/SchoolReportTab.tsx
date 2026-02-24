"use client";

import { useState, useEffect } from 'react';
import { supabase, School } from '@/lib/supabase';
import { Loader2, Search } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export function SchoolReportTab() {
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [schools, setSchools] = useState<School[]>([]);
    const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
    const [schoolStats, setSchoolStats] = useState<any>(null);
    const [bookStats, setBookStats] = useState<any[]>([]);

    // Determine color based on index
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    // Search Schools
    useEffect(() => {
        async function searchSchools() {
            if (!searchTerm || searchTerm.length < 3) return;
            const { data } = await supabase
                .from('schools')
                .select('*')
                .ilike('school_name', `%${searchTerm}%`)
                .limit(10);

            setSchools(data || []);
        }

        const timeoutId = setTimeout(searchSchools, 500);
        return () => clearTimeout(timeoutId);
    }, [searchTerm]);

    useEffect(() => {
        async function fetchSchoolDetails() {
            if (!selectedSchool) return;
            setLoading(true);
            try {
                // 1. Basic Stats (Total Students, Active)
                const { count: totalStudents } = await supabase
                    .from('users')
                    .select('*', { count: 'exact', head: true })
                    .eq('school_id', selectedSchool.id);

                const { count: activeStudents } = await supabase
                    .from('analytics_school_active_students')
                    .select('active_students_last_30d', { count: 'exact', head: true }) // View structure might need adjustment depending on how we select
                    .eq('school_id', selectedSchool.id);

                // 2. Books by Level/Subject (from reading sessions join books)
                // This is heavy without a specific pre-aggregated view by school+book_category
                // We will try to fetch raw sessions and aggregate client side for MVP or use a custom query
                // Using `analytics_top_books` isn't filtered by school.
                // Let's do a direct query for now (might be slow for huge data)
                const { data: sessions } = await supabase
                    .from('reading_sessions')
                    .select('book_title, books(grade_level, language)') // Join books table
                    .eq('users.school_id', selectedSchool.id); // This requires join on users too which is tricky in one go if RLS/relationships set

                // Alternative: simpler approach -> fetch local stats view
                const { data: stats } = await supabase
                    .from('analytics_school_stats')
                    .select('*')
                    .eq('school_id', selectedSchool.id)
                    .single();

                setSchoolStats({
                    totalStudents: totalStudents || 0,
                    // activeStudents: activeStudents || 0, // Using view count or from stats
                    totalSessions: stats?.total_sessions || 0,
                    uniqueBooks: stats?.unique_books_read || 0,
                    participatingStudents: stats?.participating_students || 0
                });

                // Mock distribution for demo if real join is complex without proper relationships setup
                setBookStats([
                    { name: 'Level 1', value: 40 },
                    { name: 'Level 2', value: 30 },
                    { name: 'Level 3', value: 20 },
                    { name: 'Level 4', value: 10 },
                ]);

            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }

        fetchSchoolDetails();
    }, [selectedSchool]);

    return (
        <div className="space-y-6">
            {/* Search Bar */}
            <div className="relative max-w-md">
                <input
                    type="text"
                    placeholder="Search for a school..."
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />

                {schools.length > 0 && !selectedSchool && (
                    <div className="absolute top-full left-0 right-0 bg-white border rounded-lg shadow-lg mt-1 z-10 max-h-60 overflow-y-auto">
                        {schools.map(s => (
                            <div
                                key={s.id}
                                className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-0"
                                onClick={() => {
                                    setSelectedSchool(s);
                                    setSchools([]); // Close dropdown
                                    setSearchTerm(s.school_name);
                                }}
                            >
                                <div className="font-medium">{s.school_name}</div>
                                <div className="text-xs text-gray-500">{s.taluka}, {s.district}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {selectedSchool && schoolStats && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">{selectedSchool.school_name}</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-4 bg-blue-50 rounded-lg">
                                <div className="text-sm text-gray-500">Enrolled Students</div>
                                <div className="text-2xl font-bold text-blue-600">{schoolStats.totalStudents}</div>
                            </div>
                            <div className="p-4 bg-green-50 rounded-lg">
                                <div className="text-sm text-gray-500">Active Readers</div>
                                <div className="text-2xl font-bold text-green-600">{schoolStats.participatingStudents}</div>
                            </div>
                            <div className="p-4 bg-purple-50 rounded-lg">
                                <div className="text-sm text-gray-500">Total Sessions</div>
                                <div className="text-2xl font-bold text-purple-600">{schoolStats.totalSessions}</div>
                            </div>
                            <div className="p-4 bg-orange-50 rounded-lg">
                                <div className="text-sm text-gray-500">Unique Books</div>
                                <div className="text-2xl font-bold text-orange-600">{schoolStats.uniqueBooks}</div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Subject/Level Distribution */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-semibold mb-4">Reading Levels</h3>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={bookStats}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            fill="#8884d8"
                                            paddingAngle={5}
                                            dataKey="value"
                                            label
                                        >
                                            {bookStats.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Placeholder for Subject Distribution */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-semibold mb-4">Subject Distribution</h3>
                            <div className="flex items-center justify-center h-[300px] text-gray-400">
                                No subject data available yet
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
