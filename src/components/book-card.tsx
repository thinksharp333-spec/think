"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, Download, Loader2, CheckCircle2 } from "lucide-react";
import { db } from "@/lib/db";

interface BookCardProps {
    id: number;
    fileId?: string;
    title: string;
    grade: string;
    level: string;
    pages: number;
    pdfUrl: string;
    pdfBlob?: Blob;
    language: string;
    coverUrl?: string;
}

export function BookCard({ id, fileId, title, grade, level, pages, pdfUrl, pdfBlob, language, coverUrl }: BookCardProps) {

    const [downloading, setDownloading] = useState(false);
    const [isOfflineReady, setIsOfflineReady] = useState(!!pdfBlob);

    // Update status if prop changes
    useEffect(() => {
        if (pdfBlob) setIsOfflineReady(true);
        else checkLocalStore();
    }, [pdfBlob, id]);

    async function checkLocalStore() {
        try {
            const book = await db.books.get(id);
            if (book?.pdfBlob) {
                setIsOfflineReady(true);
            } else {
                setIsOfflineReady(false);
            }
        } catch (e) {
            console.error("Local store check failed", e);
        }
    }

    async function handleDownload(e: React.MouseEvent) {
        e.preventDefault();
        if (isOfflineReady || downloading) return;

        setDownloading(true);
        try {
            // Use proxy to avoid CORS
            const proxyUrl = fileId ? `/api/proxy-pdf?fileId=${fileId}` : pdfUrl;
            const response = await fetch(proxyUrl);

            if (response.ok) {
                const blob = await response.blob();
                // Store in Dexie
                await db.books.update(id, { pdfBlob: blob });
                setIsOfflineReady(true);
            } else {
                throw new Error(`Server responded with ${response.status}`);
            }
        } catch (error: any) {
            console.error("Download failed:", error);
            alert(`Download failed: ${error.message}. Please check your connection.`);
        } finally {
            setDownloading(false);
        }
    }

    return (
        <Link href={`/read/${id}`} className="block text-left group/card relative">
            <div className="bg-white p-5 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-gray-100 active:scale-95 transition-all duration-300 h-full hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)] hover:-translate-y-2">
                <div className="aspect-[1.5/1] bg-gray-900 rounded-xl mb-4 relative overflow-hidden ring-1 ring-black/10 shadow-inner group-hover/card:ring-green-500/30 transition-all duration-500">
                    {/* Cover Image or Placeholder */}
                    {coverUrl ? (
                        <div className="absolute inset-0 w-full h-full flex items-center justify-center">
                            {/* Blurred Backdrop */}
                            <img
                                src={coverUrl}
                                alt=""
                                className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-110 pointer-events-none"
                            />

                            {/* Sharp, Uncropped Cover */}
                            <img
                                src={coverUrl}
                                alt={title}
                                className="relative z-[1] h-full w-auto max-w-full object-contain shadow-2xl group-hover/card:scale-[1.05] transition-transform duration-1000 ease-out"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />

                            {/* Physical Book Spine/Gradient Refinement */}
                            <div className="absolute inset-y-0 left-0 w-[8%] bg-gradient-to-r from-black/40 via-black/10 to-transparent z-[2] pointer-events-none" />
                        </div>
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-400 bg-gray-100">
                            <BookOpen className="w-12 h-12 opacity-30" />
                        </div>
                    )}


                    {/* Level & Language Badges */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                        <div className="bg-black/70 backdrop-blur-md text-white px-3 py-1 rounded-full text-[11px] font-bold border border-white/20 uppercase tracking-tight w-fit">
                            Level {level}
                        </div>
                        {language && (
                            <div className="bg-green-600/90 backdrop-blur-md text-white px-3 py-1 rounded-full text-[11px] font-bold border border-white/20 uppercase tracking-tight w-fit">
                                {language}
                            </div>
                        )}
                    </div>

                    {/* Download Overlay Button */}
                    <button
                        onClick={handleDownload}
                        disabled={downloading || isOfflineReady}
                        className={`absolute bottom-3 right-3 p-2 rounded-full shadow-lg transition-all z-10 
              ${isOfflineReady
                                ? 'bg-green-100 text-green-600'
                                : 'bg-white text-gray-700 hover:bg-green-600 hover:text-white'}`}
                    >
                        {downloading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : isOfflineReady ? (
                            <CheckCircle2 className="w-5 h-5" />
                        ) : (
                            <Download className="w-5 h-5" />
                        )}
                    </button>
                </div>

                <h3 className="text-lg font-bold text-gray-800 line-clamp-1 leading-tight group-hover/card:text-green-700 transition-colors uppercase tracking-tight">{title}</h3>
                <div className="flex items-center justify-between mt-2">
                    <p className="text-sm text-gray-500 font-medium">{grade} • {pages} pages</p>
                    {isOfflineReady && (
                        <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">Offline Ok</span>
                    )}
                </div>
            </div>
        </Link>
    );
}
