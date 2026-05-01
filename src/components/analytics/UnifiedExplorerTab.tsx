"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
    Calendar,
    Download,
    Loader2,
    Users,
    BookOpen,
    TrendingUp,
    FileSpreadsheet,
    FileText,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    FilterX,
    Map as MapIcon
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Dropdown } from "@/components/dropdown";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ReportData {
    summary: {
        totalBooksRead: number;
        uniqueStudents: number;
        newStudents: number;
        totalSessions: number;
    };
    byStudent: {
        student_id: string;
        student_name: string;
        school: string;
        grade: string;
        books_read: number;
        total_points: number;
    }[];
    bySchool: {
        school_id: string;
        school_name: string;
        taluka: string;
        district: string;
        state: string;
        books_read: number;
        students: number;
    }[];
    byTaluka: {
        taluka: string;
        district: string;
        state: string;
        books_read: number;
        students: number;
        schools: number;
    }[];
    byDistrict: {
        district: string;
        state: string;
        books_read: number;
        students: number;
        schools: number;
    }[];
    byState: {
        state: string;
        books_read: number;
        students: number;
        schools: number;
    }[];
    newStudents: {
        id: string;
        name: string;
        school: string;
        grade: string;
        mobile: string;
        created_at: string;
    }[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function today() {
    return new Date().toISOString().slice(0, 10);
}

function thirtyDaysAgo() {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
}

function fmtDate(iso: string) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function sanitizeName(name: string | null | undefined) {
    if (!name || name.trim() === "") return "Others";
    return name.trim();
}

// ─── Export helpers ───────────────────────────────────────────────────────────

function exportXLSX(data: ReportData, dateFrom: string, dateTo: string, filtersStr: string) {
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryRows = [
        ["ThinkSharp Foundation — Unified Analytics Report"],
        [`Period: ${fmtDate(dateFrom)} to ${fmtDate(dateTo)}`],
        [`Filters: ${filtersStr}`],
        [`Generated: ${fmtDate(today())}`],
        [],
        ["Metric", "Value"],
        ["Total Books Read", data.summary.totalBooksRead],
        ["Unique Students", data.summary.uniqueStudents],
        ["New Students Registered", data.summary.newStudents],
        ["Total Reading Sessions", data.summary.totalSessions],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    if (data.byState.length > 0) {
        const stateHeader = ["State", "Books Read", "Students", "Schools"];
        const stateRows = data.byState.map((r) => [r.state, r.books_read, r.students, r.schools]);
        const wsState = XLSX.utils.aoa_to_sheet([stateHeader, ...stateRows]);
        XLSX.utils.book_append_sheet(wb, wsState, "By State");
    }

    if (data.byDistrict.length > 0) {
        const districtHeader = ["District", "State", "Books Read", "Students", "Schools"];
        const districtRows = data.byDistrict.map((r) => [r.district, r.state, r.books_read, r.students, r.schools]);
        const wsDistrict = XLSX.utils.aoa_to_sheet([districtHeader, ...districtRows]);
        XLSX.utils.book_append_sheet(wb, wsDistrict, "By District");
    }

    if (data.byTaluka.length > 0) {
        const talukaHeader = ["Taluka", "District", "Books Read", "Students", "Schools"];
        const talukaRows = data.byTaluka.map((r) => [r.taluka, r.district, r.books_read, r.students, r.schools]);
        const wsTaluka = XLSX.utils.aoa_to_sheet([talukaHeader, ...talukaRows]);
        XLSX.utils.book_append_sheet(wb, wsTaluka, "By Taluka");
    }

    if (data.bySchool.length > 0) {
        const schoolHeader = ["School", "Taluka", "District", "Books Read", "Students"];
        const schoolRows = data.bySchool.map((r) => [r.school_name, r.taluka, r.district, r.books_read, r.students]);
        const wsSchool = XLSX.utils.aoa_to_sheet([schoolHeader, ...schoolRows]);
        XLSX.utils.book_append_sheet(wb, wsSchool, "By School");
    }

    if (data.byStudent.length > 0) {
        const studentHeader = ["Name", "School", "Grade", "Books Read", "Points"];
        const studentRows = data.byStudent.map((r) => [r.student_name, r.school, r.grade, r.books_read, r.total_points]);
        const wsStudent = XLSX.utils.aoa_to_sheet([studentHeader, ...studentRows]);
        XLSX.utils.book_append_sheet(wb, wsStudent, "By Student");
    }

    if (data.newStudents.length > 0) {
        const newHeader = ["Name", "School", "Grade", "Mobile", "Registered On"];
        const newRows = data.newStudents.map((r) => [r.name, r.school, r.grade, r.mobile, r.created_at ? fmtDate(r.created_at) : "—"]);
        const wsNew = XLSX.utils.aoa_to_sheet([newHeader, ...newRows]);
        XLSX.utils.book_append_sheet(wb, wsNew, "New Students");
    }

    XLSX.writeFile(wb, `thinksharp_report_${dateFrom}_to_${dateTo}.xlsx`);
}

function exportPDF(data: ReportData, dateFrom: string, dateTo: string, filtersStr: string) {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(24, 24, 27);
    doc.rect(0, 0, pageW, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("ThinkSharp Foundation", 14, 12);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(180, 180, 180);
    doc.text("Unified Analytics Report", 14, 19);
    doc.text(`Period: ${fmtDate(dateFrom)} — ${fmtDate(dateTo)}`, 14, 24);
    doc.text(`Generated: ${fmtDate(today())}`, pageW - 14, 24, { align: "right" });

    let y = 36;
    
    // Filters applied
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.text(`Filters: ${filtersStr}`, 14, y);
    y += 8;

    // Summary cards
    doc.setTextColor(24, 24, 27);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Summary", 14, y);
    y += 5;

    const cards = [
        { label: "Total Books Read", value: String(data.summary.totalBooksRead) },
        { label: "Active Students", value: String(data.summary.uniqueStudents) },
        { label: "New Students", value: String(data.summary.newStudents) },
        { label: "Total Sessions", value: String(data.summary.totalSessions) },
    ];
    const cardW = (pageW - 28 - 9) / 4;
    cards.forEach((card, i) => {
        const x = 14 + i * (cardW + 3);
        doc.setDrawColor(220, 220, 220);
        doc.setFillColor(250, 250, 250);
        doc.roundedRect(x, y, cardW, 16, 2, 2, "FD");
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(24, 24, 27);
        doc.text(card.value, x + cardW / 2, y + 8, { align: "center" });
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(120, 120, 120);
        doc.text(card.label, x + cardW / 2, y + 13, { align: "center" });
    });
    y += 24;

    const maybeAddPage = (requiredHeight: number) => {
        if (y + requiredHeight > 280) {
            doc.addPage();
            y = 16;
        }
    };

    if (data.byState.length > 0) {
        maybeAddPage(40);
        doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(24, 24, 27);
        doc.text("Books Read by State", 14, y); y += 4;
        autoTable(doc, {
            startY: y, head: [["State", "Books Read", "Students", "Schools"]],
            body: data.byState.map((r) => [r.state, r.books_read, r.students, r.schools]),
            styles: { fontSize: 8, cellPadding: 3 }, headStyles: { fillColor: [24, 24, 27], textColor: 255 }, alternateRowStyles: { fillColor: [248, 248, 248] }, margin: { left: 14, right: 14 }
        });
        y = (doc as any).lastAutoTable.finalY + 8;
    }

    if (data.byDistrict.length > 0) {
        maybeAddPage(40);
        doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(24, 24, 27);
        doc.text("Books Read by District", 14, y); y += 4;
        autoTable(doc, {
            startY: y, head: [["District", "State", "Books Read", "Students", "Schools"]],
            body: data.byDistrict.map((r) => [r.district, r.state, r.books_read, r.students, r.schools]),
            styles: { fontSize: 8, cellPadding: 3 }, headStyles: { fillColor: [24, 24, 27], textColor: 255 }, alternateRowStyles: { fillColor: [248, 248, 248] }, margin: { left: 14, right: 14 }
        });
        y = (doc as any).lastAutoTable.finalY + 8;
    }

    if (data.byTaluka.length > 0) {
        maybeAddPage(40);
        doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(24, 24, 27);
        doc.text("Books Read by Taluka", 14, y); y += 4;
        autoTable(doc, {
            startY: y, head: [["Taluka", "District", "Books Read", "Students", "Schools"]],
            body: data.byTaluka.map((r) => [r.taluka, r.district, r.books_read, r.students, r.schools]),
            styles: { fontSize: 8, cellPadding: 3 }, headStyles: { fillColor: [24, 24, 27], textColor: 255 }, alternateRowStyles: { fillColor: [248, 248, 248] }, margin: { left: 14, right: 14 }
        });
        y = (doc as any).lastAutoTable.finalY + 8;
    }

    if (data.bySchool.length > 0) {
        maybeAddPage(40);
        doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(24, 24, 27);
        doc.text("Books Read by School", 14, y); y += 4;
        autoTable(doc, {
            startY: y, head: [["School", "Taluka", "Books Read", "Students"]],
            body: data.bySchool.map((r) => [r.school_name, r.taluka, r.books_read, r.students]),
            styles: { fontSize: 8, cellPadding: 3 }, headStyles: { fillColor: [24, 24, 27], textColor: 255 }, alternateRowStyles: { fillColor: [248, 248, 248] }, margin: { left: 14, right: 14 }
        });
        y = (doc as any).lastAutoTable.finalY + 8;
    }

    if (data.byStudent.length > 0) {
        maybeAddPage(40);
        doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(24, 24, 27);
        doc.text("Individual Student Activity", 14, y); y += 4;
        autoTable(doc, {
            startY: y, head: [["Name", "School", "Grade", "Books Read", "Points"]],
            body: data.byStudent.map((r) => [r.student_name, r.school, r.grade, r.books_read, r.total_points]),
            styles: { fontSize: 8, cellPadding: 3 }, headStyles: { fillColor: [24, 24, 27], textColor: 255 }, alternateRowStyles: { fillColor: [248, 248, 248] }, margin: { left: 14, right: 14 }
        });
        y = (doc as any).lastAutoTable.finalY + 8;
    }

    if (data.newStudents.length > 0) {
        maybeAddPage(40);
        doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(24, 24, 27);
        doc.text(`Newly Registered Students (${data.newStudents.length})`, 14, y); y += 4;
        autoTable(doc, {
            startY: y, head: [["Name", "School", "Grade", "Mobile", "Registered On"]],
            body: data.newStudents.map((r) => [r.name, r.school, r.grade, r.mobile, r.created_at ? fmtDate(r.created_at) : "—"]),
            styles: { fontSize: 8, cellPadding: 3 }, headStyles: { fillColor: [24, 24, 27], textColor: 255 }, alternateRowStyles: { fillColor: [248, 248, 248] }, margin: { left: 14, right: 14 }
        });
    }

    doc.save(`thinksharp_report_${dateFrom}_to_${dateTo}.pdf`);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: number | string; sub?: string; }) {
    return (
        <div className="bg-white rounded-lg border border-zinc-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-zinc-400 font-medium uppercase tracking-wide">{label}</span>
                <div className="w-7 h-7 rounded-md bg-zinc-50 flex items-center justify-center">
                    <Icon className="w-3.5 h-3.5 text-zinc-500" />
                </div>
            </div>
            <p className="text-2xl font-bold text-zinc-900 tabular-nums">{value}</p>
            {sub && <p className="text-xs text-zinc-400 mt-1">{sub}</p>}
        </div>
    );
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode; }) {
    const [open, setOpen] = useState(true);
    return (
        <div className="bg-white rounded-lg border border-zinc-100 overflow-hidden shadow-sm">
            <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-zinc-50 transition-colors">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-900">{title}</span>
                    {count !== undefined && (
                        <span className="text-xs bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full font-medium">
                            {count}
                        </span>
                    )}
                </div>
                {open ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
            </button>
            {open && <div className="border-t border-zinc-100">{children}</div>}
        </div>
    );
}

function DataTable({ columns, rows }: { columns: string[]; rows: (string | number)[][]; }) {
    const [showAll, setShowAll] = useState(false);
    const visible = showAll ? rows : rows.slice(0, 10);

    if (rows.length === 0) return <div className="px-5 py-8 text-center text-xs text-zinc-400">No data available.</div>;

    return (
        <div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-zinc-50">
                            {columns.map((col) => (
                                <th key={col} className="px-4 py-2.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wide whitespace-nowrap">{col}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {visible.map((row, i) => (
                            <tr key={i} className="border-t border-zinc-50 hover:bg-zinc-50 transition-colors">
                                {row.map((cell, j) => (
                                    <td key={j} className="px-4 py-2.5 text-xs text-zinc-700">{cell ?? "—"}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {rows.length > 10 && (
                <div className="px-4 py-2.5 border-t border-zinc-50 text-center">
                    <button onClick={() => setShowAll((v) => !v)} className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">
                        {showAll ? "Show less" : `Show all ${rows.length} rows`}
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function UnifiedExplorerTab() {
    const [dateFrom, setDateFrom] = useState(thirtyDaysAgo());
    const [dateTo, setDateTo] = useState(today());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Raw datasets
    const [rawSessions, setRawSessions] = useState<any[]>([]);
    const [rawSchools, setRawSchools] = useState<any[]>([]);
    const [rawNewUsers, setRawNewUsers] = useState<any[]>([]);
    const [dataFetched, setDataFetched] = useState(false);

    // Drill-down state
    const [selectedState, setSelectedState] = useState<string>("");
    const [selectedDistrict, setSelectedDistrict] = useState<string>("");
    const [selectedTaluka, setSelectedTaluka] = useState<string>("");
    const [selectedSchool, setSelectedSchool] = useState<string>("");

    const fetchData = useCallback(async () => {
        if (!dateFrom || !dateTo) return;
        setLoading(true);
        setError(null);
        setDataFetched(false);

        try {
            if (!supabase) throw new Error("Supabase not configured");
            const fromISO = `${dateFrom}T00:00:00`;
            const toISO = `${dateTo}T23:59:59`;

            const { data: sessions, error: sessErr } = await supabase
                .from("reading_sessions")
                .select("user_id, book_id, completed, points_earned, users(name, school, school_id, grade, totalPoints)")
                .gte("start_time", fromISO)
                .lte("start_time", toISO);

            if (sessErr) throw sessErr;

            const { data: schoolsData, error: schErr } = await supabase
                .from("schools")
                .select("id, school_name, district, taluka, state");
            if (schErr) throw schErr;

            const { data: newUsersData } = await supabase
                .from("users")
                .select("id, name, school, school_id, grade, mobile, created_at")
                .eq("role", "student")
                .gte("created_at", fromISO)
                .lte("created_at", toISO)
                .order("created_at", { ascending: false });

            setRawSessions(sessions || []);
            setRawSchools(schoolsData || []);
            setRawNewUsers(newUsersData || []);
            setDataFetched(true);

            // Reset filters on new fetch
            setSelectedState("");
            setSelectedDistrict("");
            setSelectedTaluka("");
            setSelectedSchool("");

        } catch (e: any) {
            setError(e.message || "Failed to load data");
        } finally {
            setLoading(false);
        }
    }, [dateFrom, dateTo]);

    // Initial load
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const resetFilters = () => {
        setSelectedState("");
        setSelectedDistrict("");
        setSelectedTaluka("");
        setSelectedSchool("");
    };

    // Derived filtered data
    const { report, filtersStr, options } = useMemo(() => {
        if (!dataFetched) return { report: null, filtersStr: "None", options: { states: [], districts: [], talukas: [], schools: [] } };

        const schoolMap = new Map<string, any>();
        rawSchools.forEach(s => schoolMap.set(s.id, s));

        // Options calculation (available regardless of selection to allow full list if wanted, but bounded by parents)
        const availableStates = new Set<string>();
        const availableDistricts = new Set<string>();
        const availableTalukas = new Set<string>();
        const availableSchools = new Set<{id: string, name: string}>();

        rawSchools.forEach(s => {
            const st = sanitizeName(s.state);
            const dist = sanitizeName(s.district);
            const tal = sanitizeName(s.taluka);
            
            availableStates.add(st);
            if (!selectedState || st === selectedState) {
                availableDistricts.add(dist);
                if (!selectedDistrict || dist === selectedDistrict) {
                    availableTalukas.add(tal);
                    if (!selectedTaluka || tal === selectedTaluka) {
                        availableSchools.add({ id: s.id, name: sanitizeName(s.school_name) });
                    }
                }
            }
        });

        const filterLabels = [];
        if (selectedState) filterLabels.push(`State: ${selectedState}`);
        if (selectedDistrict) filterLabels.push(`District: ${selectedDistrict}`);
        if (selectedTaluka) filterLabels.push(`Taluka: ${selectedTaluka}`);
        if (selectedSchool) filterLabels.push(`School: ${availableSchools.has(selectedSchool as any) ? selectedSchool : "Selected"}`); // Note: school is ID

        // Step 1: Filter raw sessions down to match the drill-down
        const filteredSessions = rawSessions.filter(s => {
            const u = s.users;
            if (!u) return false;
            
            // If they have no school mapping, they are "Others" at all levels
            const info = schoolMap.get(u.school_id) || {};
            const st = sanitizeName(info.state);
            const dist = sanitizeName(info.district);
            const tal = sanitizeName(info.taluka);
            const schId = u.school_id;

            if (selectedState && st !== selectedState) return false;
            if (selectedDistrict && dist !== selectedDistrict) return false;
            if (selectedTaluka && tal !== selectedTaluka) return false;
            if (selectedSchool && schId !== selectedSchool) return false;

            return true;
        });

        // Step 2: Aggregate the filtered sessions
        const studentMap = new Map<string, any>();
        const schoolAgg = new Map<string, any>();
        const talukaAgg = new Map<string, any>();
        const districtAgg = new Map<string, any>();
        const stateAgg = new Map<string, any>();

        for (const s of filteredSessions) {
            const u = s.users;
            const info = schoolMap.get(u.school_id) || {};
            
            const st = sanitizeName(info.state);
            const dist = sanitizeName(info.district);
            const tal = sanitizeName(info.taluka);
            const schId = u.school_id || 'unknown';
            const schName = sanitizeName(info.school_name || u.school);

            // Student level
            if (!studentMap.has(s.user_id)) {
                studentMap.set(s.user_id, {
                    student_id: s.user_id,
                    student_name: sanitizeName(u.name),
                    school: schName,
                    grade: u.grade || "—",
                    books_read: 0,
                    total_points: u.totalPoints || 0,
                });
            }
            if (s.completed) studentMap.get(s.user_id)!.books_read += 1;

            // School level
            if (!schoolAgg.has(schId)) {
                schoolAgg.set(schId, { school_id: schId, school_name: schName, taluka: tal, district: dist, state: st, books_read: 0, students: new Set() });
            }
            schoolAgg.get(schId)!.students.add(s.user_id);
            if (s.completed) schoolAgg.get(schId)!.books_read += 1;

            // Taluka level
            const talKey = `${st}-${dist}-${tal}`;
            if (!talukaAgg.has(talKey)) {
                talukaAgg.set(talKey, { taluka: tal, district: dist, state: st, books_read: 0, students: new Set(), schools: new Set() });
            }
            talukaAgg.get(talKey)!.students.add(s.user_id);
            talukaAgg.get(talKey)!.schools.add(schId);
            if (s.completed) talukaAgg.get(talKey)!.books_read += 1;

            // District level
            const distKey = `${st}-${dist}`;
            if (!districtAgg.has(distKey)) {
                districtAgg.set(distKey, { district: dist, state: st, books_read: 0, students: new Set(), schools: new Set() });
            }
            districtAgg.get(distKey)!.students.add(s.user_id);
            districtAgg.get(distKey)!.schools.add(schId);
            if (s.completed) districtAgg.get(distKey)!.books_read += 1;

            // State level
            if (!stateAgg.has(st)) {
                stateAgg.set(st, { state: st, books_read: 0, students: new Set(), schools: new Set() });
            }
            stateAgg.get(st)!.students.add(s.user_id);
            stateAgg.get(st)!.schools.add(schId);
            if (s.completed) stateAgg.get(st)!.books_read += 1;
        }

        const byStudent = Array.from(studentMap.values()).sort((a, b) => b.books_read - a.books_read);
        const bySchool = Array.from(schoolAgg.values()).map(r => ({...r, students: r.students.size})).sort((a, b) => b.books_read - a.books_read);
        const byTaluka = Array.from(talukaAgg.values()).map(r => ({...r, students: r.students.size, schools: r.schools.size})).sort((a, b) => b.books_read - a.books_read);
        const byDistrict = Array.from(districtAgg.values()).map(r => ({...r, students: r.students.size, schools: r.schools.size})).sort((a, b) => b.books_read - a.books_read);
        const byState = Array.from(stateAgg.values()).map(r => ({...r, students: r.students.size, schools: r.schools.size})).sort((a, b) => b.books_read - a.books_read);

        const totalBooksRead = byStudent.reduce((sum, s) => sum + s.books_read, 0);

        // Filter new users identically
        const filteredNewUsers = rawNewUsers.filter(u => {
            const info = schoolMap.get(u.school_id) || {};
            const st = sanitizeName(info.state);
            const dist = sanitizeName(info.district);
            const tal = sanitizeName(info.taluka);
            const schId = u.school_id;

            if (selectedState && st !== selectedState) return false;
            if (selectedDistrict && dist !== selectedDistrict) return false;
            if (selectedTaluka && tal !== selectedTaluka) return false;
            if (selectedSchool && schId !== selectedSchool) return false;
            return true;
        }).map(u => ({
            id: u.id,
            name: sanitizeName(u.name),
            school: sanitizeName(schoolMap.get(u.school_id)?.school_name || u.school),
            grade: u.grade || "—",
            mobile: u.mobile || "—",
            created_at: u.created_at
        }));

        const rep: ReportData = {
            summary: {
                totalBooksRead,
                uniqueStudents: studentMap.size,
                newStudents: filteredNewUsers.length,
                totalSessions: filteredSessions.length
            },
            byState,
            byDistrict,
            byTaluka,
            bySchool,
            byStudent,
            newStudents: filteredNewUsers
        };

        const dropdownOpts = {
            states: Array.from(availableStates).sort().map(s => ({ value: s, label: s })),
            districts: Array.from(availableDistricts).sort().map(d => ({ value: d, label: d })),
            talukas: Array.from(availableTalukas).sort().map(t => ({ value: t, label: t })),
            schools: Array.from(availableSchools).sort((a,b) => a.name.localeCompare(b.name)).map(s => ({ value: s.id, label: s.name })),
        };

        return { report: rep, filtersStr: filterLabels.length ? filterLabels.join(", ") : "All Regions", options: dropdownOpts };
    }, [dataFetched, rawSessions, rawSchools, rawNewUsers, selectedState, selectedDistrict, selectedTaluka, selectedSchool]);

    return (
        <div className="space-y-5">
            {/* Control Panel */}
            <div className="bg-white rounded-lg border border-zinc-100 p-5 shadow-sm space-y-4">
                
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-zinc-800 flex items-center gap-2"><MapIcon className="w-5 h-5 text-zinc-500" /> Geographic Explorer</h2>
                    
                    {/* Export buttons */}
                    {report && (
                        <div className="flex items-center gap-2">
                            <button onClick={() => exportXLSX(report, dateFrom, dateTo, filtersStr)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors">
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                                Export Excel
                            </button>
                            <button onClick={() => exportPDF(report, dateFrom, dateTo, filtersStr)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-md hover:bg-rose-100 transition-colors">
                                <FileText className="w-3.5 h-3.5" />
                                Export PDF
                            </button>
                        </div>
                    )}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-end gap-3 bg-zinc-50 p-4 rounded-lg border border-zinc-100">
                    <div className="flex items-center gap-3">
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Date Range</label>
                            <div className="flex items-center gap-1">
                                <input type="date" value={dateFrom} max={dateTo} onChange={(e) => setDateFrom(e.target.value)} className="px-2 py-1.5 text-xs border border-zinc-200 rounded text-zinc-800 focus:outline-none focus:border-zinc-400" />
                                <span className="text-zinc-400 text-xs">to</span>
                                <input type="date" value={dateTo} min={dateFrom} onChange={(e) => setDateTo(e.target.value)} className="px-2 py-1.5 text-xs border border-zinc-200 rounded text-zinc-800 focus:outline-none focus:border-zinc-400" />
                                <button onClick={fetchData} disabled={loading} className="ml-2 p-1.5 bg-zinc-900 text-white rounded hover:bg-zinc-700 disabled:opacity-50">
                                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="w-px h-8 bg-zinc-200 mx-2 self-center hidden lg:block" />

                    <Dropdown label="Select State" options={options.states} value={selectedState} onChange={(val) => { setSelectedState(val); setSelectedDistrict(""); setSelectedTaluka(""); setSelectedSchool(""); }} variant="light" className="w-full sm:w-[140px]" />
                    <Dropdown label="Select District" options={options.districts} value={selectedDistrict} onChange={(val) => { setSelectedDistrict(val); setSelectedTaluka(""); setSelectedSchool(""); }} variant="light" className="w-full sm:w-[140px]" />
                    <Dropdown label="Select Taluka" options={options.talukas} value={selectedTaluka} onChange={(val) => { setSelectedTaluka(val); setSelectedSchool(""); }} variant="light" className="w-full sm:w-[140px]" />
                    <Dropdown label="Select School" options={options.schools} value={selectedSchool} onChange={setSelectedSchool} variant="light" className="w-full sm:w-[180px]" />

                    {(selectedState || selectedDistrict || selectedTaluka || selectedSchool) && (
                        <button onClick={resetFilters} className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-600 font-bold uppercase tracking-wide px-2 py-1.5 ml-auto">
                            <FilterX className="w-3.5 h-3.5" /> Clear
                        </button>
                    )}
                </div>

                {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-md">{error}</p>}
            </div>

            {loading && (
                <div className="bg-white rounded-lg border border-zinc-100 py-16 flex items-center justify-center gap-3">
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                    <span className="text-sm text-zinc-400">Crunching data…</span>
                </div>
            )}

            {/* Display Report */}
            {report && !loading && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex flex-wrap items-center justify-between text-xs font-medium px-1">
                        <span className="text-zinc-500">
                            Showing data for: <span className="text-zinc-900 font-bold bg-zinc-100 px-2 py-0.5 rounded">{filtersStr}</span>
                        </span>
                        <span className="text-zinc-400 mt-2 sm:mt-0">
                            {fmtDate(dateFrom)} to {fmtDate(dateTo)}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <SummaryCard icon={BookOpen} label="Books Read" value={report.summary.totalBooksRead} sub="completed sessions" />
                        <SummaryCard icon={Users} label="Active Students" value={report.summary.uniqueStudents} sub="with reading activity" />
                        <SummaryCard icon={TrendingUp} label="Total Sessions" value={report.summary.totalSessions} sub="all reading events" />
                        <SummaryCard icon={Users} label="New Registrations" value={report.summary.newStudents} sub="students joined" />
                    </div>

                    {/* Drill-down Tables - Only show the relevant granularity based on selection */}
                    {!selectedState && report.byState.length > 0 && (
                        <Section title="By State" count={report.byState.length}>
                            <DataTable columns={["State", "Books Read", "Students", "Schools"]} rows={report.byState.map(r => [r.state, r.books_read, r.students, r.schools])} />
                        </Section>
                    )}

                    {(selectedState && !selectedDistrict) && report.byDistrict.length > 0 && (
                        <Section title={`Districts in ${selectedState}`} count={report.byDistrict.length}>
                            <DataTable columns={["District", "State", "Books Read", "Students", "Schools"]} rows={report.byDistrict.map(r => [r.district, r.state, r.books_read, r.students, r.schools])} />
                        </Section>
                    )}

                    {(selectedDistrict && !selectedTaluka) && report.byTaluka.length > 0 && (
                        <Section title={`Talukas in ${selectedDistrict}`} count={report.byTaluka.length}>
                            <DataTable columns={["Taluka", "District", "Books Read", "Students", "Schools"]} rows={report.byTaluka.map(r => [r.taluka, r.district, r.books_read, r.students, r.schools])} />
                        </Section>
                    )}

                    {(selectedTaluka && !selectedSchool) && report.bySchool.length > 0 && (
                        <Section title={`Schools in ${selectedTaluka}`} count={report.bySchool.length}>
                            <DataTable columns={["School", "Taluka", "Books Read", "Students"]} rows={report.bySchool.map(r => [r.school_name, r.taluka, r.books_read, r.students])} />
                        </Section>
                    )}

                    {selectedSchool && report.byStudent.length > 0 && (
                        <Section title="Individual Students" count={report.byStudent.length}>
                            <DataTable columns={["Name", "Grade", "Books Read", "Total Points"]} rows={report.byStudent.map(r => [r.student_name, r.grade, r.books_read, r.total_points])} />
                        </Section>
                    )}

                    {/* Optionally, show all raw data collapsed if they want everything */}
                    {report.newStudents.length > 0 && (
                        <Section title="Newly Registered Students" count={report.newStudents.length}>
                            <DataTable columns={["Name", "School", "Grade", "Mobile", "Registered On"]} rows={report.newStudents.map(r => [r.name, r.school, r.grade, r.mobile, r.created_at ? fmtDate(r.created_at) : "—"])} />
                        </Section>
                    )}
                </div>
            )}
        </div>
    );
}
