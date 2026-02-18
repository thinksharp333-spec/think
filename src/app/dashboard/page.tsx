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
    const [visibleCount, setVisibleCount] = useState(12); // Pagination

    // Personalization: Set default level based on age if available
    useEffect(() => {
        if (user?.age && !selectedLevel) {
            if (user.age <= 7) setSelectedLevel("1");
            else if (user.age <= 10) setSelectedLevel("2");
            else if (user.age <= 13) setSelectedLevel("3");
            else setSelectedLevel("4");
        }
    }, [user, selectedLevel]);

    const points = user?.totalPoints || 0;

    const languages = [
        { value: "English", label: "English" },
        { value: "Hindi", label: "Hindi" },
        { value: "Marathi", label: "Marathi" },
        { value: "Marathi-English", label: "Marathi-English" },
    ];
    // Add any other languages found in the database that are not in our curated list
    const otherLanguages = Array.from(new Set(books?.map(b => b.language) || []))
        .filter(l => !languages.find(opt => opt.value === l))
        .map(l => ({ value: l, label: l }));

    const combinedLanguages = [...languages, ...otherLanguages];

    const levels = [
        { value: "1", label: "Level 1" },
        { value: "2", label: "Level 2" },
        { value: "3", label: "Level 3" },
        { value: "4", label: "Level 4" },
    ];

    const subjects = Array.from(new Set(books?.map(b => b.subject) || [])).sort().map(s => ({
        value: s,
        label: s
    }));

    const filteredBooks = books?.filter((book) => {
        const languageMatch = selectedLanguage ? book.language === selectedLanguage : true;
        const levelMatch = selectedLevel ? book.level === selectedLevel : true;
        const subjectMatch = selectedSubject ? book.subject === selectedSubject : true;
        const searchMatch = searchQuery ? book.title.toLowerCase().includes(searchQuery.toLowerCase()) : true;
        return languageMatch && levelMatch && subjectMatch && searchMatch;
    });

    const paginatedBooks = filteredBooks?.slice(0, visibleCount);
    const hasMore = filteredBooks && visibleCount < filteredBooks.length;


    return (
        <main className={`min-h-screen pb-20 transition-colors duration-500 ${isOnline ? 'bg-gray-50' : 'bg-stone-100'}`}>
            {/* Header / Gamification Bar */}
            <header className={`sticky top-0 z-10 px-4 py-4 shadow-sm transition-colors duration-300 ${isOnline ? 'bg-white' : 'bg-stone-200'}`}>
                <div className={`flex justify-between items-center mx-auto ${isMobile ? 'max-w-md' : 'max-w-4xl'}`}>
                    <div className="flex flex-col">
                        <h1 className={`text-xl font-bold flex items-center gap-2 ${isOnline ? 'text-green-700' : 'text-stone-700'}`}>
                            <BookOpen className="w-6 h-6" />
                            EcoLearn
                        </h1>
                        {user?.name && (
                            <span className="text-xs text-gray-500 font-medium ml-8">
                                Welcome back, {user.name.split(' ')[0]}!
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-3">

                        {/* Status Indicators for Demo */}
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

                        {/* Auth Button */}
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

            {/* Main Content */}
            <div className={`mx-auto px-4 mt-6 space-y-8 ${isMobile ? 'max-w-md' : 'max-w-4xl'}`}>

                {/* Dynamic Warning Banner */}
                {!isOnline && (
                    <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-700 p-4 rounded shadow-sm animate-in fade-in slide-in-from-top-4">
                        <div className="flex items-center gap-2">
                            <WifiOff className="w-5 h-5" />
                            <p className="font-bold">You are currently offline.</p>
                        </div>
                        <p className="text-sm mt-1">You can still read your downloaded books. Progress will sync when you're back online.</p>
                    </div>
                )}

                {/* Daily Goal Card */}
                <section className={`rounded-2xl p-6 text-white shadow-lg bg-gradient-to-br ${isOnline ? 'from-green-500 to-emerald-600' : 'from-stone-500 to-stone-600 grayscale-[0.2]'}`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-lg font-semibold mb-1">Daily Goal</h2>
                            <p className="opacity-90 text-sm mb-4">Read for 30 minutes today</p>
                        </div>
                        {!isMobile && (
                            <div className="bg-white/20 p-2 rounded-lg">
                                <BookOpen className="w-8 h-8 opacity-80" />
                            </div>
                        )}
                    </div>

                    <div className="w-full bg-white/20 rounded-full h-2 mb-2">
                        <div className="bg-white h-2 rounded-full w-[40%]"></div>
                    </div>
                    <p className="text-xs text-right opacity-80">12 / 30 mins</p>
                </section>

                {/* Continue Reading Section */}
                {recentBooks && recentBooks.length > 0 && (
                    <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-2 mb-4">
                            <Clock className="w-5 h-5 text-green-600" />
                            <h2 className="text-lg font-bold text-gray-800">Continue Reading</h2>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                <section className="space-y-12">
                    <div className="flex flex-col gap-4 mb-6">
                        <div className="flex justify-between items-center flex-wrap gap-4">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-yellow-500" />
                                <h2 className="text-xl font-bold text-gray-800">
                                    {selectedLevel ? `Level ${selectedLevel} Library` : "Explore Your Library"}
                                </h2>
                            </div>

                            <div className="flex gap-2 flex-wrap">
                                <Dropdown
                                    label="All Languages"
                                    options={combinedLanguages}
                                    value={selectedLanguage}
                                    onChange={setSelectedLanguage}
                                    className=""
                                />
                                <Dropdown
                                    label="All Levels"
                                    options={levels}
                                    value={selectedLevel}
                                    onChange={setSelectedLevel}
                                    className=""
                                />
                                <Dropdown
                                    label="All Subjects"
                                    options={subjects}
                                    value={selectedSubject}
                                    onChange={setSelectedSubject}
                                    className=""
                                />
                            </div>
                        </div>

                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search by title, level, or subject..."
                                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all text-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {Array.from(new Set(filteredBooks?.map(b => b.subject) || [])).sort().map(subject => (
                        <div key={subject} className="space-y-4">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <div className="w-1.5 h-6 bg-green-500 rounded-full" />
                                    {subject}
                                </h3>
                                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    {filteredBooks?.filter(b => b.subject === subject).length} Books
                                </span>
                            </div>

                            <div className={`grid gap-6 ${isMobile ? 'grid-cols-2' : 'grid-cols-3 lg:grid-cols-4'}`}>
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
                        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                            <Search className="w-16 h-16 text-gray-100 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-400">No books match your current selection</h3>
                            <button
                                onClick={() => { setSelectedLevel(""); setSelectedSubject(""); setSelectedLanguage(""); setSearchQuery(""); }}
                                className="mt-4 px-6 py-2 bg-green-50 text-green-600 rounded-full font-bold hover:bg-green-100 transition-colors"
                            >
                                Reset Filters
                            </button>
                        </div>
                    )}
                </section>

            </div>

            <SyncStatus />

            {/* Bottom Nav */}
            <nav className={`fixed bottom-0 left-0 right-0 border-t py-3 px-6 transition-colors duration-300 ${isOnline ? 'bg-white border-gray-200' : 'bg-stone-100 border-stone-200'}`}>
                <div className={`mx-auto flex justify-around ${isMobile ? 'max-w-md' : 'max-w-4xl'}`}>
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
