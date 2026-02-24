"use client";

import { useState, useEffect } from "react";
import { Dropdown } from "@/components/dropdown";

import { SyncStatus } from "@/components/sync-status";
import { BookOpen, Trophy, Flame, Wifi, WifiOff, Laptop, Smartphone, LayoutDashboard, LogIn, LogOut, Search, Clock, Sparkles } from "lucide-react";
import Link from 'next/link';
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/lib/supabase";
import { BookCard } from "@/components/book-card";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useDeviceType } from "@/hooks/useDeviceType";
import { useBooks } from "@/hooks/useBooks";
import { useReadingHistory } from "@/hooks/useReadingHistory";

export default function Dashboard() {
    const { user } = useUser();
    const isOnline = useNetworkStatus();
    const { isMobile } = useDeviceType();
    const { books, syncLibrary } = useBooks();
    const { recentBooks } = useReadingHistory();

    // Sync library from Supabase when online
    useEffect(() => {
        if (isOnline) {
            syncLibrary();
        }
    }, [isOnline, syncLibrary]);

    const [selectedLevel, setSelectedLevel] = useState("");
    const [selectedSubject, setSelectedSubject] = useState("");
    const [selectedLanguage, setSelectedLanguage] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [visibleCount, setVisibleCount] = useState(12);

    const points = user?.totalPoints || 0;

    const languages = [
        { value: "English", label: "English" },
        { value: "Hindi", label: "Hindi" },
        { value: "Marathi", label: "Marathi" },
        { value: "Marathi-English", label: "Marathi-English" },
    ];

    // Add any other languages found in the database
    const otherLanguages = Array.from(new Set(books?.map(b => b.language) || []))
        .filter(l => l && !languages.find(opt => opt.value === l))
        .map(l => ({ value: l, label: l }));

    const combinedLanguages = [...languages, ...otherLanguages];

    const levels = [
        { value: "1", label: "Level 1" },
        { value: "2", label: "Level 2" },
        { value: "3", label: "Level 3" },
        { value: "4", label: "Level 4" },
    ];

    const subjects = Array.from(new Set(books?.map(b => b.subject) || []))
        .filter(Boolean)
        .sort()
        .map(s => ({
            value: s,
            label: s
        }));

    const filteredBooks = books?.filter((book) => {
        const languageMatch = selectedLanguage ? book.language === selectedLanguage : true;
        const levelMatch = selectedLevel ? book.level === selectedLevel.toString() : true;
        const subjectMatch = selectedSubject ? book.subject === selectedSubject : true;
        const searchMatch = searchQuery ? book.title.toLowerCase().includes(searchQuery.toLowerCase()) : true;
        return languageMatch && levelMatch && subjectMatch && searchMatch;
    });

    const isFilterActive = selectedLevel || selectedSubject || selectedLanguage || searchQuery;

    return (
        <main className={`min-h-screen pb-20 transition-colors duration-500 ${isOnline ? 'bg-gray-50' : 'bg-stone-100'}`}>
            {/* ... header ... */}
            <header className={`sticky top-0 z-10 px-4 py-4 shadow-sm transition-colors duration-300 ${isOnline ? 'bg-white' : 'bg-stone-200'}`}>
                <div className={`flex justify-between items-center mx-auto ${isMobile ? 'max-w-md' : 'max-w-6xl'}`}>
                    <div className="flex flex-col">
                        <h1 className={`text-xl font-bold flex items-center gap-2 ${isOnline ? 'text-green-700' : 'text-stone-700'}`}>
                            <BookOpen className="w-6 h-6" />
                            EcoLearn
                        </h1>
                        {user?.name && (
                            <span className="text-xs text-gray-500 font-medium ml-8">
                                Welcome, {user.name.split(' ')[0]}!
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-xs font-mono text-gray-500">
                            {isMobile ? <Smartphone className="w-3 h-3" /> : <Laptop className="w-3 h-3" />}
                            <span>{isMobile ? "Mobile" : "Desktop"}</span>
                            <span className="w-px h-3 bg-gray-300 mx-1" />
                            {isOnline ? <Wifi className="w-3 h-3 text-green-500" /> : <WifiOff className="w-3 h-3 text-red-500" />}
                            <span>{isOnline ? "Online" : "Offline"}</span>
                        </div>

                        <div className="flex items-center gap-1 text-orange-500 font-bold bg-orange-50 px-2 py-1 rounded-lg">
                            <Flame className="w-4 h-4 fill-orange-500" />
                            <span>12</span>
                        </div>
                        <div className="flex items-center gap-1 text-yellow-600 font-bold bg-yellow-50 px-2 py-1 rounded-lg">
                            <Trophy className="w-4 h-4 fill-yellow-500 text-yellow-600" />
                            <span>{points} pts</span>
                        </div>

                        {user?.id !== 'local-user' ? (
                            <button
                                onClick={async () => {
                                    if (supabase) {
                                        await supabase.auth.signOut();
                                        window.location.reload();
                                    }
                                }}
                                className="flex items-center gap-1 text-gray-600 hover:text-red-600 transition-colors bg-gray-50 hover:bg-red-50 px-2 py-1 rounded-lg"
                                title="Sign Out"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        ) : (
                            <Link
                                href="/login"
                                className="flex items-center gap-1 text-green-700 font-bold bg-green-100 hover:bg-green-200 px-3 py-1 rounded-lg transition-colors"
                            >
                                <LogIn className="w-4 h-4" />
                                <span className="text-sm">Login</span>
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            <div className={`mx-auto px-4 mt-6 space-y-12 ${isMobile ? 'max-w-md' : 'max-w-6xl'}`}>
                {/* ... Daily Goal & History ... */}
                {recentBooks && recentBooks.length > 0 && (
                    <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-2 mb-4">
                            <Clock className="w-5 h-5 text-green-600" />
                            <h2 className="text-lg font-bold text-gray-800">Continue Reading</h2>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-8">
                            {recentBooks.map((book) => (
                                <BookCard
                                    key={book.id}
                                    id={book.id!}
                                    fileId={book.fileId}
                                    title={book.title}
                                    grade={book.grade}
                                    level={book.level}
                                    pages={book.pages}
                                    pdfUrl={book.pdfUrl}
                                    pdfBlob={book.pdfBlob}
                                    language={book.language}
                                    coverUrl={book.coverUrl}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* Library Grid grouped by Subject */}
                <section className="space-y-12 pb-20">
                    <div className="flex flex-col gap-6">
                        <div className="flex justify-between items-end flex-wrap gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-yellow-500" />
                                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                                        {selectedLevel ? `Level ${selectedLevel} Library` : "Our Library"}
                                    </h2>
                                </div>
                                <p className="text-sm text-gray-400 font-medium">Explore and learn something new today!</p>
                            </div>

                            <div className="flex gap-2 flex-wrap items-center">
                                <Dropdown
                                    label="All Languages"
                                    options={combinedLanguages}
                                    value={selectedLanguage}
                                    onChange={setSelectedLanguage}
                                    className="min-w-[140px]"
                                />
                                <Dropdown
                                    label="All Levels"
                                    options={levels}
                                    value={selectedLevel}
                                    onChange={setSelectedLevel}
                                    className="min-w-[120px]"
                                />
                                {isFilterActive && (
                                    <button
                                        onClick={() => { setSelectedLevel(""); setSelectedSubject(""); setSelectedLanguage(""); setSearchQuery(""); }}
                                        className="text-xs font-bold text-red-500 hover:text-red-600 px-3 py-2 bg-red-50 rounded-lg transition-colors ml-2"
                                    >
                                        Reset
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Subject Quick Bubbles */}
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
                            <button
                                onClick={() => setSelectedSubject("")}
                                className={`px-5 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all ${selectedSubject === ""
                                        ? "bg-green-600 text-white shadow-lg shadow-green-100 scale-105"
                                        : "bg-white border border-gray-100 text-gray-500 hover:bg-gray-50"
                                    }`}
                            >
                                All Subjects
                            </button>
                            {subjects.map((sub) => (
                                <button
                                    key={sub.value}
                                    onClick={() => setSelectedSubject(sub.value)}
                                    className={`px-5 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all ${selectedSubject === sub.value
                                            ? "bg-green-600 text-white shadow-lg shadow-green-100 scale-105"
                                            : "bg-white border border-gray-100 text-gray-500 hover:bg-gray-50"
                                        }`}
                                >
                                    {sub.label}
                                </button>
                            ))}
                        </div>

                        {/* Search Bar */}
                        <div className="relative group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5 group-focus-within:text-green-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search by title, subject or level..."
                                className="w-full pl-14 pr-6 py-4 bg-white border border-gray-100 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] focus:outline-none focus:ring-2 focus:ring-green-500/10 focus:border-green-200 transition-all text-sm placeholder:text-gray-300"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {Array.from(new Set(filteredBooks?.map(b => b.subject) || [])).sort().map(subject => (
                        <div key={subject} className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                                    <div className="w-2 h-8 bg-green-500 rounded-full shadow-[0_0_12px_rgba(34,197,94,0.3)]" />
                                    {subject || "General"}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-[10px] font-black uppercase tracking-widest">
                                        {filteredBooks?.filter(b => b.subject === subject).length} Books
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-8">
                                {filteredBooks?.filter(b => b.subject === subject).map((book) => (
                                    <BookCard
                                        key={book.id}
                                        id={book.id!}
                                        fileId={book.fileId}
                                        title={book.title}
                                        grade={book.grade}
                                        level={book.level}
                                        pages={book.pages}
                                        pdfUrl={book.pdfUrl}
                                        pdfBlob={book.pdfBlob}
                                        language={book.language}
                                        coverUrl={book.coverUrl}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}

                    {filteredBooks?.length === 0 && (
                        <div className="text-center py-32 bg-white rounded-[2rem] border-2 border-dashed border-gray-100 shadow-inner">
                            <div className="relative inline-block mb-6">
                                <Search className="w-20 h-20 text-gray-50 mx-auto" />
                                <Sparkles className="w-8 h-8 text-yellow-400 absolute -top-2 -right-2 animate-pulse" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">No books found</h3>
                            <p className="text-gray-400 max-w-xs mx-auto text-sm mb-8 font-medium">Try adjusting your filters or search terms to explore more of our library.</p>
                            <button
                                onClick={() => { setSelectedLevel(""); setSelectedSubject(""); setSelectedLanguage(""); setSearchQuery(""); }}
                                className="px-8 py-3 bg-green-600 text-white rounded-2xl font-black hover:bg-green-700 active:scale-95 transition-all shadow-xl shadow-green-100"
                            >
                                Show All Books
                            </button>
                        </div>
                    )}
                </section>
            </div>

            <SyncStatus />

            {/* Bottom Nav */}
            <nav className={`fixed bottom-0 left-0 right-0 border-t py-3 px-6 transition-colors duration-300 ${isOnline ? 'bg-white border-gray-200' : 'bg-stone-100 border-stone-200'}`}>
                <div className={`mx-auto flex justify-around ${isMobile ? 'max-w-md' : 'max-w-6xl'}`}>
                    <button className={`flex flex-col items-center ${isOnline ? 'text-green-600' : 'text-stone-600'}`}>
                        <BookOpen className="w-6 h-6" />
                        <span className="text-[10px] mt-1 font-medium">Library</span>
                    </button>
                    <Link href="/leaderboard" className="flex flex-col items-center text-gray-400 hover:text-green-600 transition-colors">
                        <Trophy className="w-6 h-6" />
                        <span className="text-[10px] mt-1 font-medium">Rank</span>
                    </Link>
                    <Link href="/admin" className="flex flex-col items-center text-gray-400 hover:text-green-600 transition-colors">
                        <LayoutDashboard className="w-6 h-6" />
                        <span className="text-[10px] mt-1 font-medium">Admin</span>
                    </Link>
                </div>
            </nav>
        </main>
    );
}
