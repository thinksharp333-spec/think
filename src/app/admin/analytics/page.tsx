"use client";

import { useState } from 'react';
import Link from 'next/link';
import { OverviewTab } from '@/components/analytics/OverviewTab';
import { GeoDrillDownTab } from '@/components/analytics/GeoDrillDownTab';
import { SchoolReportTab } from '@/components/analytics/SchoolReportTab';
import { StudentReportTab } from '@/components/analytics/StudentReportTab';
import { ExportTab } from '@/components/analytics/ExportTab';
import { ArrowLeft, LayoutDashboard, Map, School, GraduationCap, Download } from 'lucide-react';

export default function AnalyticsDashboard() {
    const [activeTab, setActiveTab] = useState<'overview' | 'geo' | 'school' | 'student' | 'export'>('overview');

    const tabs = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'geo', label: 'Geographic', icon: Map },
        { id: 'school', label: 'School Report', icon: School },
        { id: 'student', label: 'Student Report', icon: GraduationCap },
        { id: 'export', label: 'Export', icon: Download },
    ];

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-slate-800">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin" className="p-2 -ml-2 hover:bg-gray-100 rounded-full text-gray-500">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
                            Analytics Dashboard
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* User Profile or Actions */}
                        <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-xs">
                            ADM
                        </div>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex gap-6 overflow-x-auto no-scrollbar">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`
                                        flex items-center gap-2 pb-3 pt-3 border-b-2 transition-colors whitespace-nowrap text-sm font-medium
                                        ${isActive
                                            ? 'border-green-600 text-green-700'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }
                                    `}
                                >
                                    <Icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {activeTab === 'overview' && <OverviewTab />}
                {activeTab === 'geo' && <GeoDrillDownTab />}
                {activeTab === 'school' && <SchoolReportTab />}
                {activeTab === 'student' && <StudentReportTab />}
                {activeTab === 'export' && <ExportTab />}
            </main>
        </div>
    );
}
