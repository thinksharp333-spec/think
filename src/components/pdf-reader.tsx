"use client";

import { useState, useEffect, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, Loader2, Trophy, Download } from 'lucide-react';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { db, Book } from '@/lib/db';

// Configure worker globally for reliability
if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

interface PdfReaderProps {
    url: string;
    book?: Book;
    bookIdNum?: number;
    onPageChange?: (page: number) => void;
    onWordCount?: (page: number, count: number) => void;
    onLoadSuccess?: (numPages: number) => void;
}

export function PdfReader({ url, book, bookIdNum, onPageChange, onWordCount, onLoadSuccess }: PdfReaderProps) {
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [isOfflineReady, setIsOfflineReady] = useState(false);

    // Reset state when URL changes
    useEffect(() => {
        setNumPages(0);
        setPageNumber(1);
        setLoading(true);
        setError(null);

        // If we have a blob in the database, use it!
        if (book?.pdfBlob) {
            const url = URL.createObjectURL(book.pdfBlob);
            setBlobUrl(url);
            setIsOfflineReady(true);
            return () => {
                URL.revokeObjectURL(url);
            };
        } else {
            setBlobUrl(null);
            setIsOfflineReady(false);
        }
    }, [url, book?.pdfBlob]);

    const activeUrl = useMemo(() => {
        if (blobUrl) return blobUrl;
        if (book?.fileId) return `/api/proxy-pdf?fileId=${book.fileId}`;
        return url;
    }, [blobUrl, book?.fileId, url]);

    const pdfOptions = useMemo(() => ({
        workerSrc: '/pdf.worker.min.mjs',
        cMapUrl: 'https://unpkg.com/pdfjs-dist@4.4.168/cmaps/',
        cMapPacked: true,
    }), []);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
        setLoading(false);
        setError(null);
        onLoadSuccess?.(numPages);
    }

    function onDocumentLoadError(err: Error) {
        console.error("PDF Load Error:", err);
        setLoading(false);
        setError(err.message);
        // onLoadSuccess?.(numPages);

    }

    // Notify parent of page change safely
    useEffect(() => {
        onPageChange?.(pageNumber);
    }, [pageNumber, onPageChange]);

    function changePage(offset: number) {
        setPageNumber(prev => {
            return Math.min(Math.max(prev + offset, 1), numPages);
        });
    }

    const [downloading, setDownloading] = useState(false);
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [pageScale, setPageScale] = useState<number>(1.0);
    const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

    async function handleDownload() {
        const targetFileId = book?.fileId || bookIdNum?.toString();
        if (!url && !targetFileId) return;

        setDownloading(true);
        try {
            if (!book?.pdfBlob) {
                const proxyUrl = book?.fileId ? `/api/proxy-pdf?fileId=${book.fileId}` : url;
                const response = await fetch(proxyUrl);
                if (response.ok) {
                    const blob = await response.blob();
                    if (db && db.books && bookIdNum !== undefined) {
                        await db.books.update(bookIdNum, { pdfBlob: blob });
                        setIsOfflineReady(true);
                        alert("Book stored in local database!");
                    }
                } else {
                    throw new Error(`Failed to download: ${response.statusText}`);
                }
            } else {
                setIsOfflineReady(true);
            }
        } catch (error: any) {
            console.error("Download failed:", error);
            alert(`Download failed: ${error.message}`);
        } finally {
            setDownloading(false);
        }
    }

    async function onPageLoadSuccess(page: any) {
        if (typeof window === 'undefined') return;

        const { originalWidth, originalHeight } = page;
        const isPortrait = originalHeight > originalWidth;
        setOrientation(isPortrait ? 'portrait' : 'landscape');

        // Adaptive Scaling Logic
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        // Reserve space for controls and absolute safety margins
        const availableHeight = windowHeight - (isFocusMode ? 140 : 200);
        const availableWidth = windowWidth - 48;

        if (isPortrait) {
            const scaleToFitHeight = availableHeight / originalHeight;
            setPageScale(scaleToFitHeight);
        } else {
            const targetWidth = Math.min(availableWidth, 1000);
            const scaleToFitWidth = targetWidth / originalWidth;
            setPageScale(scaleToFitWidth);
        }

        // Extract word count for point calculation
        try {
            const textContent = await page.getTextContent();
            const text = textContent.items.map((item: any) => item.str).join(' ');
            const wordCount = text.trim().split(/\s+/).filter((w: string) => w.length > 0).length;
            console.log(`Page ${page.pageNumber} word count: ${wordCount}`);
            onWordCount?.(page.pageNumber, wordCount);
        } catch (error) {
            console.error("Failed to extract text content:", error);
        }
    }

    return (
        <div className={`flex flex-col items-center w-full min-h-screen transition-all duration-700 ${isFocusMode ? 'bg-[#0a0a0a] py-4' : 'bg-gray-50/50 py-8'}`}>
            <div className={`w-full relative group transition-all duration-700 ${orientation === 'landscape' ? 'max-w-6xl' : 'max-w-fit'}`}>

                {/* Floating Actions */}
                <div className="absolute top-4 right-4 flex items-center gap-2 z-40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => setIsFocusMode(!isFocusMode)}
                        className={`p-2.5 rounded-full backdrop-blur-xl border shadow-2xl transition-all hover:scale-110 ${isFocusMode ? 'bg-white/10 border-white/20 text-white' : 'bg-white border-gray-200 text-gray-700'
                            }`}
                        title={isFocusMode ? "Exit Focus Mode" : "Focus Mode"}
                    >
                        <Trophy className={`w-5 h-5 ${isFocusMode ? 'fill-yellow-400 text-yellow-400 animate-pulse' : ''}`} />
                    </button>
                    {!isOfflineReady && (
                        <button
                            onClick={handleDownload}
                            disabled={downloading}
                            className="bg-green-600 text-white p-2.5 rounded-full shadow-2xl hover:bg-green-700 disabled:opacity-50 transition-transform hover:scale-110"
                        >
                            {downloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                        </button>
                    )}
                </div>

                <div className={`relative flex justify-center rounded-2xl transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] ${isFocusMode
                    ? 'shadow-[0_0_80px_rgba(0,0,0,0.6)] ring-1 ring-white/10'
                    : 'shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-200 bg-white'
                    }`}>
                    {loading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-white/80 backdrop-blur-md rounded-2xl">
                            <Loader2 className="w-12 h-12 animate-spin text-green-600 mb-4" />
                            <p className="text-sm font-bold text-gray-600 uppercase tracking-widest">Aesthetic Loading...</p>
                        </div>
                    )}

                    {activeUrl && (
                        <Document
                            key={`${activeUrl}-${isFocusMode}`}
                            file={activeUrl}
                            onLoadSuccess={onDocumentLoadSuccess}
                            onLoadError={onDocumentLoadError}
                            options={pdfOptions}
                            className="relative overflow-visible"
                            loading={null}
                        >
                            {/* Realistic Page Shadow & Edge */}
                            <div className="absolute inset-y-0 -left-px w-px bg-black/10 z-20 pointer-events-none" />
                            <div className="absolute inset-0 pointer-events-none opacity-[0.04] mix-blend-multiply bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] z-30" />

                            {numPages > 0 && (
                                <Page
                                    pageNumber={pageNumber}
                                    scale={pageScale}
                                    onLoadSuccess={onPageLoadSuccess}
                                    className="transition-all duration-700 ease-out select-none shadow-2xl"
                                    renderAnnotationLayer={false}
                                    renderTextLayer={false}
                                    loading={null}
                                />
                            )}
                        </Document>
                    )}

                    {/* Navigation Hotspots - Only for multi-page */}
                    {numPages > 1 && (
                        <>
                            <div
                                className="absolute inset-y-0 left-0 w-[20%] flex items-center justify-start pl-6 cursor-pointer group/nav z-30"
                                onClick={() => changePage(-1)}
                            >
                                <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-xl border border-white/20 flex items-center justify-center opacity-0 group-hover/nav:opacity-100 group-hover/nav:scale-110 transition-all shadow-2xl">
                                    <ChevronLeft className="w-7 h-7 text-white" />
                                </div>
                            </div>
                            <div
                                className="absolute inset-y-0 right-0 w-[20%] flex items-center justify-end pr-6 cursor-pointer group/nav z-30"
                                onClick={() => changePage(1)}
                            >
                                <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-xl border border-white/20 flex items-center justify-center opacity-0 group-hover/nav:opacity-100 group-hover/nav:scale-110 transition-all shadow-2xl">
                                    <ChevronRight className="w-7 h-7 text-white" />
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Floating Navigation Pill - Only for multi-page */}
                {numPages > 1 && (
                    <div className="mt-4 flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                        <div className="flex items-center gap-8 bg-white/90 backdrop-blur-2xl border border-gray-200 px-8 py-3 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.1)]">
                            <button
                                onClick={() => changePage(-1)}
                                disabled={pageNumber <= 1}
                                className="p-2 disabled:opacity-10 hover:bg-gray-100 rounded-full transition-all active:scale-90"
                            >
                                <ChevronLeft className="w-6 h-6 text-gray-700" />
                            </button>

                            <div className="flex flex-col items-center min-w-[80px]">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-0.5">Progress</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-black text-gray-800 tabular-nums leading-none">{pageNumber}</span>
                                    <span className="text-gray-300 font-bold">/</span>
                                    <span className="text-sm font-bold text-gray-400 tabular-nums">{numPages}</span>
                                </div>
                            </div>

                            <button
                                onClick={() => changePage(1)}
                                disabled={pageNumber >= numPages}
                                className="p-2 disabled:opacity-10 hover:bg-gray-100 rounded-full transition-all active:scale-90"
                            >
                                <ChevronRight className="w-6 h-6 text-gray-700" />
                            </button>
                        </div>

                        {/* Aesthetic Progress Bar */}
                        <div className="w-48 h-1.5 bg-gray-200/50 rounded-full overflow-hidden relative shadow-inner">
                            <div
                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
                                style={{ width: `${(pageNumber / numPages) * 100}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
