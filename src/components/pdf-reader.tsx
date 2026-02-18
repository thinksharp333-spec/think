"use client";

import { useState, useEffect, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
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
    onLoadSuccess?: (numPages: number) => void;
}


export function PdfReader({ url, onPageChange, onLoadSuccess }: PdfReaderProps) {
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
    }

    function onDocumentLoadError(err: Error) {
        console.error("PDF Load Error:", err);
        setLoading(false);
        setError(err.message);
        onLoadSuccess?.(numPages);

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

    async function handleDownload() {
        const targetFileId = book?.fileId || bookIdNum?.toString(); // Fallback to id if fileId missing
        if (!url && !targetFileId) return;

        setDownloading(true);
        try {
            // Save to DB for true offline access if not already there
            if (!book?.pdfBlob) {
                // Use proxy to avoid CORS
                const proxyUrl = book?.fileId ? `/api/proxy-pdf?fileId=${book.fileId}` : url;
                const response = await fetch(proxyUrl);

                if (response.ok) {
                    const blob = await response.blob();
                    if (db && db.books && bookIdNum !== undefined) {
                        await db.books.update(bookIdNum, { pdfBlob: blob });
                        setIsOfflineReady(true);
                        alert("Book stored in local database for offline reading!");
                    }
                } else {
                    throw new Error(`Failed to download: ${response.statusText}`);
                }
            } else {
                setIsOfflineReady(true);
                alert("Book is already stored locally!");
            }
        } catch (error: any) {
            console.error("Download failed:", error);
            alert(`Download failed: ${error.message}. Please check your connection.`);
        } finally {
            setDownloading(false);
        }
    }

    return (
        <div className="flex flex-col items-center w-full">
            {/* Download Action */}
            <div className="w-full flex justify-end mb-2">
                <button
                    onClick={handleDownload}
                    disabled={downloading || isOfflineReady}
                    className="text-xs flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1.5 rounded-full hover:bg-green-100 disabled:opacity-50"
                >
                    {downloading ? <Loader2 className="w-3 h-3 animate-spin" /> : (
                        isOfflineReady ? "✓ Stored Locally" : "⬇ Store Offline"
                    )}
                </button>
            </div>

            <div className="relative w-full min-h-[400px] flex justify-center bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 transition-opacity">
                        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                    </div>
                )}

                {error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-4 text-center">
                        <p className="text-red-500 font-bold mb-2">Oops! Couldn't load the book.</p>
                        <p className="text-xs text-gray-500 max-w-[200px]">{error}</p>
                    </div>
                )}

                {activeUrl && (
                    <Document
                        key={activeUrl}
                        file={activeUrl}
                        onLoadSuccess={onDocumentLoadSuccess}
                        onLoadError={onDocumentLoadError}
                        options={pdfOptions}
                        className="max-w-full"
                        loading={null}
                    >
                        {numPages > 0 && (
                            <Page
                                pageNumber={pageNumber}
                                width={typeof window !== 'undefined' ? (window.innerWidth > 600 ? 600 : window.innerWidth - 32) : 600}
                                className="shadow-lg"
                                renderAnnotationLayer={false}
                                renderTextLayer={false}
                                loading={null}
                            />
                        )}
                    </Document>
                )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-6 mt-4 bg-white px-6 py-2 rounded-full shadow-sm border">
                <button
                    onClick={() => changePage(-1)}
                    disabled={pageNumber <= 1}
                    className="p-2 disabled:opacity-30 hover:bg-gray-100 rounded-full"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>

                <span className="text-sm font-medium">
                    {pageNumber} / {numPages || '--'}
                </span>

                <button
                    onClick={() => changePage(1)}
                    disabled={pageNumber >= numPages}
                    className="p-2 disabled:opacity-30 hover:bg-gray-100 rounded-full"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
