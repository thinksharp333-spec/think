export interface DriveItem {
    id: string;
    name: string;
    mimeType: string;
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY;

export async function fetchDriveContents(folderId: string): Promise<DriveItem[]> {
    if (!API_KEY) {
        throw new Error("NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY is not defined in .env.local");
    }

    const url = new URL("https://www.googleapis.com/drive/v3/files");
    // Fetch folders, PDFs, Images, and Shortcuts
    url.searchParams.append("q", `'${folderId}' in parents and (mimeType = 'application/pdf' or mimeType = 'application/vnd.google-apps.folder' or mimeType = 'application/vnd.google-apps.shortcut' or mimeType = 'image/jpeg' or mimeType = 'image/png') and trashed = false`);
    url.searchParams.append("fields", "files(id, name, mimeType, shortcutDetails)");
    url.searchParams.append("pageSize", "1000");
    url.searchParams.append("key", API_KEY);
    url.searchParams.append("supportsAllDrives", "true");
    url.searchParams.append("includeItemsFromAllDrives", "true");

    const response = await fetch(url.toString());

    if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch (e) {
            errorData = { message: "Could not parse JSON error response" };
        }

        console.error(`[DriveAPI] Error ${response.status} fetching ${folderId}:`, errorData);

        if (response.status === 403) {
            console.warn(`[DriveAPI] 403 Forbidden. Check if folder is SHARED and API Key is valid.`);
        }

        const message = errorData.error?.message || `API Error ${response.status}: ${response.statusText}`;
        throw new Error(message);
    }

    const data = await response.json();
    console.log(`[DriveAPI] Fetched ${folderId}, found ${data.files?.length || 0} items`);
    return data.files || [];
}

export async function fetchDriveItem(fileId: string): Promise<DriveItem> {
    if (!API_KEY) throw new Error("API_KEY not defined");
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType&key=${API_KEY}&supportsAllDrives=true`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch item ${fileId}`);
    return await response.json();
}

export async function fetchSheetsData(spreadsheetId: string): Promise<Record<string, string>> {
    if (!API_KEY) {
        throw new Error("NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY is not defined");
    }

    // Attempt to parse out ID from a full URL if provided
    let id = spreadsheetId.trim();
    if (id.includes('/d/')) {
        id = id.split('/d/')[1].split('/')[0];
    }

    const range = "A:B"; // Assume Col A: Title, Col B: Cover URL
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${range}?key=${API_KEY}`;

    const response = await fetch(url);
    if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch (e) {
            errorData = { message: "Could not parse error response" };
        }

        if (response.status === 403) {
            console.warn(`[SheetsAPI] 403 Forbidden. Possible causes:
            1. Google Sheets API is NOT enabled in Cloud Console.
            2. Your API Key is restricted (Check "API Restrictions" in Google Cloud Console).
            3. The Sheet is not shared as "Anyone with the link can view".`);
        }

        console.error(`[SheetsAPI] Full Error Content:`, errorData);

        let errorMessage = errorData.error?.message || `Sheets API Error ${response.status}: ${response.statusText}`;

        // Specific check for XLSX conversion issue
        if (errorMessage.includes("not supported for this document")) {
            errorMessage = "UNSUPPORTED DOCUMENT: Your file is likely in .XLSX format. Please open it in Google Sheets and go to 'File' > 'Save as Google Sheets', then use the new ID.";
        }

        console.warn(`[SheetsAPI] Diagnostic: Try opening this URL in your browser (replace YOUR_KEY): 
        https://sheets.googleapis.com/v4/spreadsheets/${id}/values/A:B?key=YOUR_API_KEY`);

        throw new Error(errorMessage);
    }

    const data = await response.json();
    const mapping: Record<string, string> = {};

    if (data.values) {
        data.values.forEach((row: string[]) => {
            if (row[0] && row[1]) {
                const title = row[0].trim().toLowerCase();
                mapping[title] = row[1].trim();
            }
        });
    }

    console.log(`[SheetsAPI] Loaded ${Object.keys(mapping).length} cover mappings`);
    return mapping;
}

export function getDirectDownloadUrl(fileId: string): string {
    return `https://docs.google.com/uc?export=download&id=${fileId}`;
}
