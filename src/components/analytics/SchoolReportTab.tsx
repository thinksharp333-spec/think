"use client";

import { useState, useEffect } from 'react';
import { supabase, School } from '@/lib/supabase';
import { Loader2, Search, MapPin } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Dropdown } from '@/components/dropdown';
import { SCHOOLS_DATA } from '@/lib/schools-data';

// Location Data derived from SCHOOLS_DATA
const LOCATION_DATA = (() => {
    const data: any = {};
    SCHOOLS_DATA.forEach(school => {
        const state = school.state || 'Maharashtra';
        const district = school.district || 'Unknown';
        const taluka = school.taluka || 'Unknown';
        
        if (!data[state]) data[state] = {};
        if (!data[state][district]) data[state][district] = {};
        if (!data[state][district][taluka]) data[state][district][taluka] = [];
        
        if (data[state][district][taluka].indexOf(school.school_name) === -1) {
             data[state][district][taluka].push(school.school_name);
        }
    });
    return data;
})();

export function SchoolReportTab() {
    const [loading, setLoading] = useState(false);
    const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
    const [schoolStats, setSchoolStats] = useState<any>(null);
    const [bookStats, setBookStats] = useState<any[]>([]);
    const [subjectStats, setSubjectStats] = useState<any[]>([]);

    // Tiered Location State
    const [selectedState, setSelectedState] = useState("");
    const [selectedDistrict, setSelectedDistrict] = useState("");
    const [selectedTaluka, setSelectedTaluka] = useState("");
    const [selectedSchoolName, setSelectedSchoolName] = useState("");

    const stateOptions = Object.keys(LOCATION_DATA).map(s => ({ value: s, label: s }));
    const districtOptions = selectedState ? Object.keys(LOCATION_DATA[selectedState] || {}).map(d => ({ value: d, label: d })) : [];
    const talukaOptions = selectedDistrict ? Object.keys(LOCATION_DATA[selectedState]?.[selectedDistrict] || {}).map(t => ({ value: t, label: t })) : [];
    const schoolOptions = selectedTaluka ? (LOCATION_DATA[selectedState]?.[selectedDistrict]?.[selectedTaluka] || []).map((s: string) => ({ value: s, label: s })) : [];

    // Determine color based on index
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    // When a school is selected from dropdown, fetch its full object
    useEffect(() => {
        async function getFullSchool() {
            if (!selectedSchoolName || !supabase) return;
            const { data } = await supabase
                .from('schools')
                .select('*')
                .eq('school_name', selectedSchoolName)
                .eq('district', selectedDistrict)
                .eq('taluka', selectedTaluka)
                .maybeSingle();
            
            if (data) setSelectedSchool(data);
        }
        getFullSchool();
    }, [selectedSchoolName, selectedDistrict, selectedTaluka]);

    // Cleanup search effects as we use dropdowns now

    useEffect(() => {
        async function fetchSchoolDetails() {
            const client = supabase;
            if (!selectedSchool || !client) return;
            setLoading(true);
            try {
                // 1. Basic Stats (Total Students, Active)
                const { count: totalStudents } = await client
                    .from('users')
                    .select('*', { count: 'exact', head: true })
                    .eq('school_id', selectedSchool.id);

                const { count: activeStudents } = await client
                    .from('analytics_school_active_students')
                    .select('active_students_last_30d', { count: 'exact', head: true }) // View structure might need adjustment depending on how we select
                    .eq('school_id', selectedSchool.id);

                // 2. Books by Level/Subject
                // Fetch sessions for this school's students to get real distribution
                const { data: sessionsData } = await client
                    .from('reading_sessions')
                    .select('book_id, book_title')
                    .in('user_id', (
                        await client.from('users').select('id').eq('school_id', selectedSchool.id)
                    ).data?.map(u => u.id) || []);

                if (sessionsData && sessionsData.length > 0) {
                    // Group by book_id to get levels and subjects
                    const { data: booksInfo } = await client
                        .from('books')
                        .select('id, level, subject')
                        .in('id', Array.from(new Set(sessionsData.map(s => s.book_id))));

                    const levelCounts: Record<string, number> = {};
                    const subjectCounts: Record<string, number> = {};

                    sessionsData.forEach(s => {
                        const book = booksInfo?.find(b => String(b.id) === String(s.book_id));
                        
                        const level = book?.level ? `Level ${book.level}` : 'Unknown';
                        levelCounts[level] = (levelCounts[level] || 0) + 1;

                        const subject = book?.subject || 'Other';
                        subjectCounts[subject] = (subjectCounts[subject] || 0) + 1;
                    });

                    setBookStats(Object.entries(levelCounts).map(([name, value]) => ({ name, value })));
                    setSubjectStats(Object.entries(subjectCounts).map(([name, value]) => ({ name, value })));
                } else {
                    setBookStats([]);
                    setSubjectStats([]);
                }

                // 3. Overall Stats from View
                const { data: stats } = await client
                    .from('analytics_school_stats')
                    .select('*')
                    .eq('school_id', selectedSchool.id)
                    .maybeSingle();

                setSchoolStats({
                    totalStudents: totalStudents || 0,
                    totalSessions: stats?.total_sessions || 0,
                    uniqueBooks: stats?.unique_books_read || 0,
                    participatingStudents: stats?.participating_students || 0
                });

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
            {/* Tiered Dropdowns */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Dropdown 
                    label="Select State" 
                    options={stateOptions} 
                    value={selectedState} 
                    onChange={(val) => { setSelectedState(val); setSelectedDistrict(""); setSelectedTaluka(""); setSelectedSchoolName(""); setSelectedSchool(null); }} 
                    className="w-full" 
                    variant="light"
                />
                <Dropdown 
                    label="Select District" 
                    options={districtOptions} 
                    value={selectedDistrict} 
                    onChange={(val) => { setSelectedDistrict(val); setSelectedTaluka(""); setSelectedSchoolName(""); setSelectedSchool(null); }} 
                    className="w-full" 
                    variant="light"
                />
                <Dropdown 
                    label="Select Taluka" 
                    options={talukaOptions} 
                    value={selectedTaluka} 
                    onChange={(val) => { setSelectedTaluka(val); setSelectedSchoolName(""); setSelectedSchool(null); }} 
                    className="w-full" 
                    variant="light"
                />
                <Dropdown 
                    label="Select School" 
                    options={schoolOptions} 
                    value={selectedSchoolName} 
                    onChange={(val) => setSelectedSchoolName(val)} 
                    className="w-full" 
                    variant="light"
                />
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

                        {/* Subject Distribution */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-semibold mb-4">Subject Distribution</h3>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={subjectStats} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={100} fontSize={10} />
                                        <Tooltip />
                                        <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
