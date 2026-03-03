"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { AnalyticsFilters } from './AnalyticsFilters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { Loader2 } from 'lucide-react';

export function GeoDrillDownTab() {
    const [loading, setLoading] = useState(false);

    // Data for charts
    const [schoolStats, setSchoolStats] = useState<any[]>([]);
    const [growthData, setGrowthData] = useState<any[]>([]);

    const [filters, setFilters] = useState({ district: '', taluka: '', schoolId: '' });

    // Fetch data when filters change
    useEffect(() => {
        async function fetchData() {
            if (!supabase) return;
            setLoading(true);

            try {
                // 1. School Stats (Bar Charts)
                let query = supabase.from('analytics_school_stats').select('*');

                if (filters.schoolId) {
                    query = query.eq('school_id', filters.schoolId);
                } else if (filters.taluka) {
                    query = query.eq('taluka', filters.taluka);
                } else if (filters.district) {
                    query = query.eq('district', filters.district);
                }

                const { data: schoolData } = await query.limit(20); // Limit to top 20 for readability
                setSchoolStats(schoolData || []);

                // 2. Growth Trends (Line Chart)
                // Since our view `analytics_monthly_growth` is global, we might need a more complex query 
                // or a different view for filtered growth. For MVP, we'll show global growth or filtered if possible.
                // Dynamic filtering on aggregated time-series usually requires a function or complex view.
                // We'll stick to the global `analytics_monthly_growth` for now as a baseline.
                const { data: growth } = await supabase
                    .from('analytics_monthly_growth')
                    .select('*')
                    .order('month', { ascending: true })
                    .limit(12);

                // Format dates
                const formattedGrowth = growth?.map(g => ({
                    ...g,
                    month: new Date(g.month).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
                })) || [];

                setGrowthData(formattedGrowth);

            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [filters]);

    return (
        <div className="space-y-6">
            <AnalyticsFilters onFilterChange={setFilters} />

            {loading ? (
                <div className="h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Books Read by School */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Books Read by School</h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={schoolStats}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="school_name" hide /> {/* Hide huge labels */}
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="unique_books_read" fill="#10B981" name="Books Read" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Active Students */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Active Students</h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={schoolStats}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="school_name" hide />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="participating_students" fill="#3B82F6" name="Students" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Growth Trend */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Growth Over Time (Sessions)</h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={growthData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="total_sessions" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 4 }} name="Total Sessions" />
                                    <Line type="monotone" dataKey="active_users" stroke="#F59E0B" strokeWidth={2} name="Active Users" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
