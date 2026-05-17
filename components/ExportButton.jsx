'use client';

import { useState } from 'react';
import { Download, FileText, FileSpreadsheet, File, ChevronDown } from 'lucide-react';
import { exportToCSV, exportToExcel, generateReportPDF } from '@/lib/pdf';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

export function ExportButton({ data, filename = 'export', columns, title, minimal = false }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleExport = async (type) => {
    try {
      switch (type) {
        case 'csv':
          exportToCSV(data, filename);
          toast.success('CSV exported successfully');
          break;
        case 'excel':
          try {
            await exportToExcel(data, filename);
            toast.success('Excel exported successfully');
          } catch (error) {
            toast.error('Excel export failed');
          }
          break;
        case 'pdf':
          if (columns && title) {
            const doc = generateReportPDF(title, data, columns);
            doc.save(`${filename}.pdf`);
            toast.success('PDF exported successfully');
          } else {
            toast.error('PDF export requires columns and title');
          }
          break;
        default:
          break;
      }
      setIsOpen(false);
    } catch (error) {
      toast.error('Export failed');
      console.error('Export error:', error);
    }
  };

  if (minimal) {
    return (
      <div className="relative w-full">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-tight text-gray-700 hover:bg-gray-100 rounded-lg transition-colors group"
        >
          <div className="flex items-center gap-3">
            <Download className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
            <span>Generate Exports</span>
          </div>
          <ChevronDown className={cn("w-3 h-3 opacity-50 transition-transform duration-200", isOpen && "rotate-180")} />
        </button>
        {isOpen && (
          <div className="mt-1 space-y-1 pl-7 animate-in slide-in-from-top-1 duration-200">
            <button
              onClick={() => handleExport('csv')}
              className="w-full text-left py-1.5 text-[10px] font-black uppercase text-gray-500 hover:text-gray-900 transition-colors"
            >
              * Download CSV
            </button>
            <button
              onClick={() => handleExport('excel')}
              className="w-full text-left py-1.5 text-[10px] font-black uppercase text-gray-500 hover:text-gray-900 transition-colors"
            >
              * Download Excel
            </button>
            {columns && title && (
              <button
                onClick={() => handleExport('pdf')}
                className="w-full text-left py-1.5 text-[10px] font-black uppercase text-gray-500 hover:text-gray-900 transition-colors"
              >
                * Download PDF
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-wine text-white rounded-lg hover:bg-wine/90 transition shadow-sm font-bold text-sm"
      >
        <Download className="w-4 h-4" />
        Export
      </button>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 mt-2 right-0 bg-white border border-gray-200 rounded-lg shadow-xl py-2 min-w-[200px] animate-in zoom-in-95 duration-100">
            <div className="px-3 py-1.5 mb-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Format</span>
            </div>
            <button
              onClick={() => handleExport('csv')}
              className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 text-sm font-bold text-gray-700 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              CSV Spreadsheet
            </button>
            <button
              onClick={() => handleExport('excel')}
              className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 text-sm font-bold text-gray-700 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4 text-green-600" />
              </div>
              Excel Workbook
            </button>
            {columns && title && (
              <button
                onClick={() => handleExport('pdf')}
                className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 text-sm font-bold text-gray-700 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                  <File className="w-4 h-4 text-red-600" />
                </div>
                PDF Document
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

