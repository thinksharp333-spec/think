import * as pdfjs from 'pdfjs-dist';

// Configure the worker for pdfjs-dist
if (typeof window !== 'undefined' && 'pdfjsLib' in window) {
    // @ts-ignore
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

/**
 * Extracts the first page of a PDF and returns it as a JPEG Blob.
 * @param pdfBlob The source PDF Blob
 * @param quality Quality of the JPEG (0 to 1)
 * @returns A Promise resolving to a JPEG Blob or null if extraction fails
 */
export async function generateCoverFromPdf(pdfBlob: Blob, quality = 0.85): Promise<Blob | null> {
    try {
        const arrayBuffer = await pdfBlob.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;

        if (pdf.numPages === 0) return null;

        // Load the first page
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 }); // High enough scale for good quality

        // Prepare canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) return null;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Render PDF page into canvas context
        const renderContext = {
            canvasContext: context,
            viewport: viewport,
        };

        await page.render(renderContext).promise;

        // Convert canvas to blob
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/jpeg', quality);
        });
    } catch (error) {
        console.error("Failed to generate cover:", error);
        return null;
    }
}
