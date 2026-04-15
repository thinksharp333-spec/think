"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
    Calendar,
    Download,
    Loader2,
    Users,
    BookOpen,
    MapPin,
    School,
    TrendingUp,
    FileSpreadsheet,
    FileText,
    ChevronDown,
    ChevronUp,
    RefreshCw,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

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
        district: string;
        taluka: string;
        books_read: number;
        students: number;
    }[];
    byTaluka: {
        taluka: string;
        district: string;
        books_read: number;
        students: number;
        schools: number;
    }[];
    byDistrict: {
        district: string;
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
    return new Date(iso).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

// ─── Export helpers ───────────────────────────────────────────────────────────

function exportXLSX(data: ReportData, dateFrom: string, dateTo: string) {
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryRows = [
        ["ThinkSharp Foundation — Analytics Report"],
        [`Period: ${fmtDate(dateFrom)} to ${fmtDate(dateTo)}`],
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

    // By District
    const districtHeader = ["District", "Books Read", "Students", "Schools"];
    const districtRows = data.byDistrict.map((r) => [
        r.district || "—",
        r.books_read,
        r.students,
        r.schools,
    ]);
    const wsDistrict = XLSX.utils.aoa_to_sheet([districtHeader, ...districtRows]);
    XLSX.utils.book_append_sheet(wb, wsDistrict, "By District");

    // By Taluka
    const talukaHeader = ["Taluka", "District", "Books Read", "Students", "Schools"];
    const talukaRows = data.byTaluka.map((r) => [
        r.taluka || "—",
        r.district || "—",
        r.books_read,
        r.students,
        r.schools,
    ]);
    const wsTaluka = XLSX.utils.aoa_to_sheet([talukaHeader, ...talukaRows]);
    XLSX.utils.book_append_sheet(wb, wsTaluka, "By Taluka");

    // By School
    const schoolHeader = ["School", "District", "Taluka", "Books Read", "Students"];
    const schoolRows = data.bySchool.map((r) => [
        r.school_name || "—",
        r.district || "—",
        r.taluka || "—",
        r.books_read,
        r.students,
    ]);
    const wsSchool = XLSX.utils.aoa_to_sheet([schoolHeader, ...schoolRows]);
    XLSX.utils.book_append_sheet(wb, wsSchool, "By School");

    // By Student
    const studentHeader = ["Name", "School", "Grade", "Books Read", "Points"];
    const studentRows = data.byStudent.map((r) => [
        r.student_name || "—",
        r.school || "—",
        r.grade || "—",
        r.books_read,
        r.total_points,
    ]);
    const wsStudent = XLSX.utils.aoa_to_sheet([studentHeader, ...studentRows]);
    XLSX.utils.book_append_sheet(wb, wsStudent, "By Student");

    // New Students
    const newHeader = ["Name", "School", "Grade", "Mobile", "Registered On"];
    const newRows = data.newStudents.map((r) => [
        r.name || "—",
        r.school || "—",
        r.grade || "—",
        r.mobile || "—",
        r.created_at ? fmtDate(r.created_at) : "—",
    ]);
    const wsNew = XLSX.utils.aoa_to_sheet([newHeader, ...newRows]);
    XLSX.utils.book_append_sheet(wb, wsNew, "New Students");

    XLSX.writeFile(wb, `thinksharp_report_${dateFrom}_to_${dateTo}.xlsx`);
}

function exportPDF(data: ReportData, dateFrom: string, dateTo: string) {
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
    doc.text("Analytics Report", 14, 19);
    doc.text(`Period: ${fmtDate(dateFrom)} — ${fmtDate(dateTo)}`, 14, 24);
    doc.text(`Generated: ${fmtDate(today())}`, pageW - 14, 24, { align: "right" });

    let y = 36;

    // Summary cards
    doc.setTextColor(24, 24, 27);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Summary", 14, y);
    y += 5;

    const cards = [
        { label: "Total Books Read", value: String(data.summary.totalBooksRead) },
        { label: "Unique Students", value: String(data.summary.uniqueStudents) },
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

    // By District table
    if (data.byDistrict.length > 0) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(24, 24, 27);
        doc.text("Books Read by District", 14, y);
        y += 4;
        autoTable(doc, {
            startY: y,
            head: [["District", "Books Read", "Students", "Schools"]],
            body: data.byDistrict.map((r) => [r.district || "—", r.books_read, r.students, r.schools]),
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: [24, 24, 27], textColor: 255, fontStyle: "bold" },
            alternateRowStyles: { fillColor: [248, 248, 248] },
            margin: { left: 14, right: 14 },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
    }

    // By Taluka table
    if (data.byTaluka.length > 0) {
        if (y > 230) { doc.addPage(); y = 16; }
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(24, 24, 27);
        doc.text("Books Read by Taluka", 14, y);
        y += 4;
        autoTable(doc, {
            startY: y,
            head: [["Taluka", "District", "Books Read", "Students", "Schools"]],
            body: data.byTaluka.map((r) => [r.taluka || "—", r.district || "—", r.books_read, r.students, r.schools]),
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: [24, 24, 27], textColor: 255, fontStyle: "bold" },
            alternateRowStyles: { fillColor: [248, 248, 248] },
            margin: { left: 14, right: 14 },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
    }

    // By School table
    if (data.bySchool.length > 0) {
        doc.addPage();
        y = 16;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(24, 24, 27);
        doc.text("Books Read by School", 14, y);
        y += 4;
        autoTable(doc, {
            startY: y,
            head: [["School", "District", "Taluka", "Books Read", "Students"]],
            body: data.bySchool.map((r) => [r.school_name || "—", r.district || "—", r.taluka || "—", r.books_read, r.students]),
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: [24, 24, 27], textColor: 255, fontStyle: "bold" },
            alternateRowStyles: { fillColor: [248, 248, 248] },
            margin: { left: 14, right: 14 },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
    }

    // By Student table
    if (data.byStudent.length > 0) {
        doc.addPage();
        y = 16;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(24, 24, 27);
        doc.text("Individual Student Activity", 14, y);
        y += 4;
        autoTable(doc, {
            startY: y,
            head: [["Name", "School", "Grade", "Books Read", "Points"]],
            body: data.byStudent.map((r) => [r.student_name || "—", r.school || "—", r.grade || "—", r.books_read, r.total_points]),
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: [24, 24, 27], textColor: 255, fontStyle: "bold" },
            alternateRowStyles: { fillColor: [248, 248, 248] },
            margin: { left: 14, right: 14 },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
    }

    // New Students table
    if (data.newStudents.length > 0) {
        doc.addPage();
        y = 16;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(24, 24, 27);
        doc.text(`Newly Registered Students (${data.newStudents.length})`, 14, y);
        y += 4;
        autoTable(doc, {
            startY: y,
            head: [["Name", "School", "Grade", "Mobile", "Registered On"]],
            body: data.newStudents.map((r) => [
                r.name || "—",
                r.school || "—",
                r.grade || "—",
                r.mobile || "—",
                r.created_at ? fmtDate(r.created_at) : "—",
            ]),
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: [24, 24, 27], textColor: 255, fontStyle: "bold" },
            alternateRowStyles: { fillColor: [248, 248, 248] },
            margin: { left: 14, right: 14 },
        });
    }

    doc.save(`thinksharp_report_${dateFrom}_to_${dateTo}.pdf`);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({
    icon: Icon,
    label,
    value,
    sub,
}: {
    icon: React.ElementType;
    label: string;
    value: number | string;
    sub?: string;
}) {
    return (
        <div className="bg-white rounded-lg border border-zinc-100 p-4">
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

function Section({
    title,
    count,
    children,
}: {
    title: string;
    count?: number;
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(true);
    return (
        <div className="bg-white rounded-lg border border-zinc-100 overflow-hidden">
            <button
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-zinc-50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-900">{title}</span>
                    {count !== undefined && (
                        <span className="text-xs bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full font-medium">
                            {count}
                        </span>
                    )}
                </div>
                {open ? (
                    <ChevronUp className="w-4 h-4 text-zinc-400" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                )}
            </button>
            {open && <div className="border-t border-zinc-100">{children}</div>}
        </div>
    );
}

function DataTable({
    columns,
    rows,
}: {
    columns: string[];
    rows: (string | number)[][];
}) {
    const [showAll, setShowAll] = useState(false);
    const visible = showAll ? rows : rows.slice(0, 10);

    if (rows.length === 0) {
        return (
            <div className="px-5 py-8 text-center text-xs text-zinc-400">
                No data for this period.
            </div>
        );
    }

    return (
        <div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-zinc-50">
                            {columns.map((col) => (
                                <th
                                    key={col}
                                    className="px-4 py-2.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wide whitespace-nowrap"
                                >
                                    {col}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {visible.map((row, i) => (
                            <tr key={i} className="border-t border-zinc-50 hover:bg-zinc-50 transition-colors">
                                {row.map((cell, j) => (
                                    <td key={j} className="px-4 py-2.5 text-xs text-zinc-700">
                                        {cell ?? "—"}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {rows.length > 10 && (
                <div className="px-4 py-2.5 border-t border-zinc-50 text-center">
                    <button
                        onClick={() => setShowAll((v) => !v)}
                        className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
                    >
                        {showAll ? "Show less" : `Show all ${rows.length} rows`}
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ReportsTab() {
    const [dateFrom, setDateFrom] = useState(thirtyDaysAgo());
    const [dateTo, setDateTo] = useState(today());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [report, setReport] = useState<ReportData | null>(null);

    const generate = useCallback(async () => {
        if (!dateFrom || !dateTo) return;
        setLoading(true);
        setError(null);
        setReport(null);

        try {
            if (!supabase) throw new Error("Supabase not configured");
            const fromISO = `${dateFrom}T00:00:00`;
            const toISO = `${dateTo}T23:59:59`;

            // 1. Reading sessions in range (with user + school info)
            const { data: sessions, error: sessErr } = await supabase
                .from("reading_sessions")
                .select("user_id, book_id, completed, points_earned, users(name, school, school_id, grade, totalPoints)")
                .gte("start_time", fromISO)
                .lte("start_time", toISO);

            if (sessErr) throw sessErr;

            // 2. Schools lookup
            const { data: schools } = await supabase
                .from("schools")
                .select("id, school_name, district, taluka");

            const schoolMap = new Map<string, { school_name: string; district: string; taluka: string }>(
                (schools || []).map((s) => [s.id, s])
            );

            // 3. Newly registered students in range
            const { data: newUsersData } = await supabase
                .from("users")
                .select("id, name, school, school_id, grade, mobile, created_at")
                .eq("role", "student")
                .gte("created_at", fromISO)
                .lte("created_at", toISO)
                .order("created_at", { ascending: false });

            const rawSessions = sessions || [];

            // ── Aggregate by student ──
            const studentMap = new Map<string, {
                student_id: string;
                student_name: string;
                school: string;
                grade: string;
                books_read: number;
                total_points: number;
            }>();

            for (const s of rawSessions) {
                const u = (s as any).users;
                if (!u) continue;
                if (!studentMap.has(s.user_id)) {
                    studentMap.set(s.user_id, {
                        student_id: s.user_id,
                        student_name: u.name,
                        school: u.school || "—",
                        grade: u.grade || "—",
                        books_read: 0,
                        total_points: u.totalPoints || 0,
                    });
                }
                if (s.completed) {
                    studentMap.get(s.user_id)!.books_read += 1;
                }
            }

            const byStudent = Array.from(studentMap.values()).sort((a, b) => b.books_read - a.books_read);

            // ── Aggregate by school ──
            const schoolAgg = new Map<string, { school_id: string; school_name: string; district: string; taluka: string; books_read: number; students: Set<string> }>();
            for (const s of rawSessions) {
                const u = (s as any).users;
                if (!u?.school_id) continue;
                const sid = u.school_id;
                const info = schoolMap.get(sid);
                if (!schoolAgg.has(sid)) {
                    schoolAgg.set(sid, {
                        school_id: sid,
                        school_name: info?.school_name || u.school || "—",
                        district: info?.district || "—",
                        taluka: info?.taluka || "—",
                        books_read: 0,
                        students: new Set(),
                    });
                }
                schoolAgg.get(sid)!.students.add(s.user_id);
                if (s.completed) schoolAgg.get(sid)!.books_read += 1;
            }

            const bySchool = Array.from(schoolAgg.values())
                .map(({ students, ...rest }) => ({ ...rest, students: students.size }))
                .sort((a, b) => b.books_read - a.books_read);

            // ── Aggregate by taluka ──
            const talukaAgg = new Map<string, { taluka: string; district: string; books_read: number; students: Set<string>; schools: Set<string> }>();
            for (const sch of bySchool) {
                const key = sch.taluka || "Unknown";
                if (!talukaAgg.has(key)) {
                    talukaAgg.set(key, { taluka: key, district: sch.district, books_read: 0, students: new Set(), schools: new Set() });
                }
                talukaAgg.get(key)!.books_read += sch.books_read;
                talukaAgg.get(key)!.schools.add(sch.school_name);
            }
            // also count students per taluka
            for (const s of rawSessions) {
                const u = (s as any).users;
                if (!u?.school_id) continue;
                const info = schoolMap.get(u.school_id);
                const key = info?.taluka || "Unknown";
                if (talukaAgg.has(key)) talukaAgg.get(key)!.students.add(s.user_id);
            }
            const byTaluka = Array.from(talukaAgg.values())
                .map(({ students, schools, ...rest }) => ({ ...rest, students: students.size, schools: schools.size }))
                .sort((a, b) => b.books_read - a.books_read);

            // ── Aggregate by district ──
            const districtAgg = new Map<string, { district: string; books_read: number; students: Set<string>; schools: Set<string> }>();
            for (const sch of bySchool) {
                const key = sch.district || "Unknown";
                if (!districtAgg.has(key)) {
                    districtAgg.set(key, { district: key, books_read: 0, students: new Set(), schools: new Set() });
                }
                districtAgg.get(key)!.books_read += sch.books_read;
                districtAgg.get(key)!.schools.add(sch.school_name);
            }
            for (const s of rawSessions) {
                const u = (s as any).users;
                if (!u?.school_id) continue;
                const info = schoolMap.get(u.school_id);
                const key = info?.district || "Unknown";
                if (districtAgg.has(key)) districtAgg.get(key)!.students.add(s.user_id);
            }
            const byDistrict = Array.from(districtAgg.values())
                .map(({ students, schools, ...rest }) => ({ ...rest, students: students.size, schools: schools.size }))
                .sort((a, b) => b.books_read - a.books_read);

            // ── Summary ──
            const totalBooksRead = byStudent.reduce((s, r) => s + r.books_read, 0);
            const newStudents = (newUsersData || []).map((u) => ({
                id: u.id,
                name: u.name,
                school: u.school || "—",
                grade: u.grade || "—",
                mobile: u.mobile || "—",
                created_at: u.created_at,
            }));

            setReport({
                summary: {
                    totalBooksRead,
                    uniqueStudents: studentMap.size,
                    newStudents: newStudents.length,
                    totalSessions: rawSessions.length,
                },
                byStudent,
                bySchool,
                byTaluka,
                byDistrict,
                newStudents,
            });
        } catch (e: any) {
            setError(e.message || "Failed to load report");
        } finally {
            setLoading(false);
        }
    }, [dateFrom, dateTo]);

    return (
        <div className="space-y-5">
            {/* Filter bar */}
            <div className="bg-white rounded-lg border border-zinc-100 p-5">
                <div className="flex flex-wrap items-end gap-4">
                    <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1.5">From</label>
                        <div className="relative">
                            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                            <input
                                type="date"
                                value={dateFrom}
                                max={dateTo}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="pl-8 pr-3 py-2 text-sm border border-zinc-200 rounded-md bg-white text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1.5">To</label>
                        <div className="relative">
                            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                            <input
                                type="date"
                                value={dateTo}
                                min={dateFrom}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="pl-8 pr-3 py-2 text-sm border border-zinc-200 rounded-md bg-white text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Preset buttons */}
                    <div className="flex gap-1.5">
                        {[
                            { label: "Last 7d", days: 7 },
                            { label: "Last 30d", days: 30 },
                            { label: "Last 90d", days: 90 },
                        ].map(({ label, days }) => (
                            <button
                                key={days}
                                onClick={() => {
                                    const d = new Date();
                                    d.setDate(d.getDate() - days);
                                    setDateFrom(d.toISOString().slice(0, 10));
                                    setDateTo(today());
                                }}
                                className="px-3 py-2 text-xs font-medium text-zinc-500 border border-zinc-200 rounded-md hover:bg-zinc-50 hover:text-zinc-800 transition-colors"
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={generate}
                        disabled={loading || !dateFrom || !dateTo}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-md hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        Generate Report
                    </button>

                    {/* Export buttons — only show when data is ready */}
                    {report && (
                        <div className="ml-auto flex items-center gap-2">
                            <button
                                onClick={() => exportXLSX(report, dateFrom, dateTo)}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors"
                            >
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                                Export Excel
                            </button>
                            <button
                                onClick={() => exportPDF(report, dateFrom, dateTo)}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-md hover:bg-rose-100 transition-colors"
                            >
                                <FileText className="w-3.5 h-3.5" />
                                Export PDF
                            </button>
                        </div>
                    )}
                </div>

                {error && (
                    <p className="mt-3 text-xs text-red-500 bg-red-50 px-3 py-2 rounded-md">{error}</p>
                )}
            </div>

            {/* Empty state */}
            {!report && !loading && (
                <div className="bg-white rounded-lg border border-zinc-100 py-16 text-center">
                    <Download className="w-8 h-8 text-zinc-200 mx-auto mb-3" />
                    <p className="text-sm text-zinc-400 font-medium">Select a date range and generate a report</p>
                    <p className="text-xs text-zinc-300 mt-1">
                        Data will include books read, student activity, and geographic breakdowns
                    </p>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="bg-white rounded-lg border border-zinc-100 py-16 flex items-center justify-center gap-3">
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                    <span className="text-sm text-zinc-400">Fetching data…</span>
                </div>
            )}

            {/* Report content */}
            {report && !loading && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Summary strip */}
                    <div className="text-xs text-zinc-400 font-medium px-1">
                        Report for{" "}
                        <span className="text-zinc-700 font-semibold">{fmtDate(dateFrom)}</span>
                        {" "}→{" "}
                        <span className="text-zinc-700 font-semibold">{fmtDate(dateTo)}</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <SummaryCard icon={BookOpen} label="Books Read" value={report.summary.totalBooksRead} sub="completed sessions" />
                        <SummaryCard icon={Users} label="Active Students" value={report.summary.uniqueStudents} sub="with reading activity" />
                        <SummaryCard icon={TrendingUp} label="Total Sessions" value={report.summary.totalSessions} sub="all reading events" />
                        <SummaryCard icon={Users} label="New Registrations" value={report.summary.newStudents} sub="students joined" />
                    </div>

                    {/* By District */}
                    <Section title="By District" count={report.byDistrict.length}>
                        <DataTable
                            columns={["District", "Books Read", "Students", "Schools"]}
                            rows={report.byDistrict.map((r) => [r.district, r.books_read, r.students, r.schools])}
                        />
                    </Section>

                    {/* By Taluka */}
                    <Section title="By Taluka" count={report.byTaluka.length}>
                        <DataTable
                            columns={["Taluka", "District", "Books Read", "Students", "Schools"]}
                            rows={report.byTaluka.map((r) => [r.taluka, r.district, r.books_read, r.students, r.schools])}
                        />
                    </Section>

                    {/* By School */}
                    <Section title="By School" count={report.bySchool.length}>
                        <DataTable
                            columns={["School", "District", "Taluka", "Books Read", "Students"]}
                            rows={report.bySchool.map((r) => [r.school_name, r.district, r.taluka, r.books_read, r.students])}
                        />
                    </Section>

                    {/* By Student */}
                    <Section title="Individual Students" count={report.byStudent.length}>
                        <DataTable
                            columns={["Name", "School", "Grade", "Books Read", "Total Points"]}
                            rows={report.byStudent.map((r) => [r.student_name, r.school, r.grade, r.books_read, r.total_points])}
                        />
                    </Section>

                    {/* Newly added students */}
                    <Section
                        title="Newly Registered Students"
                        count={report.newStudents.length}
                    >
                        {report.newStudents.length === 0 ? (
                            <div className="px-5 py-8 text-center text-xs text-zinc-400">
                                No new students registered in this period.
                            </div>
                        ) : (
                            <DataTable
                                columns={["Name", "School", "Grade", "Mobile", "Registered On"]}
                                rows={report.newStudents.map((r) => [
                                    r.name,
                                    r.school,
                                    r.grade,
                                    r.mobile,
                                    r.created_at ? fmtDate(r.created_at) : "—",
                                ])}
                            />
                        )}
                    </Section>
                </div>
            )}
        </div>
    );
}
