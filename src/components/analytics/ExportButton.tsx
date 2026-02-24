"use client";

import { Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AnalyticsStudentBook, AnalyticsSchoolStats } from '@/lib/supabase';

interface ExportButtonProps {
    data: any[];
    filename?: string;
    type: 'csv' | 'pdf';
    label?: string;
    reportTitle?: string;
}

export function ExportButton({ data, filename = 'export', type, label, reportTitle }: ExportButtonProps) {

    const handleDownload = () => {
        if (!data || data.length === 0) {
            alert("No data to export");
            return;
        }

        if (type === 'csv') {
            const keys = Object.keys(data[0]);
            const commaSeparatedString = [
                keys.join(','),
                ...data.map(row => keys.map(key => `"${String(row[key] || '').replace(/"/g, '""')}"`).join(','))
            ].join('\n');

            const blob = new Blob([commaSeparatedString], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `${filename}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } else if (type === 'pdf') {
            const doc = new jsPDF();

            // Branding
            doc.setFontSize(18);
            doc.text('ThinkSharp Foundation', 14, 22);
            doc.setFontSize(11);
            doc.setTextColor(100);
            doc.text(reportTitle || 'Analytics Report', 14, 30);

            // Timestamp
            doc.setFontSize(10);
            doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 36);

            // Table
            // simple conversion of first level keys
            const keys = Object.keys(data[0]);
            const head = [keys.map(k => k.replace(/_/g, ' ').toUpperCase())];
            const body = data.map(row => keys.map(k => row[k]));

            autoTable(doc, {
                startY: 44,
                head: head,
                body: body,
            });

            doc.save(`${filename}.pdf`);
        }
    };

    return (
        <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
        >
            <Download className="w-4 h-4" />
            {label || `Export ${type.toUpperCase()}`}
        </button>
    );
}
