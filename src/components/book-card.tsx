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
            <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 active:scale-95 transition-transform h-full">
                <div className="aspect-[3/4] bg-gray-100 rounded-lg mb-3 relative overflow-hidden">
                    {/* Cover Image or Placeholder */}
                    {coverUrl ? (
                        <img
                            src={coverUrl}
                            alt={title}
                            className="absolute inset-0 w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                            <BookOpen className="w-8 h-8" />
                        </div>
                    )}


                    {/* Level & Language Badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                        <div className="bg-black/60 backdrop-blur-md text-white px-2 py-0.5 rounded-full text-[10px] font-bold border border-white/10 uppercase tracking-tighter w-fit">
                            Level {level}
                        </div>
                        {language && (
                            <div className="bg-green-600/80 backdrop-blur-md text-white px-2 py-0.5 rounded-full text-[10px] font-bold border border-white/10 uppercase tracking-tighter w-fit">
                                {language}
                            </div>
                        )}
                    </div>

                    {/* Download Overlay Button */}
                    <button
                        onClick={handleDownload}
                        disabled={downloading || isOfflineReady}
                        className={`absolute bottom-2 right-2 p-1.5 rounded-full shadow-md transition-all z-10 
              ${isOfflineReady
                                ? 'bg-green-100 text-green-600'
                                : 'bg-white text-gray-600 hover:bg-green-600 hover:text-white'}`}
                    >
                        {downloading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isOfflineReady ? (
                            <CheckCircle2 className="w-4 h-4" />
                        ) : (
                            <Download className="w-4 h-4" />
                        )}
                    </button>
                </div>

                <h3 className="font-semibold text-gray-800 line-clamp-1 leading-tight">{title}</h3>
                <p className="text-xs text-gray-500 mt-1">{grade} • {pages} pages</p>

                {isOfflineReady && (
                    <span className="text-[10px] text-green-600 font-medium inline-block mt-1">Available Offline</span>
                )}
            </div>
        </Link>
    );
}
