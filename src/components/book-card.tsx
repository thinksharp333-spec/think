"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, Download, Loader2, CheckCircle2 } from "lucide-react";
import { extractFileId, getThumbnailUrl } from "@/lib/google-drive";

interface BookCardProps {
    id: number;
    fileId?: string;
    title: string;
    grade: string;
    level: string;
    pages: number;
    pdfUrl: string;
    coverUrl?: string;
}

export function BookCard({ id, title, grade, pages, pdfUrl, coverUrl }: BookCardProps) {
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
                    {/* Placeholder or Cover */}
                    {coverUrl ? (
                        <img
                            src={coverUrl.includes('drive.google.com') ? getThumbnailUrl(extractFileId(coverUrl)) : coverUrl}
                            alt={title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                            <BookOpen className="w-8 h-8" />
                        </div>
                    )}

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
