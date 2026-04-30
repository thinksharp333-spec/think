"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Loader2, Download } from 'lucide-react';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { db, Book } from '@/lib/db';

// Set worker once at module level — never reset
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

// GAP-02 FIX: Use locally-hosted cmaps (public/cmaps/) instead of unpkg CDN.
// This ensures non-Latin PDFs (Hindi, Marathi, etc.) render correctly offline.
const PDF_OPTIONS = {
    cMapUrl: '/cmaps/',
    cMapPacked: true,
};

interface PdfReaderProps {
    url: string;
    book?: Book;
    bookIdNum?: number;
    pageNumber: number;
    twoPageView?: boolean;
    onNumPagesChange?: (n: number) => void;
    onWordCount?: (page: number, count: number) => void;
    onLoadSuccess?: (numPages: number) => void;
}

export function PdfReader({
    url,
    book,
    bookIdNum,
    pageNumber,
    twoPageView = false,
    onNumPagesChange,
    onWordCount,
}: PdfReaderProps) {

    const [loading, setLoading] = useState(true);
    const [numPages, setNumPages] = useState(0);
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [isOfflineReady, setIsOfflineReady] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [pageWidth, setPageWidth] = useState(400);
    const stableWidth = useRef(400);
    // Natural aspect ratio (w/h) of the PDF page — unknown until first page renders
    const pageAspectRef = useRef<number | null>(null);

    const computeWidth = () => {
        if (!containerRef.current) return;
        
        // Use virtually all available space, but keep a 12% vertical "safe zone"
        // for varying screen aspect ratios to guarantee visibility and prevent cropping at the bottom.
        const w = Math.floor(containerRef.current.clientWidth * 0.96);
        const h = Math.floor(containerRef.current.clientHeight * 0.88);
        
        if (w <= 0 || h <= 0) return;

        let effective: number;
        if (twoPageView) {
            effective = Math.floor((w - 10) / 2);
        } else {
            // Fit within both dimensions using known aspect ratio
            const aspect = pageAspectRef.current;
            const maxWFromHeight = aspect && h > 0 ? Math.floor(h * aspect) : w;
            
            // Final fit ensures we respect the 6% safe height gutter
            effective = Math.min(w, maxWFromHeight);
        }

        if (effective > 0 && (Math.abs(effective - stableWidth.current) > 2 || stableWidth.current === 400)) {
            stableWidth.current = effective;
            setPageWidth(effective);
        }
    };

    useEffect(() => {
        const t = setTimeout(computeWidth, 100);
        let raf: number;
        const onResize = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(computeWidth); };
        window.addEventListener('resize', onResize);
        return () => { clearTimeout(t); cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [twoPageView]);

    useEffect(() => {
        setLoading(true);
        pageAspectRef.current = null; // reset so new book remeasures
        stableWidth.current = 400;
        if (book?.pdfBlob) {
            const objUrl = URL.createObjectURL(book.pdfBlob);
            setBlobUrl(objUrl);
            setIsOfflineReady(true);
            return () => URL.revokeObjectURL(objUrl);
        }
        setBlobUrl(null);
        setIsOfflineReady(false);
    }, [url, book?.pdfBlob]);

    // PDF is only saved to IndexedDB when the user explicitly clicks the download button.
    // No auto-download — download is a deliberate user action.

    const activeUrl = useMemo(() => {
        if (blobUrl) return blobUrl;
        if (book?.fileId) return `/api/proxy-pdf?fileId=${book.fileId}`;
        return url;
    }, [blobUrl, book?.fileId, url]);

    function onDocumentLoadSuccess({ numPages: n }: { numPages: number }) {
        setNumPages(n);
        onNumPagesChange?.(n);
        setLoading(false);
    }

    async function onPageLoadSuccess(page: any) {
        // Capture aspect ratio dynamically to handle varying page sizes in a single book
        try {
            const vp = page.getViewport({ scale: 1 });
            if (vp.width > 0 && vp.height > 0) {
                const newAspect = vp.width / vp.height;
                // Only recompute if the aspect ratio changed significantly (e.g., > 2%)
                if (pageAspectRef.current === null || Math.abs(pageAspectRef.current - newAspect) > 0.02) {
                    pageAspectRef.current = newAspect;
                    computeWidth(); // recompute now that we know the real aspect
                }
            }
        } catch (_) { /* ignore */ }
        try {
            const textContent = await page.getTextContent();
            const text = textContent.items.map((item: any) => item.str).join(' ');
            const wordCount = text.trim().split(/\s+/).filter((w: string) => w.length > 0).length;
            onWordCount?.(page.pageNumber, wordCount);
        } catch (_) { /* silent */ }
    }

    async function handleDownload() {
        setDownloading(true);
        try {
            if (!book?.pdfBlob) {
                const proxyUrl = book?.fileId ? `/api/proxy-pdf?fileId=${book.fileId}` : url;
                const response = await fetch(proxyUrl);
                if (response.ok && bookIdNum !== undefined) {
                    await db.books.update(bookIdNum, { pdfBlob: await response.blob() });
                    setIsOfflineReady(true);
                }
            } else {
                setIsOfflineReady(true);
            }
        } catch (err) { console.error("Download failed:", err); }
        finally { setDownloading(false); }
    }

    const memoizedOptions = useMemo(() => PDF_OPTIONS, []);

    const leftPage = Math.min(pageNumber, numPages || pageNumber);
    const rightPage = pageNumber + 1;

    return (
        <div ref={containerRef} className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden bg-[#faf6ed]">
            {!isOfflineReady && (
                <button onClick={handleDownload} disabled={downloading}
                    className="absolute top-3 right-3 z-40 bg-green-600 text-white p-2 rounded-full shadow-lg hover:bg-green-700 disabled:opacity-50 transition-all hover:scale-110"
                    title="Save for offline reading">
                    {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                </button>
            )}

            {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-[#fdfaf1]">
                    <Loader2 className="w-10 h-10 animate-spin text-[#e63329] mb-3" />
                    <p className="text-[10px] font-black text-[#e63329]/60 uppercase tracking-widest">Loading Book...</p>
                </div>
            )}

            {activeUrl && (
                <Document
                    key={activeUrl}
                    file={activeUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={(err) => { console.error("PDF Error:", err); setLoading(false); }}
                    options={memoizedOptions}
                    loading={null}
                    className="flex flex-col items-center justify-center anim-page-fade-in"
                >
                    {numPages > 0 && pageWidth > 0 && (
                        twoPageView ? (
                            <div className="flex items-center justify-center gap-1">
                                {/* Left page */}
                                <div className="shadow-lg border border-black/5 bg-white overflow-hidden">
                                    <Page
                                        key={`${activeUrl}-L-${leftPage}`}
                                        pageNumber={leftPage}
                                        width={pageWidth}
                                        onLoadSuccess={onPageLoadSuccess}
                                        renderAnnotationLayer={false}
                                        renderTextLayer={false}
                                        loading={null}
                                    />
                                </div>
                                {/* Centre spine shadow - narrow */}
                                <div className="flex-shrink-0 self-stretch w-[1px] bg-black/5" />
                                {/* Right page */}
                                <div className="shadow-lg border border-black/5 bg-white overflow-hidden">
                                    {rightPage <= numPages ? (
                                        <Page
                                            key={`${activeUrl}-R-${rightPage}`}
                                            pageNumber={rightPage}
                                            width={pageWidth}
                                            onLoadSuccess={onPageLoadSuccess}
                                            renderAnnotationLayer={false}
                                            renderTextLayer={false}
                                            loading={null}
                                        />
                                    ) : (
                                        <div style={{ width: pageWidth }}
                                            className="h-full flex items-center justify-center text-black/10 text-xs font-bold select-none">
                                            End of Book
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="shadow-2xl border border-black/5 bg-white overflow-hidden max-w-full max-h-full">
                                <Page
                                    key={`${activeUrl}-${leftPage}`}
                                    pageNumber={leftPage}
                                    width={pageWidth}
                                    onLoadSuccess={onPageLoadSuccess}
                                    renderAnnotationLayer={false}
                                    renderTextLayer={false}
                                    loading={null}
                                    className="max-h-full"
                                />
                            </div>
                        )
                    )}
                </Document>
            )}
        </div>
    );
}

/* ─────────────────────────────────────────────
   Book Scroll Thumbnail Strip
   Renders a separate Document at small scale for the bottom scroll strip.
───────────────────────────────────────────── */
interface PdfScrollThumbnailsProps {
    url: string;
    book?: Book;
    numPages: number;
    activePage: number;
    onPageClick: (page: number) => void;
}

export function PdfScrollThumbnails({ url, book, numPages, activePage, onPageClick }: PdfScrollThumbnailsProps) {
    const [blobUrl, setBlobUrl] = useState<string | null>(null);

    useEffect(() => {
        if (book?.pdfBlob) {
            const objUrl = URL.createObjectURL(book.pdfBlob);
            setBlobUrl(objUrl);
            return () => URL.revokeObjectURL(objUrl);
        }
        setBlobUrl(null);
    }, [book?.pdfBlob]);

    const activeUrl = useMemo(() => {
        if (blobUrl) return blobUrl;
        if (book?.fileId) return `/api/proxy-pdf?fileId=${book.fileId}`;
        return url;
    }, [blobUrl, book?.fileId, url]);

    // Build spreads: [1,3,5,...]
    const spreads = useMemo(
        () => Array.from({ length: Math.ceil(numPages / 2) }, (_, i) => i * 2 + 1),
        [numPages]
    );

    const memoizedOptions = useMemo(() => PDF_OPTIONS, []);

    if (numPages === 0) return (
        <div className="flex gap-2 items-center">
            {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex-shrink-0 rounded-lg opacity-20"
                    style={{ width: 116, height: 78, background: 'rgba(255,255,255,0.1)', border: '3px solid rgba(255,255,255,0.08)' }} />
            ))}
        </div>
    );

    return (
        <Document
            key={`scroll-${activeUrl}`}
            file={activeUrl}
            options={memoizedOptions}
            loading={null}
            className="flex gap-2 items-center"
        >
            {spreads.map(leftPage => {
                const rightPage = leftPage + 1;
                const isActive = activePage === leftPage || activePage === rightPage;
                return (
                    <button
                        key={leftPage}
                        onClick={() => onPageClick(leftPage)}
                        className="flex-shrink-0 flex overflow-hidden rounded-lg transition-all duration-200"
                        style={{
                            border: isActive ? '3px solid #e63329' : '3px solid rgba(255,255,255,0.08)',
                            boxShadow: isActive ? '0 0 18px rgba(230,51,41,0.5)' : 'none',
                            transform: isActive ? 'scale(1.08)' : 'scale(1)',
                            opacity: isActive ? 1 : 0.55,
                            background: '#faf6ed',
                        }}
                    >
                        <Page
                            pageNumber={leftPage}
                            width={54}
                            renderAnnotationLayer={false}
                            renderTextLayer={false}
                            loading={<div style={{ width: 54, height: 72 }} className="bg-[#faf6ed]" />}
                        />
                        {rightPage <= numPages && (
                            <>
                                <div className="w-px self-stretch bg-black/10 flex-shrink-0" />
                                <Page
                                    pageNumber={rightPage}
                                    width={54}
                                    renderAnnotationLayer={false}
                                    renderTextLayer={false}
                                    loading={<div style={{ width: 54, height: 72 }} className="bg-[#faf6ed]" />}
                                />
                            </>
                        )}
                    </button>
                );
            })}
        </Document>
    );
}
