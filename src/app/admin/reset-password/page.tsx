"use client";

import { useState, useEffect } from "react";
import { Search, Lock, Loader2, GraduationCap } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Student {
    id: string;
    name: string;
    school?: string;
    grade?: string;
    totalPoints: number;
}

export default function ResetPasswordPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const [modal, setModal] = useState<{ id: string; name: string } | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        if (!supabase) { setLoading(false); return; }
        (async () => {
            const { data } = await supabase
                .from('users')
                .select('id, name, school, grade, totalPoints')
                .order('name', { ascending: true });
            if (data) setStudents(data as Student[]);
            setLoading(false);
        })();
    }, []);

    const filtered = (() => {
        const q = search.toLowerCase();
        if (!q) return students;
        return students.filter(s =>
            (s.name || '').toLowerCase().includes(q) ||
            (s.school || '').toLowerCase().includes(q)
        );
    })();

    const openModal = (s: Student) => {
        setModal({ id: s.id, name: s.name });
        setNewPassword('');
        setMessage(null);
    };

    const handleReset = async () => {
        if (!modal || !newPassword) return;
        setSubmitting(true);
        setMessage(null);
        try {
            const res = await fetch('/api/admin/reset-student-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentId: modal.id, newPassword }),
            });
            if (res.ok) {
                setMessage({ type: 'success', text: `Password reset for ${modal.name}.` });
                setNewPassword('');
                setTimeout(() => { setModal(null); setMessage(null); }, 1600);
            } else {
                const data = await res.json();
                setMessage({ type: 'error', text: data.error || 'Failed to reset password.' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Network error. Try again.' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Lock className="w-6 h-6 text-orange-500" />
                        Reset Password
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Find a student and set a temporary password for them
                    </p>
                </div>

                {/* Search */}
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search by name or school…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-orange-500/20 outline-none shadow-sm"
                    />
                </div>
            </div>

            {/* Student count badge */}
            {!loading && (
                <p className="text-xs text-gray-400 font-medium">
                    Showing <span className="font-bold text-gray-600">{filtered.length}</span>
                    {search ? ` of ${students.length}` : ''} student{students.length !== 1 ? 's' : ''}
                </p>
            )}

            {/* Table card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="py-20 flex flex-col items-center gap-3 text-gray-300">
                        <Loader2 className="w-7 h-7 animate-spin" />
                        <span className="text-sm">Loading students…</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-20 flex flex-col items-center gap-3 text-gray-400">
                        <GraduationCap className="w-10 h-10 text-gray-200" />
                        <p className="text-sm font-medium">
                            {search ? 'No students match your search.' : 'No students registered yet.'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-5 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Student</th>
                                    <th className="px-5 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider">School</th>
                                    <th className="px-5 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Grade</th>
                                    <th className="px-5 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Points</th>
                                    <th className="px-5 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map(student => (
                                    <tr key={student.id} className="hover:bg-orange-50/30 transition-colors">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                                                    <span className="text-sm font-bold text-orange-500">
                                                        {(student.name || '?')[0].toUpperCase()}
                                                    </span>
                                                </div>
                                                <span className="font-semibold text-gray-900">{student.name || '—'}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-gray-500 max-w-[200px] truncate">
                                            {student.school || '—'}
                                        </td>
                                        <td className="px-5 py-4 text-center text-gray-500">
                                            {student.grade ? `Grade ${student.grade}` : '—'}
                                        </td>
                                        <td className="px-5 py-4 text-center font-semibold text-blue-600">
                                            {student.totalPoints ?? 0}
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <button
                                                onClick={() => openModal(student)}
                                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-orange-50 text-orange-600 border border-orange-200 rounded-lg text-xs font-bold hover:bg-orange-100 transition-colors"
                                            >
                                                <Lock className="w-3 h-3" />
                                                Reset
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {modal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                    onClick={() => setModal(null)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
                                <Lock className="w-5 h-5 text-orange-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800">Reset Password</h3>
                                <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[220px]">{modal.name}</p>
                            </div>
                        </div>

                        <input
                            type="text"
                            placeholder="New temporary password"
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-orange-500/20 outline-none mb-3"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            autoFocus
                            onKeyDown={e => { if (e.key === 'Enter') handleReset(); }}
                        />

                        {message && (
                            <p className={`text-xs font-semibold mb-3 ${message.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                                {message.text}
                            </p>
                        )}

                        <div className="flex gap-2">
                            <button
                                onClick={handleReset}
                                disabled={submitting || !newPassword}
                                className="flex-1 bg-orange-500 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-orange-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                            >
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Set Password'}
                            </button>
                            <button
                                onClick={() => setModal(null)}
                                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
