"use client";

import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { BookOpen, Download, Loader2, CheckCircle2, Share2, Star, Trophy } from "lucide-react";
import { extractFileId, getThumbnailUrl } from "@/lib/google-drive";
import { db } from "@/lib/db";

interface BookCardProps {
    id: number;
    fileId?: string;
    title: string;
    grade: string;
    level?: string;
    pages: number;
    pdfUrl: string;
    coverUrl?: string;
    hasQuiz?: boolean;
    avgRating?: number;
    reviewCount?: number;
}

export function BookCard({ id, fileId, title, grade, pages, pdfUrl, coverUrl, hasQuiz, avgRating, reviewCount }: BookCardProps) {
    const [downloading, setDownloading] = useState(false);
    const [imgError, setImgError] = useState(false);

    // Use live query to track offline status in real-time
    const isOfflineReady = useLiveQuery(
        async () => {
            const book = await db.books.get(id);
            return !!(book?.pdfBlob);
        },
        [id]
    );

    async function handleDownload(e: React.MouseEvent) {
        e.preventDefault();
        if (isOfflineReady || downloading) return;
        setDownloading(true);
        try {
            const proxyUrl = fileId ? `/api/proxy-pdf?fileId=${fileId}` : pdfUrl;
            const response = await fetch(proxyUrl);
            if (response.ok) {
                const blob = await response.blob();
                await db.books.update(id, { pdfBlob: blob });
            } else {
                throw new Error(`Server responded with ${response.status}`);
            }
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            alert(`Download failed: ${msg}`);
        } finally { setDownloading(false); }
    }

    const coverSrc = coverUrl
        ? (coverUrl.includes('drive.google.com') ? getThumbnailUrl(extractFileId(coverUrl)) : coverUrl)
        : (fileId ? getThumbnailUrl(fileId) : null);

    return (
        <Link href={`/read/${id}`} className="block group/card relative">
            {/* Card wrapper */}
            <div className="book-card h-full overflow-hidden relative active:scale-95 transition-all duration-200 flex flex-col">

                {/* ── Cover image area ──────────────────────────── */}
                <div className="relative aspect-[3/4] w-full flex-none overflow-hidden border-b-[3px] border-[#111]">
                    {coverSrc && !imgError ? (
                        <img
                            src={coverSrc}
                            alt={title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                            loading="lazy"
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        /* Stylised placeholder when no cover */
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2"
                            style={{ background: "linear-gradient(160deg,#ff4d3d 0%,#b91c1c 50%,#7f1d1d 100%)" }}>
                            {/* Decorative lines */}
                            <div className="absolute inset-0 opacity-10">
                                {[...Array(8)].map((_, i) => (
                                    <div key={i} className="absolute w-full h-px bg-white"
                                        style={{ top: `${(i + 1) * 12.5}%` }} />
                                ))}
                            </div>
                            <BookOpen className="w-14 h-14 text-white/80 relative" />
                            <p className="text-white/70 text-[10px] font-black uppercase tracking-widest relative px-2 text-center leading-tight">
                                {title}
                            </p>
                        </div>
                    )}

                </div>

                {/* ── Action Buttons (Footer) ───────────────────── */}
                <div className="flex-1 bg-[#fffbf3] p-2 flex gap-1.5 md:gap-2 justify-end items-center">
                    <button
                        onClick={(e) => { e.preventDefault(); window.location.href = `/read/${id}#quiz`; }}
                        className={`group/btn flex items-center gap-1.5 text-[10px] md:text-xs font-black px-3 py-2 rounded-xl transition-all ${
                            hasQuiz
                                ? 'bg-[#e63329] text-white hover:bg-[#b91c1c] active:scale-95'
                                : 'bg-[#f0f0f0] text-[#999] hover:bg-[#e0e0e0] active:scale-95'
                        }`}
                        title={hasQuiz ? "Take Quiz" : "No Quiz Available"}
                    >
                        <Trophy className={`w-3.5 h-3.5 md:w-4 md:h-4 transition-transform group-hover/btn:scale-110 ${hasQuiz ? 'text-yellow-300' : ''}`} /> 
                        <span className="hidden sm:inline">Quiz</span>
                    </button>
                    
                    <button onClick={(e) => {
                        e.preventDefault();
                        if (navigator.share) {
                            navigator.share({ title, text: `Check out ${title}!`, url: `${window.location.origin}/read/${id}` }).catch(console.warn);
                        } else {
                            navigator.clipboard.writeText(`${window.location.origin}/read/${id}`);
                            alert("Link copied!");
                        }
                    }} className="group/btn relative w-8 h-8 md:w-9 md:h-9 flex items-center justify-center rounded-xl bg-white border-2 border-[#111] shadow-[0_3px_0_#111] hover:-translate-y-0.5 hover:shadow-[0_4px_0_#111] active:translate-y-[2px] active:shadow-none transition-all shrink-0"
                        title="Share">
                        <Share2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#111] transition-transform group-hover/btn:scale-110" />
                    </button>
                    
                    <button onClick={handleDownload} disabled={downloading || isOfflineReady}
                        className={`group/btn relative w-8 h-8 md:w-9 md:h-9 flex items-center justify-center rounded-xl shadow-[0_3px_0_#111] border-2 border-[#111] transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_0_#111] active:translate-y-[2px] active:shadow-none shrink-0 ${isOfflineReady ? 'bg-[#22c55e] text-white' : 'bg-white text-[#111]'}`}
                        title="Download for offline">
                        {downloading ? <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" /> :
                            isOfflineReady ? <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 transition-transform group-hover/btn:scale-110" /> :
                                <Download className="w-3.5 h-3.5 md:w-4 md:h-4 transition-transform group-hover/btn:scale-110" />}
                    </button>
                </div>

                {/* Bottom highlight strip on hover */}
                <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-[17px] bg-[#e63329] scale-x-0 group-hover/card:scale-x-100 transition-transform origin-left duration-300" />
            </div>
        </Link>
    );
}
