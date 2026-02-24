"use client";

import { useState } from 'react';
import { supabase, DBUser, AnalyticsStudentBook } from '@/lib/supabase';
import { Loader2, Search } from 'lucide-react';

export function StudentReportTab() {
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(false);
    const [students, setStudents] = useState<DBUser[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<DBUser | null>(null);
    const [readingHistory, setReadingHistory] = useState<any[]>([]);
    const [studentStats, setStudentStats] = useState<AnalyticsStudentBook | null>(null);

    async function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        if (!searchTerm || !supabase) return;
        setLoading(true);
        try {
            const { data } = await (supabase as any)
                .from('users')
                .select('*')
                .or(`name.ilike.%${searchTerm}%,mobile.ilike.%${searchTerm}%`)
                .limit(20);

            setStudents(data || []);
            setSelectedStudent(null);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function selectStudent(student: DBUser) {
        if (!supabase) return;
        setSelectedStudent(student);
        setLoading(true);
        try {
            // Fetch stats from view
            const { data: stats } = await (supabase as any)
                .from('analytics_student_books')
                .select('*')
                .eq('user_id', student.id)
                .single();

            setStudentStats(stats);

            // Fetch recent sessions
            const { data: history } = await (supabase as any)
                .from('reading_sessions')
                .select('*')
                .eq('user_id', student.id)
                .order('start_time', { ascending: false })
                .limit(50);

            setReadingHistory(history || []);

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
                <input
                    type="text"
                    placeholder="Search by student name or mobile..."
                    className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
                <button type="submit" className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    <Search className="w-5 h-5" />
                </button>
            </form>

            {loading && <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>}

            {students.length > 0 && !selectedStudent && !loading && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3 font-medium text-gray-500">Name</th>
                                <th className="px-6 py-3 font-medium text-gray-500">School ID</th>
                                <th className="px-6 py-3 font-medium text-gray-500">Grade</th>
                                <th className="px-6 py-3 font-medium text-gray-500">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {students.map(s => (
                                <tr key={s.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-3 font-medium">{s.name}</td>
                                    <td className="px-6 py-3 text-gray-500">{s.school_id}</td>
                                    <td className="px-6 py-3 text-gray-500">{s.grade || '-'}</td>
                                    <td className="px-6 py-3">
                                        <button
                                            onClick={() => selectStudent(s)}
                                            className="text-green-600 hover:text-green-800 font-medium"
                                        >
                                            View Report
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {selectedStudent && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{selectedStudent.name}</h2>
                            <p className="text-sm text-gray-500 mt-1">Grade: {selectedStudent.grade || 'N/A'} • Mobile: {selectedStudent.mobile}</p>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-gray-500">Total Points</div>
                            <div className="text-2xl font-bold text-green-600">{selectedStudent.total_points || 0}</div>
                        </div>
                    </div>

                    {studentStats && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                <span className="text-sm text-blue-600 font-medium">Books Read</span>
                                <div className="text-2xl font-bold text-blue-700">{studentStats.total_books_read}</div>
                            </div>
                            <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                                <span className="text-sm text-orange-600 font-medium">Pages Read</span>
                                <div className="text-2xl font-bold text-orange-700">{studentStats.total_pages_read}</div>
                            </div>
                            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                                <span className="text-sm text-purple-600 font-medium">Reading Time (hrs)</span>
                                <div className="text-2xl font-bold text-purple-700">{(studentStats.total_reading_time_seconds / 3600).toFixed(1)}</div>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b">
                            <h3 className="font-semibold text-gray-800">Reading History</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-3 font-medium text-gray-500">Date</th>
                                        <th className="px-6 py-3 font-medium text-gray-500">Book</th>
                                        <th className="px-6 py-3 font-medium text-gray-500">Duration</th>
                                        <th className="px-6 py-3 font-medium text-gray-500">Pages</th>
                                        <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {readingHistory.map(session => (
                                        <tr key={session.id}>
                                            <td className="px-6 py-3">{new Date(session.start_time).toLocaleDateString()}</td>
                                            <td className="px-6 py-3 font-medium">{session.book_title || 'Unknown Book'}</td>
                                            <td className="px-6 py-3">{Math.floor(session.duration_seconds / 60)}m {session.duration_seconds % 60}s</td>
                                            <td className="px-6 py-3">{session.pages_read}</td>
                                            <td className="px-6 py-3">
                                                {session.completed ?
                                                    <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">Completed</span>
                                                    : <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">In Progress</span>
                                                }
                                            </td>
                                        </tr>
                                    ))}
                                    {readingHistory.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No reading history found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
