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
        : null;

    return (
        <Link href={`/read/${id}`} className="block group/card relative">
            {/* Card wrapper */}
            <div className="book-card h-full overflow-visible relative active:scale-95 transition-all duration-200">

                {/* ── Cover image area ──────────────────────────── */}
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-t-[17px]">
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

                    {/* Gradient overlay at bottom of cover */}
                    <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
                        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)" }} />

                    {/* Rating badge — top right corner */}
                    {avgRating && avgRating > 0 ? (
                        <div className="absolute top-2 right-2 flex items-center gap-1 bg-[#111]/80 backdrop-blur-sm text-yellow-400 text-[11px] font-black px-2 py-1 rounded-full border border-yellow-400/30">
                            <Star className="w-3 h-3 fill-yellow-400" />
                            {avgRating.toFixed(1)}
                            {reviewCount && reviewCount > 0 &&
                                <span className="text-white/50 font-bold">({reviewCount})</span>
                            }
                        </div>
                    ) : null}

                    {/* Offline ready badge */}
                    {isOfflineReady && (
                        <div className="absolute top-2 left-2 bg-[#22c55e] text-white text-[9px] font-black px-2 py-1 rounded-full border-2 border-white/30 uppercase tracking-wide">
                            ✓ Offline
                        </div>
                    )}

                    {/* Share + Download + Quiz — bottom right of cover */}
                    <div className="absolute bottom-2 right-2 flex gap-1.5 items-end">
                        {hasQuiz && (
                            <button
                                onClick={(e) => { e.preventDefault(); window.location.href = `/read/${id}#quiz`; }}
                                className="flex items-center gap-1 bg-[#e63329] text-white text-[10px] font-black px-2.5 py-2 rounded-full border-2 border-white/30 hover:bg-[#b91c1c] transition-all shadow-lg hover:-translate-y-0.5"
                            >
                                <Trophy className="w-3.5 h-3.5" /> Quiz
                            </button>
                        )}
                        <button onClick={(e) => {
                            e.preventDefault();
                            if (navigator.share) {
                                navigator.share({ title, text: `Check out ${title}!`, url: `${window.location.origin}/read/${id}` }).catch(console.warn);
                            } else {
                                navigator.clipboard.writeText(`${window.location.origin}/read/${id}`);
                                alert("Link copied!");
                            }
                        }} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/90 shadow-lg border-2 border-[#111] hover:-translate-y-0.5 transition-transform"
                            title="Share">
                            <Share2 className="w-3.5 h-3.5 text-[#111]" />
                        </button>
                        <button onClick={handleDownload} disabled={downloading || isOfflineReady}
                            className={`w-8 h-8 flex items-center justify-center rounded-full shadow-lg border-2 border-[#111] transition-all hover:-translate-y-0.5 ${isOfflineReady ? 'bg-[#bbf7d0]' : 'bg-white/90'}`}
                            title="Download for offline">
                            {downloading ? <Loader2 className="w-3.5 h-3.5 text-[#111] animate-spin" /> :
                                isOfflineReady ? <CheckCircle2 className="w-3.5 h-3.5 text-[#22c55e]" /> :
                                    <Download className="w-3.5 h-3.5 text-[#111]" />}
                        </button>
                    </div>
                </div>

                {/* Bottom highlight strip on hover */}
                <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-[17px] bg-[#e63329] scale-x-0 group-hover/card:scale-x-100 transition-transform origin-left duration-300" />
            </div>
        </Link>
    );
}
