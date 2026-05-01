"use client";

import { useState } from 'react';
import Link from 'next/link';
import { OverviewTab } from '@/components/analytics/OverviewTab';
import { UnifiedExplorerTab } from '@/components/analytics/UnifiedExplorerTab';
import { ArrowLeft, LayoutDashboard, Globe } from 'lucide-react';

type TabId = 'overview' | 'explorer';

export default function AnalyticsDashboard() {
    const [activeTab, setActiveTab] = useState<TabId>('overview');

    const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'explorer', label: 'Data Explorer', icon: Globe },
    ];

    return (
        <div className="min-h-screen bg-[#f7f8fa]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
            {/* Top bar */}
            <header className="bg-white border-b border-zinc-100 sticky top-0 z-50">
                <div className="px-6 h-14 flex items-center gap-4">
                    <Link
                        href="/admin"
                        className="p-1.5 hover:bg-zinc-100 rounded-md text-zinc-400 hover:text-zinc-600 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <div className="w-px h-4 bg-zinc-200" />
                    <h1 className="text-sm font-semibold text-zinc-900">Analytics</h1>
                    <div className="ml-auto flex items-center">
                        <div className="w-7 h-7 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[10px] font-bold tracking-wide">
                            AD
                        </div>
                    </div>
                </div>

                {/* Tab strip */}
                <div className="px-6 flex gap-0 overflow-x-auto">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-1.5 px-4 py-3 border-b-2 text-xs font-medium transition-colors whitespace-nowrap ${
                                    isActive
                                        ? 'border-zinc-900 text-zinc-900'
                                        : 'border-transparent text-zinc-400 hover:text-zinc-600 hover:border-zinc-200'
                                }`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </header>

            {/* Content */}
            <div className="px-6 py-6 max-w-6xl mx-auto">
                {activeTab === 'overview' && <OverviewTab />}
                {activeTab === 'explorer' && <UnifiedExplorerTab />}
            </div>
        </div>
    );
}
