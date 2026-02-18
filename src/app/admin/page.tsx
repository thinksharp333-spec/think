"use client";

import { useBooks } from "@/hooks/useBooks";
import { Book, db, User, getSyncKey } from "@/lib/db";
import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
    LayoutDashboard,
    BookOpen,
    Users,
    GraduationCap,
    MapPin,
    Download,
    History,
    Trophy,
    LogOut,
    Search,
    ChevronRight,
    Loader2,
    Trash2,
    Plus,
    Cloud,
    FolderTree
} from "lucide-react";
import { Dropdown } from "@/components/dropdown";
import { fetchDriveContents, getDirectDownloadUrl, DriveItem } from "@/lib/google-drive";
import { supabase } from "@/lib/supabase";


export default function AdminDashboard() {
    const { books, addBook, addBooks, removeBook, syncLibrary } = useBooks();

    const [newBook, setNewBook] = useState<Partial<Book>>({
        title: "",
        grade: "Grade 10",
        pages: 0,
        pdfUrl: "/sample.pdf",
        level: "1",
        subject: "Science",
        language: "English"
    });

    // Google Drive Import State
    const [folderId, setFolderId] = useState("");
    const [scanResults, setScanResults] = useState<Book[]>([]);
    const [scanning, setScanning] = useState(false);
    const [scanStatus, setScanStatus] = useState("");
    const [importing, setImporting] = useState(false);
    const [supabaseStatus, setSupabaseStatus] = useState<'checking' | 'connected' | 'error'>('checking');
    const [storeLocally, setStoreLocally] = useState(false); // Default to FALSE to save storage

    // Check Supabase connection
    useEffect(() => {
        async function checkStatus() {
            if (!supabase) {
                setSupabaseStatus('error');
                return;
            }
            try {
                const { error } = await supabase.from('books').select('count', { count: 'exact', head: true });
                if (error) throw error;
                setSupabaseStatus('connected');
            } catch (err) {
                console.error("Supabase connection check failed:", err);
                setSupabaseStatus('error');
            }
        }
        checkStatus();
    }, []);


    // Student Reporting State
    const [selectedState, setSelectedState] = useState("");
    const [selectedCity, setSelectedCity] = useState("");
    const [selectedSector, setSelectedSector] = useState("");
    const [selectedSchool, setSelectedSchool] = useState("");

    // Mock Location Data
    const LOCATION_DATA: any = {
        "Maharashtra": {
            "Pune": {
                "Sector 1": ["School A", "School B"],
                "Sector 2": ["School C"]
            },
            "Mumbai": {
                "Sector A": ["School D", "School E"]
            }
        },
        "Gujarat": {
            "Ahmedabad": {
                "Sector X": ["School F", "School G"]
            },
            "Surat": {
                "Sector Y": ["School H"]
            }
        }
    };

    // Derived Options
    const stateOptions = Object.keys(LOCATION_DATA).map(s => ({ value: s, label: s }));
    const cityOptions = selectedState ? Object.keys(LOCATION_DATA[selectedState] || {}).map(c => ({ value: c, label: c })) : [];
    const sectorOptions = selectedCity ? Object.keys(LOCATION_DATA[selectedState]?.[selectedCity] || {}).map(s => ({ value: s, label: s })) : [];
    const schoolOptions = selectedSector ? (LOCATION_DATA[selectedState]?.[selectedCity]?.[selectedSector] || []).map((s: string) => ({ value: s, label: s })) : [];

    // Reset logic
    const handleStateChange = (val: string) => {
        setSelectedState(val);
        setSelectedCity("");
        setSelectedSector("");
        setSelectedSchool("");
    };
    const handleCityChange = (val: string) => {
        setSelectedCity(val);
        setSelectedSector("");
        setSelectedSchool("");
    };
    const handleSectorChange = (val: string) => {
        setSelectedSector(val);
        setSelectedSchool("");
    };



    const handleAddBook = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newBook.title && newBook.pages) {
            await addBook({
                title: newBook.title,
                grade: newBook.grade || "Grade 10",
                pages: Number(newBook.pages),
                pdfUrl: newBook.pdfUrl || "/sample.pdf",
                level: newBook.level || "1",
                subject: newBook.subject || "Science",
                language: newBook.language || "English"
            } as Book);
            setNewBook({
                title: "",
                grade: "Grade 10",
                pages: 0,
                pdfUrl: "/sample.pdf",
                level: "1",
                subject: "Science",
                language: "English"
            });
        }
    };

    const handleScan = async () => {
        if (!folderId) return;
        setScanning(true);
        setScanResults([]);
        try {
            // Robust folder ID extraction
            let rootId = folderId.trim();
            if (rootId.includes('id=')) {
                rootId = rootId.split('id=')[1].split('&')[0];
            } else if (rootId.includes('/folders/')) {
                rootId = rootId.split('/folders/')[1].split('?')[0].split('/')[0];
            } else if (rootId.includes('/file/d/')) {
                rootId = rootId.split('/file/d/')[1].split('/')[0];
            } else if (rootId.includes('/d/')) {
                rootId = rootId.split('/d/')[1].split('/')[0];
            }

            console.log(`[DriveScan] Extracted Root ID: "${rootId}" from input: "${folderId}"`);
            setScanStatus(`Processing Root ID: ${rootId}...`);

            setScanStatus("Initializing scan...");
            const discoveredBooks: Book[] = [];

            // recursive scan helper
            const crawl = async (currentFolderId: string, depth: number = 0, currentLevel?: string, currentSubject?: string, currentLanguage?: string) => {
                const items = await fetchDriveContents(currentFolderId);

                for (const item of items) {
                    let nextLevel = currentLevel;
                    let nextSubject = currentSubject;
                    let nextLanguage = currentLanguage;

                    // Handle Folders or Shortcuts to Folders
                    const isFolder = item.mimeType === 'application/vnd.google-apps.folder';
                    const isShortcut = item.mimeType === 'application/vnd.google-apps.shortcut';

                    if (isFolder || isShortcut) {
                        const targetId = isShortcut ? (item as any).shortcutDetails?.targetId : item.id;
                        if (!targetId) continue;

                        const name = item.name.toLowerCase();
                        setScanStatus(`Scanning: ${item.name}...`);

                        // STRICT DEPTH-BASED DETECTION (Language -> Level -> Subject)
                        if (depth === 0) {
                            nextLanguage = item.name; // Root children are Languages
                        }
                        else if (depth === 1) {
                            // Stage 2 children are Levels (e.g., "Level 1", "Grade 10")
                            const match = name.match(/(?:level|lv|grade|std)\s*(\d+)/i);
                            nextLevel = match ? match[1] : item.name.replace(/\D/g, "") || item.name;
                        }
                        else if (depth === 2) {
                            nextSubject = item.name; // Stage 3 children are Subjects
                        }

                        console.log(`[DriveScan] Depth ${depth + 1}: Detected ${item.name} as ${depth === 0 ? 'Language' : depth === 1 ? 'Level' : 'Subject'}`);
                        await crawl(targetId, depth + 1, nextLevel, nextSubject, nextLanguage);
                    } else {
                        // Handle PDFs
                        const isPDF = item.mimeType === 'application/pdf';
                        const isShortcutToPDF = isShortcut && (item as any).shortcutDetails?.targetMimeType === 'application/pdf';

                        if (isPDF || isShortcutToPDF) {
                            const pdfId = isShortcutToPDF ? (item as any).shortcutDetails?.targetId : item.id;
                            if (!pdfId) continue;

                            discoveredBooks.push({
                                title: item.name.replace(/\.pdf$/i, ""),
                                fileId: pdfId,
                                grade: currentLevel ? `Level ${currentLevel}` : "Other",
                                pages: 10,
                                pdfUrl: getDirectDownloadUrl(pdfId),
                                level: currentLevel || "1",
                                subject: currentSubject || "General",
                                language: currentLanguage || "English"
                            });
                        }
                    }
                }
            };

            await crawl(rootId, 0);
            setScanResults(discoveredBooks);
            if (discoveredBooks.length === 0) alert("No PDFs found in the specified folder structure.");
        } catch (error: any) {
            console.error("[DriveScan] Error:", error);
            if (error.message.includes("API keys are not supported")) {
                alert("ERROR: The Google Drive folder is likely PRIVATE. \n\nPlease share the folder as 'Anyone with the link can view' and try again.");
            } else if (error.message.includes("API key not valid")) {
                alert("ERROR: The API Key in .env.local is invalid. \n\nPlease ensure it starts with 'AIza...' and you have restarted the server.");
            } else {
                alert(error.message);
            }
        } finally {
            setScanning(false);
            setScanStatus("");
        }
    };

    const handleImportAll = async () => {
        if (scanResults.length === 0) return;
        setImporting(true);
        let importedCount = 0;
        try {
            // Deduplicate scan results by normalized composite key
            const uniqueResults = Array.from(new Map(
                scanResults.map(item => [getSyncKey(item), item])
            ).values());

            for (const book of uniqueResults) {
                setScanStatus(`Importing Content: ${book.title}...`);

                let pdfBlob: Blob | undefined;
                if (storeLocally) {
                    try {
                        // Use the proxy API to avoid CORS issues
                        const proxyUrl = `/api/proxy-pdf?fileId=${book.fileId}`;
                        const response = await fetch(proxyUrl);
                        if (response.ok) {
                            pdfBlob = await response.blob();
                        }
                    } catch (e) {
                        console.error(`Failed to fetch PDF for ${book.title} via proxy`, e);
                    }
                }

                // Match existing book by normalized composite key
                const sKey = getSyncKey(book);
                const localBooks = await db.books.toArray();
                const existing = localBooks.find(lb => getSyncKey(lb) === sKey);

                await db.books.put({
                    ...book,
                    id: existing?.id,
                    pdfBlob: pdfBlob || existing?.pdfBlob
                });

                // Global Sharing: Upload to Supabase
                if (supabase) {
                    setScanStatus(`Sharing Globally: ${book.title}...`);
                    let finalPdfUrl = book.pdfUrl;

                    // 1. Upload to Storage if blob available
                    if (pdfBlob) {
                        const fileName = `${book.fileId || Date.now()}.pdf`;
                        const { data, error: uploadError } = await supabase.storage
                            .from('books')
                            .upload(fileName, pdfBlob, {
                                contentType: 'application/pdf',
                                upsert: true
                            });

                        if (data && supabase) {
                            const { data: { publicUrl } } = supabase.storage
                                .from('books')
                                .getPublicUrl(fileName);
                            finalPdfUrl = publicUrl;
                        } else if (uploadError) {
                            console.error(`[Supabase] Upload error for ${book.title}:`, uploadError);
                        }
                    }

                    // 2. Save metadata to shared books table
                    const { error: dbError } = await supabase
                        .from('books')
                        .upsert({
                            title: book.title,
                            fileId: book.fileId,
                            grade: book.grade,
                            pages: book.pages,
                            pdfUrl: finalPdfUrl,
                            level: book.level,
                            subject: book.subject,
                            language: book.language,
                            coverUrl: book.coverUrl
                        }, { onConflict: 'title,level,language,subject' }); // Match composite unique constraint

                    if (dbError) {
                        console.error(`[Supabase] DB error for ${book.title}:`, dbError.message, dbError.details);
                        alert(`Cloud save failed for "${book.title}": ${dbError.message}\n\nDid you run the SQL command in Supabase?`);
                        throw new Error(`Supabase error: ${dbError.message}`);
                    }
                }

                importedCount++;
            }

            setScanResults([]);
            setFolderId("");
            await syncLibrary(); // Refresh local view from shared server
            alert(`Successfully imported ${importedCount} books with full content!`);
        } catch (error: any) {
            alert("Import failed: " + error.message);
        } finally {
            setImporting(false);
            setScanStatus("");
        }
    };

    const handleClearLibrary = async (global: boolean = false) => {
        const msg = global
            ? "WARNING: This will delete ALL books from both your device AND the Cloud (Supabase). This cannot be undone. Are you sure?"
            : "Are you sure you want to delete ALL books from this device? (Cloud library will remain safe)";

        if (!confirm(msg)) return;

        try {
            setImporting(true); // Reuse loader

            if (global && supabase) {
                console.log("[Admin] Deleting global library from Supabase...");
                const { error } = await supabase
                    .from('books')
                    .delete()
                    .neq('id', 0); // Delete all rows

                if (error) throw error;
                console.log("[Admin] Cloud library cleared.");
            }

            await db.books.clear();
            alert(global ? "Global library cleared successfully!" : "Local library cleared successfully!");
            await syncLibrary();
        } catch (error: any) {
            console.error("Clear failed:", error);
            alert("Failed to clear library: " + error.message);
        } finally {
            setImporting(false);
        }
    };

    const handleClearDownloads = async () => {
        if (!confirm("This will remove all downloaded PDF files from this device to save storage. You will need to download them again for offline reading. Continue?")) return;

        try {
            setImporting(true);
            const allBooks = await db.books.toArray();
            for (const book of allBooks) {
                if (book.pdfBlob) {
                    await db.books.update(book.id!, { pdfBlob: undefined });
                }
            }
            alert("All local downloads cleared. Storage has been freed!");
            await syncLibrary();
        } catch (error: any) {
            console.error("Clear downloads failed:", error);
            alert("Failed to clear downloads: " + error.message);
        } finally {
            setImporting(false);
        }
    };


    // Mock Data for Charts
    const schoolData = [
        { name: 'School A', booksRead: 450 },
        { name: 'School B', booksRead: 320 },
        { name: 'School C', booksRead: 510 },
        { name: 'School D', booksRead: 290 },
    ];

    const districtData = [
        { name: 'District 1', activeStudent: 1200 },
        { name: 'District 2', activeStudent: 980 },
        { name: 'District 3', activeStudent: 1450 },
    ]

    // Real Student Data from Dexie
    const users = useLiveQuery(() => db.users.toArray()) || [];

    // Filter logic
    const filteredStudents = users.filter((user: User) => {
        const matchesSchool = selectedSchool ? user.school === selectedSchool : true;
        const matchesCity = selectedCity ? user.city === selectedCity : true;
        // Add other filters as needed
        return matchesSchool && matchesCity;
    });

    // ... (keep handleAddBook and other functions)

    return (
        <div className="space-y-8">
            <header className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Overview</h2>
                    <p className="text-gray-500">Welcome back, Admin</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${supabaseStatus === 'connected'
                        ? 'bg-green-50 border-green-200 text-green-700'
                        : supabaseStatus === 'checking'
                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                            : 'bg-red-50 border-red-200 text-red-700'
                        }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${supabaseStatus === 'connected' ? 'bg-green-500' : supabaseStatus === 'checking' ? 'bg-blue-500 animate-pulse' : 'bg-red-500'
                            }`} />
                        {supabaseStatus === 'connected' ? 'Cloud Sync Active' : supabaseStatus === 'checking' ? 'Connecting...' : 'Cloud Connection Failed'}
                    </div>
                </div>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon={<BookOpen className="text-blue-500" />} label="Total Books" value={books?.length || 0} />
                <StatCard icon={<GraduationCap className="text-green-500" />} label="Active Students" value={users.length} />
                <StatCard icon={<MapPin className="text-orange-500" />} label="Schools Reached" value={selectedSchool ? 1 : "All"} />
                <StatCard icon={<MapPin className="text-purple-500" />} label="Cities" value={selectedCity ? 1 : "All"} />
            </div>

            {/* Charts Section - Keep usage of mock data for charts for now as we don't have enough real data points yet */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ... charts ... */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-semibold mb-6">Books Read by School</h3>
                    <div className="h-[256px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={schoolData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" fontSize={12} />
                                <YAxis fontSize={12} />
                                <Tooltip />
                                <Bar dataKey="booksRead" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-semibold mb-6">Active Students by District</h3>
                    <div className="h-[256px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={districtData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" fontSize={12} />
                                <YAxis fontSize={12} />
                                <Tooltip />
                                <Bar dataKey="activeStudent" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Student Reporting Section */}
            <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Search className="w-5 h-5 text-gray-500" />
                        Student Reports (Real Data)
                    </h3>
                </div>
                <div className="p-6 space-y-6">
                    {/* Cascading Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Dropdown
                            label="Select State"
                            options={stateOptions}
                            value={selectedState}
                            onChange={handleStateChange}
                            className="w-full"
                        />
                        <Dropdown
                            label="Select City"
                            options={cityOptions}
                            value={selectedCity}
                            onChange={handleCityChange}
                            className="w-full"
                        />
                        <Dropdown
                            label="Select Sector"
                            options={sectorOptions}
                            value={selectedSector}
                            onChange={handleSectorChange}
                            className="w-full"
                        />
                        <Dropdown
                            label="Select School"
                            options={schoolOptions}
                            value={selectedSchool}
                            onChange={setSelectedSchool}
                            className="w-full"
                        />
                    </div>

                    {/* Student Data Table */}
                    <div className="rounded-lg border border-gray-200 overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                                <tr>
                                    <th className="p-4">Student Name</th>
                                    <th className="p-4">Age</th>
                                    <th className="p-4">School</th>
                                    <th className="p-4">City</th>
                                    <th className="p-4 text-right">Points</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredStudents.map((student: User) => (
                                    <tr key={student.id} className="hover:bg-gray-50">
                                        <td className="p-4 font-medium text-gray-900">{student.name}</td>
                                        <td className="p-4 text-gray-500">{student.age}</td>
                                        <td className="p-4 text-gray-500">{student.school}</td>
                                        <td className="p-4 text-gray-500">{student.city}</td>
                                        <td className="p-4 text-right font-bold text-green-600 px-2 py-1 rounded bg-green-50 inline-block mt-2">{student.totalPoints}</td>
                                    </tr>
                                ))}
                                {filteredStudents.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-gray-500">
                                            No students found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* Book Management */}
            <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold">Book Management</h3>
                </div>

                <div className="p-6 grid gap-8 lg:grid-cols-3">
                    {/* Add Book Form */}
                    <div className="lg:col-span-1 space-y-4">
                        <h4 className="font-medium text-sm text-gray-500 uppercase">Add New Book</h4>
                        <form onSubmit={handleAddBook} className="space-y-3">
                            <input
                                type="text"
                                placeholder="Book Title"
                                className="w-full p-2 border rounded"
                                value={newBook.title}
                                onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                                required
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <select
                                    className="p-2 border rounded"
                                    value={newBook.grade}
                                    onChange={(e) => setNewBook({ ...newBook, grade: e.target.value })}
                                >
                                    <option>Grade 9</option>
                                    <option>Grade 10</option>
                                    <option>Grade 11</option>
                                    <option>Grade 12</option>
                                </select>
                                <input
                                    type="number"
                                    placeholder="Pages"
                                    className="p-2 border rounded"
                                    value={newBook.pages || ''}
                                    onChange={(e) => setNewBook({ ...newBook, pages: Number(e.target.value) })}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <select
                                    className="p-2 border rounded"
                                    value={newBook.level}
                                    onChange={(e) => setNewBook({ ...newBook, level: e.target.value })}
                                >
                                    <option value="1">Level 1</option>
                                    <option value="2">Level 2</option>
                                    <option value="3">Level 3</option>
                                    <option value="4">Level 4</option>
                                </select>
                                <select
                                    className="p-2 border rounded"
                                    value={newBook.subject}
                                    onChange={(e) => setNewBook({ ...newBook, subject: e.target.value })}
                                >
                                    <option value="Science">Science</option>
                                    <option value="Mathematics">Mathematics</option>
                                    <option value="History">History</option>
                                </select>
                            </div>
                            <select
                                className="w-full p-2 border rounded"
                                value={newBook.language}
                                onChange={(e) => setNewBook({ ...newBook, language: e.target.value })}
                            >
                                <option value="English">English</option>
                                <option value="Hindi">Hindi</option>
                                <option value="Marathi">Marathi</option>
                                <option value="Marathi-English">Marathi-English</option>
                            </select>

                            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 flex items-center justify-center gap-2">
                                <Plus className="w-4 h-4" /> Add Book
                            </button>
                        </form>
                    </div>

                    {/* Book List */}
                    <div className="lg:col-span-2">
                        <h4 className="font-medium text-sm text-gray-500 uppercase mb-4">Existing Books</h4>
                        <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-100 text-gray-600 font-medium">
                                    <tr>
                                        <th className="p-3">Title</th>
                                        <th className="p-3">Details</th>
                                        <th className="p-3">Lang</th>
                                        <th className="p-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {books?.map((book) => (
                                        <tr key={book.id}>
                                            <td className="p-3 font-medium">{book.title}</td>
                                            <td className="p-3 text-gray-500">
                                                {book.subject} • Level {book.level} • {book.grade}
                                            </td>
                                            <td className="p-3 text-gray-500">{book.language}</td>
                                            <td className="p-3 text-right">
                                                <button
                                                    onClick={() => book.id && removeBook(book.id)}
                                                    className="text-red-500 hover:text-red-700 p-1"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {books?.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-gray-500">No books found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </section>

            {/* Google Drive Batch Import */}
            <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Cloud className="w-5 h-5 text-blue-500" />
                        Google Drive Batch Import
                    </h3>
                    <p className="text-xs text-gray-400">Import PDFs and matching cover images automatically</p>
                </div>
                <div className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Cloud className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Paste Google Drive Folder ID or Link..."
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm"
                                    value={folderId}
                                    onChange={(e) => setFolderId(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={handleScan}
                                disabled={scanning}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center gap-2 text-sm whitespace-nowrap"
                            >
                                {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                Scan Folder
                            </button>
                        </div>

                        {!process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 flex items-center gap-2">
                                <span className="font-bold">Missing API Key:</span>
                                Please add NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY to your .env.local file and restart the server.
                            </div>
                        )}
                    </div>

                    {scanning && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-600 flex items-center gap-2 animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>{scanStatus}</span>
                        </div>
                    )}

                    {scanResults.length > 0 && (
                        <div className="space-y-4">
                            <div className="max-h-60 overflow-y-auto border rounded-lg bg-gray-50">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-100 sticky top-0">
                                        <tr>
                                            <th className="p-2">File Name</th>
                                            <th className="p-2 text-right">Type</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {scanResults.map((book, idx) => (
                                            <tr key={idx}>
                                                <td className="p-2">{book.title}</td>
                                                <td className="p-2 text-right text-gray-400">
                                                    {book.subject} / L{book.level}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex flex-col gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-blue-700">
                                        Found <strong>{scanResults.length}</strong> books across hierarchies.
                                        Metadata (Level/Subject) will be extracted from folder names where possible.
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-blue-700">Store Offline?</span>
                                        <button
                                            onClick={() => setStoreLocally(!storeLocally)}
                                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${storeLocally ? 'bg-blue-600' : 'bg-gray-200'}`}
                                        >
                                            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${storeLocally ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </button>
                                    </div>
                                </div>
                                <button
                                    onClick={handleImportAll}
                                    disabled={importing}
                                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm"
                                >
                                    {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                    Import All
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Danger Zone */}
                <div className="mt-8 pt-6 border-t border-red-100 flex flex-wrap gap-4">
                    <div className="w-full">
                        <h4 className="text-xs font-bold text-red-500 uppercase tracking-wider mb-3">Danger Zone</h4>
                    </div>
                    <button
                        onClick={() => handleClearLibrary(false)}
                        disabled={importing}
                        className="text-xs flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors border border-red-100 disabled:opacity-50"
                    >
                        <Trash2 className="w-3 h-3" />
                        Clear Local Cache
                    </button>
                    <button
                        onClick={handleClearDownloads}
                        disabled={importing}
                        className="text-xs flex items-center gap-2 bg-orange-50 text-orange-600 px-4 py-2 rounded-lg hover:bg-orange-100 transition-colors border border-orange-100 disabled:opacity-50"
                    >
                        <Download className="w-3 h-3 rotate-180" />
                        Clear Local Downloads (Free Space)
                    </button>
                    <button
                        onClick={() => handleClearLibrary(true)}
                        disabled={importing}
                        className="text-xs flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
                    >
                        <Cloud className="w-3 h-3" />
                        Reset Global Library (Supabase)
                    </button>
                </div>
            </section>

        </div>
    );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
                {icon}
            </div>
            <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-800">{value}</p>
            </div>
        </div>
    )
}
