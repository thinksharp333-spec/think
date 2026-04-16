"use client";

import { useState, useEffect } from "react";
import { Dropdown } from "@/components/dropdown";
import { BookOpen, Trophy, Flame, Wifi, WifiOff, LogIn, LogOut, Search, Clock, Sparkles, Star, ArrowRight, User, Menu, X, Download, Loader2 } from "lucide-react";
import Link from 'next/link';
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/lib/supabase";
import { BookCard } from "@/components/book-card";
import { useSync } from "@/hooks/useSync";
import { useBooks } from "@/hooks/useBooks";
import { useReadingHistory } from "@/hooks/useReadingHistory";
import { getThumbnailUrl, extractFileId } from "@/lib/google-drive";
import { db } from "@/lib/db";

export default function Dashboard() {
    const { user } = useUser();
    const { isOnline } = useSync();
    const { books, syncLibrary } = useBooks();
    const { recentBooks } = useReadingHistory();

    useEffect(() => {
        if (isOnline) syncLibrary();
    }, [isOnline, syncLibrary]);

    const [selectedLevel, setSelectedLevel] = useState("");
    const [selectedSubject, setSelectedSubject] = useState("");
    const [selectedLanguage, setSelectedLanguage] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [showSidebar, setShowSidebar] = useState(false);
    
    // Bulk Download States
    const [isDownloadingAll, setIsDownloadingAll] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });
    const [downloadError, setDownloadError] = useState<string | null>(null);

    const points = user?.totalPoints || 0;
    
    let displayStreak = user?.streak || 0;
    if (displayStreak > 0 && user?.lastPointsDate) {
        const now = new Date();
        const today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
        const yesterdayObj = new Date(now.getTime() - 86400000 - now.getTimezoneOffset() * 60000);
        const yesterday = yesterdayObj.toISOString().split('T')[0];
        if (user.lastPointsDate !== today && user.lastPointsDate !== yesterday) {
            displayStreak = 0;
        }
    }

    const languages = [
        { value: "English", label: "English" },
        { value: "Hindi", label: "Hindi" },
        { value: "Marathi", label: "Marathi" },
        { value: "Marathi-English", label: "Marathi-English" },
    ];
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
        .filter(Boolean).sort().map(s => ({ value: s, label: s }));

    const filteredBooks = books?.filter((book) => {
        const languageMatch = selectedLanguage ? book.language === selectedLanguage : true;
        const levelMatch = selectedLevel ? book.level === selectedLevel.toString() : true;
        const subjectMatch = selectedSubject ? book.subject === selectedSubject : true;
        const searchMatch = searchQuery ? book.title.toLowerCase().includes(searchQuery.toLowerCase()) : true;
        return languageMatch && levelMatch && subjectMatch && searchMatch;
    });

    const isFilterActive = selectedLevel || selectedSubject || selectedLanguage || searchQuery;
    const bookSections = Array.from(new Set(filteredBooks?.map(b => b.subject) || [])).sort();
    const firstName = user?.name?.split(" ")[0] || "Reader";

    // Handle Bulk Download
    const handleBulkDownload = async () => {
        if (!selectedLevel || !filteredBooks || filteredBooks.length === 0) return;
        
        // Find books that aren't offline yet
        const booksToDownload = filteredBooks.filter(b => !b.pdfBlob);
        if (booksToDownload.length === 0) {
            alert("All books in this level are already offline! 🎉");
            return;
        }

        setIsDownloadingAll(true);
        setDownloadError(null);
        setDownloadProgress({ current: 0, total: booksToDownload.length });

        let successCount = 0;
        for (const book of booksToDownload) {
            try {
                // Determine source URL (proxy for Drive, direct otherwise)
                const proxyUrl = book.fileId ? `/api/proxy-pdf?fileId=${book.fileId}` : book.pdfUrl;
                const response = await fetch(proxyUrl);
                
                if (response.ok) {
                    const blob = await response.blob();
                    await db.books.update(book.id!, { pdfBlob: blob });
                    successCount++;
                } else {
                    console.error(`Failed to download ${book.title}: ${response.status}`);
                }
            } catch (err) {
                console.error(`Error downloading ${book.title}:`, err);
            }
            setDownloadProgress(prev => ({ ...prev, current: prev.current + 1 }));
        }

        setIsDownloadingAll(false);
        if (successCount < booksToDownload.length) {
            setDownloadError(`Downloaded ${successCount} of ${booksToDownload.length} books. Some may have failed.`);
        }
    };

    return (
        <div className="library-shell">

            {/* ── Sticky Header ─────────────────────────────────────────── */}
            <header className="library-header">
                <div className="flex items-center justify-between px-5 py-3 md:px-8">
                    {/* Left: hamburger + logo */}
                    <div className="flex items-center gap-3">
                        <button onClick={() => setShowSidebar(!showSidebar)}
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 transition-all">
                            <Menu className="h-5 w-5" />
                        </button>
                        <Link href="/" className="flex items-center gap-2">
                            <BookOpen className="h-6 w-6 text-white" />
                            <span className="comic-title text-xl text-white hidden sm:block">Digi Library</span>
                        </Link>
                    </div>

                    {/* Center: title */}
                    <h1 className="comic-title text-lg md:text-2xl text-white uppercase tracking-wide hidden sm:block">
                        Explore Your Library
                    </h1>

                    {/* Right: status + actions */}
                    <div className="flex items-center gap-2">
                        <span className="chip chip-gold text-xs hidden md:flex text-[#111111]">
                            <Flame className="h-3.5 w-3.5 text-orange-500 fill-orange-500" /> Streak {displayStreak}
                        </span>
                        <span className="chip chip-gold text-xs hidden md:flex text-[#111111]">
                            <Trophy className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" /> {points} pts
                        </span>

                        <button onClick={async () => { if (supabase) { await supabase.auth.signOut(); } document.cookie = "user_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"; window.location.href = "/"; }}
                            className="chip chip-dark text-xs hidden md:flex cursor-pointer">
                            <LogOut className="h-3.5 w-3.5" /> Logout
                        </button>
                    </div>
                </div>


            </header>

            {/* ── Body: sidebar + main ───────────────────────────────────── */}
            <div className="flex flex-1 relative overflow-hidden">
                {/* Background Graphics */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <Star className="absolute top-10 left-10 text-yellow-200/20 w-12 h-12 animate-float opacity-30" />
                    <Star className="absolute bottom-20 right-10 text-red-200/20 w-16 h-16 animate-float-delay opacity-30" />
                    <Star className="absolute top-1/2 left-1/4 text-yellow-100/10 w-8 h-8 animate-wiggle opacity-20" />
                    <div className="absolute top-0 right-0 w-64 h-64 bg-red-100/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-yellow-100/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
                </div>

                {/* Mobile sidebar overlay */}
                {showSidebar && (
                    <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setShowSidebar(false)}>
                        <div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
                            <div className="p-5 border-b-2 border-gray-100 flex items-center justify-between">
                                <p className="font-black text-[#111] uppercase tracking-widest text-xs">Recently Read</p>
                                <button onClick={() => setShowSidebar(false)} className="p-2 rounded-full hover:bg-gray-100">
                                    <X className="h-4 w-4 text-[#555]" />
                                </button>
                            </div>
                            <div className="p-4 space-y-3">
                                {recentBooks && recentBooks.length > 0 ? recentBooks.slice(0, 8).map((book) => (
                                    <Link key={book.id} href={`/read/${book.id}`} onClick={() => setShowSidebar(false)}
                                        className="flex items-center gap-3 p-2 rounded-2xl hover:bg-[#fff3ef] transition-colors group">
                                        <div className="h-14 w-11 flex-shrink-0 rounded-xl border-2 border-[#111] overflow-hidden shadow-[0_4px_0_#111] bg-[#fff4ef]">
                                            {book.coverUrl ? (
                                                <img src={book.coverUrl.includes('drive.google.com') ? getThumbnailUrl(extractFileId(book.coverUrl)) : book.coverUrl}
                                                    alt={book.title} className="w-full h-full object-cover" loading="lazy" />
                                            ) : <div className="w-full h-full flex items-center justify-center text-[#e63329]"><BookOpen className="w-5 h-5" /></div>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-black text-[#111] line-clamp-2 group-hover:text-[#e63329] transition-colors">{book.title}</p>
                                            {book.avgRating && book.avgRating > 0 && (
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                                    <span className="text-[10px] font-black text-[#777]">{book.avgRating.toFixed(1)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </Link>
                                )) : (
                                    <div className="text-center py-8">
                                        <BookOpen className="w-10 h-10 text-[#ddd] mx-auto mb-2" />
                                        <p className="text-xs font-bold text-[#999] uppercase tracking-wide">Start reading to see history</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}


                {/* ── Main content ───────────────────────────────────────── */}
                <main className="flex-1 min-w-0 overflow-y-auto">
                    <div className="px-5 py-6 md:px-8 space-y-8">

                        {/* Welcome banner */}
                        <div className="relative overflow-hidden rounded-3xl border-3 border-[#111] shadow-[0_8px_0_#111] bg-gradient-to-r from-[#e63329] to-[#b91c1c] p-6 md:p-8">
                            <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/5" />
                            <div className="absolute right-4 bottom-0 w-32 h-32 rounded-full bg-white/5" />
                            <div className="relative flex items-center justify-between flex-wrap gap-4">
                                <div>
                                    <p className="text-white/70 text-sm font-black uppercase tracking-widest mb-1">
                                        <Sparkles className="inline h-4 w-4 mr-1" />Welcome Back
                                    </p>
                                    <h2 className="comic-title text-4xl md:text-5xl text-white">
                                        {firstName}&apos;s Quest!
                                    </h2>
                                    <p className="text-white/80 font-bold mt-2 max-w-sm">
                                        Browse story worlds, keep your streak alive, and jump back into books you started.
                                    </p>
                                </div>
                                <div className="flex gap-4 flex-wrap">
                                    <div className="bg-white/15 rounded-2xl px-5 py-4 text-center border border-white/20 backdrop-blur">
                                        <p className="comic-title text-3xl text-white">{books?.length || 0}</p>
                                        <p className="text-white/70 text-xs font-black uppercase tracking-wider">Books</p>
                                    </div>
                                    <div className="bg-white/15 rounded-2xl px-5 py-4 text-center border border-white/20 backdrop-blur">
                                        <p className="comic-title text-3xl text-yellow-300">{points}</p>
                                        <p className="text-white/70 text-xs font-black uppercase tracking-wider">Points</p>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-5 flex gap-3 flex-wrap">
                                <Link href="/leaderboard" className="btn-dark text-sm py-3 px-6">
                                    View Leaderboard <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>
                        </div>

                        {/* Filter bar / Dropdowns */}
                        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1">
                            <Dropdown label="Language" options={combinedLanguages} value={selectedLanguage} onChange={setSelectedLanguage} className="filter-btn" />
                            <Dropdown label="Level" options={levels} value={selectedLevel} onChange={setSelectedLevel} className="filter-btn" />
                            <Dropdown label="Category" options={subjects} value={selectedSubject} onChange={setSelectedSubject} className="filter-btn" />
                            {isFilterActive && (
                                <button onClick={() => { setSelectedLevel(""); setSelectedSubject(""); setSelectedLanguage(""); setSearchQuery(""); }}
                                    className="flex-shrink-0 text-[#111] hover:text-[#e63329] text-xs font-black uppercase tracking-wide bg-black/5 hover:bg-black/10 px-4 py-2 rounded-full transition-all">
                                    ✕ Reset
                                </button>
                            )}
                            {selectedLevel && (
                                <button 
                                    onClick={handleBulkDownload}
                                    disabled={isDownloadingAll}
                                    className={`flex-shrink-0 flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-yellow-950 text-xs font-black uppercase tracking-wide px-4 py-2 rounded-full transition-all shadow-[0_4px_0_#92400e] active:translate-y-[2px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed`}>
                                    {isDownloadingAll ? (
                                        <><Loader2 className="h-4 w-4 animate-spin" /> Downloading...</>
                                    ) : (
                                        <><Download className="h-4 w-4" /> Download Level {selectedLevel}</>
                                    )}
                                </button>
                            )}
                        </div>

                        {/* Search bar */}
                        <div className="relative">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#aaa]" />
                            <input type="text" placeholder="Search by title, subject or level..."
                                className="comic-input text-sm font-bold" style={{ paddingLeft: '48px' }}
                                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                        </div>

                        {/* Book sections by subject */}
                        {bookSections.length > 0 ? bookSections.map(subject => (
                            <section key={subject} className="space-y-5">
                                <div className="flex items-center justify-between border-b-[3px] border-[#111] pb-3">
                                    <h3 className="flex items-center gap-3 text-xl font-black text-[#111] md:text-2xl">
                                        <span className="w-2 h-7 rounded-full bg-[#e63329] inline-block" />
                                        {subject || "General"}
                                    </h3>
                                    <span className="chip text-[10px]">
                                        {filteredBooks?.filter(b => b.subject === subject).length} Books
                                    </span>
                                </div>
                                <div className="book-grid">
                                    {filteredBooks?.filter(b => b.subject === subject).map((book) => (
                                        <BookCard key={book.id} id={book.id!} fileId={book.fileId} title={book.title}
                                            grade={book.grade} level={book.level} pages={book.pages} pdfUrl={book.pdfUrl}
                                            coverUrl={book.coverUrl} avgRating={book.avgRating} reviewCount={book.reviewCount}
                                            hasQuiz={!!(book.questions && book.questions.length > 0)} />
                                    ))}
                                </div>
                            </section>
                        )) : filteredBooks?.length === 0 ? (
                            <div className="card py-24 text-center">
                                <Search className="mx-auto h-16 w-16 text-[#f2d7cd] mb-4" />
                                <h3 className="font-black text-2xl text-[#111] mb-2">No books found</h3>
                                <p className="font-bold text-[#777] mb-6 max-w-xs mx-auto">Try adjusting your filters or search terms.</p>
                                <button onClick={() => { setSelectedLevel(""); setSelectedSubject(""); setSelectedLanguage(""); setSearchQuery(""); }}
                                    className="btn-red mx-auto px-8 py-3 text-sm">
                                    Show All Books
                                </button>
                            </div>
                        ) : (
                            <div className="card py-16 text-center">
                                <Sparkles className="mx-auto h-12 w-12 text-[#f2d7cd] mb-4 animate-pulse" />
                                <p className="font-black text-[#777] uppercase tracking-wide text-sm">Loading your library...</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Bulk Download Progress Overlay */}
            {isDownloadingAll && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
                    <div className="bg-white rounded-[32px] border-4 border-[#111] shadow-[0_12px_0_#111] p-8 max-w-sm w-full text-center space-y-4 animate-pop-in">
                        <div className="relative w-20 h-20 mx-auto">
                            <div className="absolute inset-0 rounded-full border-4 border-gray-100" />
                            <div className="absolute inset-0 rounded-full border-4 border-[#e63329] border-t-transparent animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Download className="w-8 h-8 text-[#e63329]" />
                            </div>
                        </div>
                        <h3 className="comic-title text-2xl text-[#111]">Downloading Books</h3>
                        <p className="font-bold text-[#777] text-sm uppercase tracking-wide">
                            Level {selectedLevel} Adventure Pack
                        </p>
                        <div className="space-y-2">
                            <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden border-2 border-[#111]">
                                <div 
                                    className="h-full bg-[#e63329] transition-all duration-300" 
                                    style={{ width: `${(downloadProgress.current / downloadProgress.total) * 100}%` }} 
                                />
                            </div>
                            <p className="font-black text-[#111] text-xs">
                                {downloadProgress.current} / {downloadProgress.total} BOOKS READY
                            </p>
                        </div>
                        <p className="text-[10px] font-bold text-[#999]">DON'T CLOSE THIS PAGE UNTIL DONE</p>
                    </div>
                </div>
            )}

            {downloadError && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[#111] text-white px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest flex items-center gap-3 border-2 border-red-500 shadow-xl">
                    <X className="w-4 h-4 text-red-500 cursor-pointer" onClick={() => setDownloadError(null)} />
                    {downloadError}
                </div>
            )}

            {/* Bottom nav (mobile) */}
            <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t-[3px] border-[#111] md:hidden">
                <div className="flex justify-around px-4 py-3">
                    <button className="flex flex-col items-center text-[#e63329]">
                        <BookOpen className="w-6 h-6" />
                        <span className="mt-1 text-[9px] font-black uppercase tracking-wide">Library</span>
                    </button>
                    <Link href="/leaderboard" className="flex flex-col items-center text-[#777] hover:text-[#e63329] transition-colors">
                        <Trophy className="w-6 h-6" />
                        <span className="mt-1 text-[9px] font-black uppercase tracking-wide">Rank</span>
                    </Link>
                    <button onClick={async () => { if (supabase) { await supabase.auth.signOut(); } document.cookie = "user_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"; window.location.href = "/"; }}
                        className="flex flex-col items-center text-[#777] hover:text-[#e63329] transition-colors cursor-pointer">
                        <LogOut className="w-6 h-6" />
                        <span className="mt-1 text-[9px] font-black uppercase tracking-wide">Logout</span>
                    </button>
                </div>
            </nav>
        </div>
    );
}
