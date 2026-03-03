"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ExportButton } from './ExportButton';
import { Loader2 } from 'lucide-react';

export function ExportTab() {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any[]>([]);
    const [dataType, setDataType] = useState<'users' | 'schools' | 'sessions' | 'none'>('none');

    async function loadData(type: 'users' | 'schools' | 'sessions') {
        setLoading(true);
        setDataType(type);
        try {
            let fetchedData;
            if (type === 'users') {
                const { data } = await supabase.from('users').select('*').limit(100); // Limit for MVP
                fetchedData = data;
            } else if (type === 'schools') {
                const { data } = await supabase.from('schools').select('*').limit(100);
                fetchedData = data;
            } else if (type === 'sessions') {
                const { data } = await supabase.from('reading_sessions').select('*').order('start_time', { ascending: false }).limit(100);
                fetchedData = data;
            }
            setData(fetchedData || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Export Data Reports</h2>
                <p className="text-sm text-gray-500 mb-6">Select a dataset to generate a report. You can download it as CSV or a formatted PDF.</p>

                <div className="flex gap-4 mb-8">
                    <button
                        onClick={() => loadData('schools')}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium ${dataType === 'schools' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white hover:bg-gray-50'}`}
                    >
                        School Data
                    </button>
                    <button
                        onClick={() => loadData('users')}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium ${dataType === 'users' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white hover:bg-gray-50'}`}
                    >
                        Student Data
                    </button>
                    <button
                        onClick={() => loadData('sessions')}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium ${dataType === 'sessions' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white hover:bg-gray-50'}`}
                    >
                        Reading Logs
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center gap-2 text-gray-500 py-8 justify-center">
                        <Loader2 className="w-5 h-5 animate-spin" /> Preparing data...
                    </div>
                ) : data.length > 0 ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div>
                                <span className="font-semibold text-gray-800">{dataType.toUpperCase()} Report</span>
                                <span className="text-sm text-gray-500 ml-2">({data.length} records)</span>
                            </div>
                            <div className="flex gap-2">
                                <ExportButton data={data} filename={`thinksharp_${dataType}_report`} type="csv" label="Download CSV" />
                                <ExportButton data={data} filename={`thinksharp_${dataType}_report`} type="pdf" label="Download PDF" reportTitle={`${dataType.toUpperCase()} REPORT`} />
                            </div>
                        </div>

                        {/* Preview Table (First 5 Rows) */}
                        <div className="border rounded-lg overflow-x-auto">
                            <table className="w-full text-left text-xs text-gray-600">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {Object.keys(data[0]).slice(0, 6).map(key => (
                                            <th key={key} className="p-3 font-medium uppercase tracking-wider">{key.replace(/_/g, ' ')}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.slice(0, 5).map((row, i) => (
                                        <tr key={i} className="border-t">
                                            {Object.keys(row).slice(0, 6).map(key => (
                                                <td key={key} className="p-3 truncate max-w-[150px]">{typeof row[key] === 'object' ? JSON.stringify(row[key]) : row[key]}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {data.length > 5 && <div className="p-2 text-center text-xs text-gray-400 bg-gray-50 border-t">Previewing 5 of {data.length} records. Download to view full report.</div>}
                        </div>
                    </div>
                ) : dataType !== 'none' && (
                    <div className="text-center py-8 text-gray-500">No data found for this selection.</div>
                )}
            </div>
        </div>
    );
}
