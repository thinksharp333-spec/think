"use client";

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Loader2, Download, Quote } from 'lucide-react';
import { AnalyticsFilters } from './AnalyticsFilters';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

export function PitchReportTab() {
    const reportRef = useRef<HTMLDivElement>(null);
    const [generating, setGenerating] = useState(false);
    const [loading, setLoading] = useState(false);

    // Inputs
    const [quote, setQuote] = useState("Empowering rural India through the joy of reading.");
    const [filters, setFilters] = useState({ district: '', taluka: '', schoolId: '' });

    // Data
    const [stats, setStats] = useState({
        totalStudents: 0,
        booksRead: 0,
        schoolsReached: 0,
        activeRate: 0
    });
    const [growthData, setGrowthData] = useState<any[]>([]);
    const [topSubjects, setTopSubjects] = useState<any[]>([]);

    useEffect(() => {
        // Fetch aggregated data based on filters
        async function fetchData() {
            setLoading(true);
            try {
                // Mocking filtered fetching for now as we reuse existing views
                // Real implementation would filter 'analytics_school_stats' by district/taluka and sum up

                // 1. KPI Totals
                // fetch...

                // 2. Growth
                // fetch...

                // 3. Subjects
                // fetch...

                // Simulating data update
                setStats({
                    totalStudents: 1250,
                    booksRead: 5400,
                    schoolsReached: 12,
                    activeRate: 78
                });
                setGrowthData([
                    { month: 'Jan', value: 100 },
                    { month: 'Feb', value: 300 },
                    { month: 'Mar', value: 450 },
                ]);
                setTopSubjects([
                    { name: 'Science', value: 40 },
                    { name: 'History', value: 30 },
                    { name: 'Stories', value: 20 }
                ]);

            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [filters]);

    const downloadPDF = async () => {
        if (!reportRef.current) return;
        setGenerating(true);
        try {
            const canvas = await html2canvas(reportRef.current, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`ThinkSharp_Pitch_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (err) {
            console.error("PDF generation failed", err);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="flex flex-col xl:flex-row gap-8 items-start">
            {/* Controls Side */}
            <div className="w-full xl:w-1/3 space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold mb-4">Report Settings</h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Region Filter</label>
                            <AnalyticsFilters onFilterChange={setFilters} />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Custom Quote</label>
                            <textarea
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
                                rows={3}
                                value={quote}
                                onChange={e => setQuote(e.target.value)}
                            />
                        </div>

                        <button
                            onClick={downloadPDF}
                            disabled={generating}
                            className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center justify-center gap-2"
                        >
                            {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                            Download Pitch Report
                        </button>
                    </div>
                </div>
            </div>

            {/* Preview Side (A4 Aspect Ratio) */}
            <div className="w-full xl:w-2/3 flex justify-center bg-gray-100 p-8 rounded-xl overflow-auto">
                <div
                    ref={reportRef}
                    className="w-[210mm] min-h-[297mm] bg-white shadow-lg p-12 text-gray-800 relative flex flex-col justify-between"
                    style={{ transform: 'scale(1)', transformOrigin: 'top center' }}
                >
                    {/* Header */}
                    <div className="flex justify-between items-center border-b pb-6 mb-8">
                        <div>
                            <h1 className="text-4xl font-bold text-green-700">ThinkSharp Foundation</h1>
                            <p className="text-gray-500 mt-1">Transforming Education in Rural India</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-400">IMPACT REPORT</p>
                            <p className="font-medium text-lg">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                        </div>
                    </div>

                    {/* Reach Section */}
                    <div className="mb-12">
                        <h2 className="text-xl font-bold uppercase tracking-wider text-green-800 mb-6 border-l-4 border-green-500 pl-4">Our Reach</h2>
                        <div className="grid grid-cols-2 gap-8">
                            <div className="p-6 bg-green-50 rounded-2xl">
                                <p className="text-3xl font-extrabold text-green-700">{stats.totalStudents}</p>
                                <p className="text-green-900 font-medium">Students Enrolled</p>
                            </div>
                            <div className="p-6 bg-blue-50 rounded-2xl">
                                <p className="text-3xl font-extrabold text-blue-700">{stats.booksRead}</p>
                                <p className="text-blue-900 font-medium">Books Read</p>
                            </div>
                            <div className="p-6 bg-orange-50 rounded-2xl">
                                <p className="text-3xl font-extrabold text-orange-700">{stats.schoolsReached}</p>
                                <p className="text-orange-900 font-medium">Schools Partnered</p>
                            </div>
                            <div className="p-6 bg-purple-50 rounded-2xl">
                                <p className="text-3xl font-extrabold text-purple-700">{stats.activeRate}%</p>
                                <p className="text-purple-900 font-medium">Monthly Active Readers</p>
                            </div>
                        </div>
                    </div>

                    {/* Growth Chart */}
                    <div className="mb-12">
                        <h2 className="text-xl font-bold uppercase tracking-wider text-green-800 mb-6 border-l-4 border-green-500 pl-4">Growth Trajectory</h2>
                        <div className="h-64 w-full bg-white border rounded-xl overflow-hidden p-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={growthData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <Line type="monotone" dataKey="value" stroke="#059669" strokeWidth={4} dot={{ r: 6, fill: "#059669", strokeWidth: 2, stroke: "#fff" }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Top Subjects */}
                    <div className="mb-auto">
                        <h2 className="text-xl font-bold uppercase tracking-wider text-green-800 mb-6 border-l-4 border-green-500 pl-4">Student Interests</h2>
                        <div className="space-y-4">
                            {topSubjects.map((sub, i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <div className="w-24 font-bold text-gray-700">{sub.name}</div>
                                    <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500" style={{ width: `${sub.value}%` }}></div>
                                    </div>
                                    <div className="w-12 text-sm text-gray-500">{sub.value}%</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Custom Quote Footer */}
                    <div className="mt-12 bg-green-900 text-white p-8 rounded-xl relative">
                        <Quote className="absolute top-4 left-4 w-8 h-8 text-green-700 opacity-50" />
                        <p className="text-center text-lg font-serif italic leading-relaxed relative z-10">"{quote}"</p>
                    </div>

                    {/* Branding Footer */}
                    <div className="mt-12 pt-6 border-t flex justify-between text-xs text-gray-400">
                        <p>Generated by ThinkSharp Analytics</p>
                        <p>www.thinksharpfoundation.org</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
